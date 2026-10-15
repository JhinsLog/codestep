"""codestep Python 실행기: 사용자 코드를 한 줄씩 실행하며 Trace JSON을 만든다.

표준입력으로 코드를 받아 sys.settrace로 추적하고, 끝나면 Trace JSON 하나를 표준출력에 쓴다.
모양은 Java 실행기와 같다 (web/src/trace/types.ts):

  {"lang": "python", "steps": [...], "stdout": "...", "cut": false, "error": {...}}

이 프로세스는 server/api.mjs의 격리 컨테이너(네트워크 차단, 읽기 전용, 권한 제거, 자원 제한) 안에서만 돈다.
사용자 코드가 추적기를 건드려도 망가지는 것은 자기 실행 결과뿐이다.
"""
import json
import math
import os
import resource
import sys
import threading
import time
import types
from collections import deque

MAX_STEPS = 3000
MAX_SECONDS = 8.0
MAX_HEAP = 120      # 한 단계에 기록하는 힙 객체 수 상한
MAX_ITEMS = 64      # 리스트·딕셔너리 원소 상한
MAX_OUT = 64 * 1024
MAX_STR = 200
FILENAME = '<main>'

MAX_MEMORY = 200 * 1024 * 1024   # 주소 공간 상한. 컨테이너 한도(256MB)보다 낮아서 넘으면 MemoryError로 기록된다

# 결과 JSON은 따로 떼어 둔 fd로 쓴다. 사용자 코드가 fd 1에 직접 써도 결과가 섞이지 않게
RESULT_FD = os.dup(1)
MAIN_PID = os.getpid()
_devnull = os.open(os.devnull, os.O_WRONLY)
os.dup2(_devnull, 1)
os.dup2(_devnull, 2)

steps = []
cut = False
started = time.monotonic()
lock = threading.Lock()
done = False


class Out:
    """print()가 쓰는 표준출력. 길이를 세어 단계마다 '여기까지 출력됨'을 기록한다."""

    def __init__(self):
        self.parts = []
        self.size = 0

    def write(self, s):
        if not isinstance(s, str):
            s = str(s)
        room = MAX_OUT - self.size
        if room > 0:
            s = s[:room]
            self.parts.append(s)
            self.size += len(s)
        return len(s)

    def flush(self):
        pass

    def text(self):
        return ''.join(self.parts)


out = Out()


# ── 값과 힙 ──────────────────────────────────────────

class Heap:
    """한 단계에서 프레임이 닿는 객체들. 객체마다 작은 번호를 붙인다(실행 내내 같은 번호)."""
    ids = {}

    def __init__(self):
        self.objs = {}
        self.todo = deque()

    @classmethod
    def num(cls, o):
        k = id(o)
        if k not in cls.ids:
            cls.ids[k] = (len(cls.ids) + 1, o)   # 객체를 붙잡아 둬서 id가 다른 객체에 재사용되지 않게 한다
        return str(cls.ids[k][0])

    def val(self, v):
        if v is None:
            return {'t': 'null'}
        if isinstance(v, bool):
            return {'t': 'bool', 'v': v}
        if isinstance(v, int):
            if abs(v) <= 2 ** 53:
                return {'t': 'num', 'v': v}
            return {'t': 'num', 'v': None, 'text': str(v)}
        if isinstance(v, float):
            if math.isfinite(v):
                return {'t': 'num', 'v': v, 'float': True}
            return {'t': 'num', 'v': None, 'float': True, 'text': repr(v)}
        if isinstance(v, str):
            return {'t': 'str', 'v': v if len(v) <= MAX_STR else v[:MAX_STR] + '…'}
        if isinstance(v, (types.FunctionType, types.BuiltinFunctionType, types.MethodType, type, types.ModuleType)):
            return {'t': 'unknown', 'text': describe(v)}
        ref = self.num(v)
        if ref not in self.objs and len(self.objs) + len(self.todo) < MAX_HEAP:
            self.todo.append(v)
        return {'t': 'ref', 'id': ref}

    def expand(self):
        while self.todo and len(self.objs) < MAX_HEAP:
            o = self.todo.popleft()
            ref = self.num(o)
            if ref in self.objs:
                continue
            self.objs[ref] = None   # 자리 먼저 잡기 (자기 자신을 가리키는 리스트 등)
            self.objs[ref] = self.shape(o)
        return {k: v for k, v in self.objs.items() if v is not None}

    def seq(self, kind, o, items):
        items = list(items)
        return {'kind': kind, 'type': type(o).__name__, 'len': len(items), 'items': [self.val(x) for x in items[:MAX_ITEMS]]}

    def shape(self, o):
        if isinstance(o, list):
            return self.seq('list', o, o)
        if isinstance(o, tuple):
            return self.seq('list', o, o)
        if isinstance(o, deque):
            return self.seq('deque', o, o)
        if isinstance(o, (set, frozenset)):
            try:
                items = sorted(o)
            except TypeError:
                items = list(o)
            return self.seq('set', o, items)
        if isinstance(o, dict):
            entries = list(o.items())
            return {'kind': 'map', 'type': type(o).__name__, 'len': len(entries),
                    'entries': [[self.val(k), self.val(v)] for k, v in entries[:MAX_ITEMS]]}
        fields = getattr(o, '__dict__', None)
        if isinstance(fields, dict):
            return {'kind': 'object', 'type': type(o).__name__,
                    'fields': [{'name': k, 'type': type(v).__name__, 'value': self.val(v)}
                               for k, v in list(fields.items())[:MAX_ITEMS] if not k.startswith('__')]}
        return {'kind': 'opaque', 'type': type(o).__name__}


def describe(v):
    if isinstance(v, type):
        return f'<class {v.__name__}>'
    if isinstance(v, types.ModuleType):
        return f'<module {v.__name__}>'
    return f'<function {getattr(v, "__name__", "?")}>'


def visible(name, v, module):
    """화면에 보여 줄 변수인가. 전역에서는 함수·클래스·모듈 정의는 뺀다(데이터만)."""
    if name.startswith('__'):
        return False
    if module and isinstance(v, (types.FunctionType, type, types.ModuleType, types.BuiltinFunctionType)):
        return False
    return True


def user_frames(frame):
    """사용자 코드의 프레임만, 바깥 → 안 순서로"""
    chain = []
    f = frame
    while f is not None:
        if f.f_code.co_filename == FILENAME:
            chain.append(f)
        f = f.f_back
    chain.reverse()
    return chain


def snapshot(frame, event, line, ret=None, exc=None):
    heap = Heap()
    frames = []
    for f in user_frames(frame):
        module = f.f_code.co_name == '<module>'
        names = f.f_globals if module else f.f_locals
        local_vars = [{'name': k, 'type': type(v).__name__, 'value': heap.val(v)}
                      for k, v in list(names.items()) if visible(k, v, module)]
        frames.append({'fn': f.f_code.co_name, 'line': f.f_lineno, 'locals': local_vars})
    step = {'line': line, 'event': event, 'frames': frames, 'heap': None, 'out': out.size}
    if event == 'return' and frame.f_code.co_name != '<module>':
        step['ret'] = heap.val(ret)
    if exc is not None:
        step['exception'] = exc
    step['heap'] = heap.expand()
    return step


# ── 끝내기 ───────────────────────────────────────────

def finish(error=None):
    global done
    if os.getpid() != MAIN_PID:   # fork로 생긴 자식은 결과를 쓰지 않는다
        os._exit(0)
    with lock:
        if done:
            return
        done = True
        sys.settrace(None)
        result = {'lang': 'python', 'steps': steps, 'stdout': out.text(), 'cut': cut}
        if error:
            result['error'] = error
        data = json.dumps(result, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        view = memoryview(data)
        while view:
            n = os.write(RESULT_FD, view)
            view = view[n:]
        os._exit(0)


def stop_cut(reason):
    global cut
    cut = True
    finish({'kind': 'limit', 'message': reason})


def watchdog():
    time.sleep(MAX_SECONDS + 1.5)
    stop_cut('실행 시간이 너무 깁니다 (무한 반복일 수 있습니다). 앞부분만 기록했습니다.')


# ── 추적 ─────────────────────────────────────────────

def tracer(frame, event, arg):
    if frame.f_code.co_filename != FILENAME:
        return None
    if done:
        return None
    if len(steps) >= MAX_STEPS:
        stop_cut(f'{MAX_STEPS}단계를 넘어 앞부분만 기록했습니다.')
    if time.monotonic() - started > MAX_SECONDS:
        stop_cut('실행 시간이 너무 깁니다 (무한 반복일 수 있습니다). 앞부분만 기록했습니다.')
    if event == 'call':
        if frame.f_code.co_name != '<module>':
            steps.append(snapshot(frame, 'call', frame.f_lineno))
    elif event == 'line':
        steps.append(snapshot(frame, 'line', frame.f_lineno))
    elif event == 'return':
        # 모듈의 끝도 한 단계로 남긴다: 마지막 print까지 출력된 모습을 보여 주려고
        steps.append(snapshot(frame, 'return', frame.f_lineno, ret=arg))
    return tracer


def main():
    src = sys.stdin.read()
    sys.stdin = open(os.devnull)   # input()은 바로 EOF
    try:
        code = compile(src, FILENAME, 'exec')
    except SyntaxError as e:
        line = e.lineno or 0
        msg = f'{e.msg}'
        finish({'kind': 'compile', 'message': f'{line}줄: {msg}', 'line': line,
                'diagnostics': [{'line': line, 'col': e.offset or 0, 'message': msg}]})
        return

    threading.Thread(target=watchdog, daemon=True).start()
    resource.setrlimit(resource.RLIMIT_AS, (MAX_MEMORY, MAX_MEMORY))

    def no_fork(*_a, **_k):
        raise OSError('이 실행 환경에서는 새 프로세스를 만들 수 없습니다')
    os.fork = no_fork
    os.forkpty = no_fork
    g = {'__name__': '__main__', '__builtins__': __builtins__}
    sys.stdout = out
    sys.stderr = out
    last_frame = None
    try:
        sys.settrace(tracer)
        exec(code, g)
    except SystemExit:
        pass
    except BaseException as e:   # noqa: BLE001 — 사용자 코드의 모든 예외를 기록한다
        sys.settrace(None)
        tb = e.__traceback__
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == FILENAME:
                last_frame = tb.tb_frame
                line = tb.tb_lineno
            tb = tb.tb_next
        message = f'{type(e).__name__}: {e}'
        if last_frame is not None:
            steps.append(snapshot(last_frame, 'exception', line, exc=message))
            finish({'kind': 'runtime', 'message': message, 'line': line})
        finish({'kind': 'runtime', 'message': message})
    finally:
        sys.settrace(None)
    finish()


if __name__ == '__main__':
    main()
