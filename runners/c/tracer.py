"""codestep C 실행기: gcc로 컴파일하고 gdb로 한 줄씩 실행하며 Trace JSON을 만든다.

gdb 안에서 돈다:  gdb -nx -batch -x /opt/tracer/tracer.py
사용자 코드는 /work/main.c로 받는다(run.sh가 표준입력을 저장). 결과는 표준출력에 JSON 하나.

C의 메모리를 그대로 보여 주는 것이 목적이다:
  - 포인터는 실제 주소값과, 그 주소가 가리키는 대상(배열의 몇 번째 칸, 어느 변수, malloc 블록)을 함께 적는다
  - 함수 안의 배열·구조체는 region='stack' (그 함수의 판 위에 그린다), malloc은 'heap', 전역·static은 'static'
  - malloc/calloc/realloc/free는 중단점으로 크기를 기록해 해제된 메모리를 가리키는 포인터를 구분한다

이 프로세스는 server/api.mjs의 격리 컨테이너 안에서만 돈다.
"""
import json
import os
import re
import signal
import subprocess
import threading
import time

import gdb  # noqa: E402 — gdb 내장 모듈

SRC = '/work/main.c'
BIN = '/work/main'
OUT = '/work/out.txt'
MAX_STEPS = 3000
MAX_SECONDS = 8.0
MAX_HEAP = 120
MAX_ITEMS = 64
MAX_OUT = 64 * 1024

steps = []
cut = False
started = time.monotonic()


def emit(error=None):
    try:
        with open(OUT, 'rb') as f:
            text = f.read(MAX_OUT).decode('utf-8', 'replace')
    except OSError:
        text = ''
    result = {'lang': 'c', 'steps': steps, 'stdout': text, 'cut': cut}
    if error:
        result['error'] = error
    data = json.dumps(result, ensure_ascii=False, separators=(',', ':'), default=str).encode('utf-8')
    view = memoryview(data)
    while view:   # 결과는 fd 3으로 (gdb가 표준출력에 쓰는 안내문과 섞이지 않게, run.sh 참고)
        n = os.write(3, view)
        view = view[n:]
    os._exit(0)


# ── 컴파일 ───────────────────────────────────────────

def compile_source():
    # 출력 버퍼를 끄는 생성자를 끼워 넣어(-include), 단계마다 "여기까지 출력됨"이 정확하게 한다
    r = subprocess.run(['gcc', '-g', '-O0', '-std=gnu17', '-fno-omit-frame-pointer', '-include', '/opt/tracer/unbuf.h',
                        '-o', BIN, SRC, '-lm'], capture_output=True, text=True, timeout=20)
    if r.returncode == 0:
        return None
    diags = []
    for m in re.finditer(r'main\.c:(\d+):(\d+): (error|warning): (.*)', r.stderr):
        if m.group(3) == 'error':
            diags.append({'line': int(m.group(1)), 'col': int(m.group(2)), 'message': m.group(4)})
    first = diags[0] if diags else None
    return {'kind': 'compile', 'message': f"{first['line']}줄: {first['message']}" if first else r.stderr.strip()[:500],
            'line': first['line'] if first else 0, 'diagnostics': diags}


# ── malloc 추적 ──────────────────────────────────────

blocks = {}     # 주소 → 크기 (살아 있는 malloc 블록)
freed = {}      # 주소 → 크기 (free된 블록)


class AllocFinish(gdb.FinishBreakpoint):
    def __init__(self, frame, size, old=None):
        super().__init__(frame, internal=True)
        self.size = size
        self.old = old

    def stop(self):
        addr = int(gdb.parse_and_eval('$rax')) & 0xffffffffffffffff
        if self.old:
            blocks.pop(self.old, None)
        if addr:
            blocks[addr] = self.size
            freed.pop(addr, None)
        return False

    def out_of_scope(self):
        pass


class AllocBreak(gdb.Breakpoint):
    def __init__(self, name):
        super().__init__(name, internal=True)
        self.fname = name

    def stop(self):
        try:
            caller = gdb.newest_frame().older()
            # 사용자 코드가 부른 것만 (printf 안의 malloc 등은 뺀다)
            sal = caller.find_sal() if caller else None
            if not sal or not sal.symtab or not sal.symtab.filename.endswith('main.c'):
                return False
            rdi = int(gdb.parse_and_eval('$rdi')) & 0xffffffffffffffff
            rsi = int(gdb.parse_and_eval('$rsi')) & 0xffffffffffffffff
            if self.fname == 'free':
                if rdi in blocks:
                    freed[rdi] = blocks.pop(rdi)
            elif self.fname == 'malloc':
                AllocFinish(gdb.newest_frame(), rdi)
            elif self.fname == 'calloc':
                AllocFinish(gdb.newest_frame(), rdi * rsi)
            elif self.fname == 'realloc':
                AllocFinish(gdb.newest_frame(), rsi, old=rdi)
        except gdb.error:
            pass
        return False


# ── 값 읽기 ──────────────────────────────────────────

class Ret(gdb.FinishBreakpoint):
    """사용자 함수가 끝날 때 반환값을 받아 둔다 (다음 단계 앞에 '반환' 단계로 넣는다)."""

    def __init__(self, frame, fn):
        super().__init__(frame, internal=True)
        self.fn = fn

    def stop(self):
        try:
            rv = self.return_value
        except Exception:  # noqa: BLE001
            rv = None
        pending.append((self.fn, rv))
        return False

    def out_of_scope(self):
        pass


pending = []    # (함수 이름, 반환값) — 방금 끝난 함수들


def user_frame(f):
    try:
        sal = f.find_sal()
        return sal.symtab is not None and sal.symtab.filename.endswith('main.c')
    except gdb.error:
        return False


def frames_out_to_in():
    out = []
    f = gdb.newest_frame()
    while f is not None:
        if user_frame(f) and f.function() is not None:
            out.append(f)
        f = f.older()
    out.reverse()
    return out


def addr_of(v):
    try:
        a = v.address
        return int(a) & 0xffffffffffffffff if a is not None else None
    except gdb.error:
        return None


def hexs(n):
    return f'0x{n:x}'


def tname(t):
    return str(t).replace('struct ', '').strip()


class Mem:
    """한 단계의 메모리 그림: 객체(배열·구조체·malloc 블록)와 변수 주소를 모은다."""
    ids = {}

    def __init__(self):
        self.objs = {}          # id → HeapObj
        self.spans = []         # (시작, 끝, id, 원소 크기, 종류)
        self.vars = {}          # 스칼라 변수 주소 → '@var:프레임번호:이름'
        self.todo = []

    @classmethod
    def num(cls, key):
        if key not in cls.ids:
            cls.ids[key] = str(len(cls.ids) + 1)
        return cls.ids[key]

    def obj(self, v, region):
        """배열·구조체 값 v를 객체로 등록하고 id를 돌려준다"""
        base = addr_of(v)
        t = v.type.strip_typedefs()
        key = f'{base}:{t}'
        oid = self.num(key)
        if oid not in self.objs and len(self.objs) < MAX_HEAP:
            self.objs[oid] = None
            size = t.sizeof
            if t.code == gdb.TYPE_CODE_ARRAY:
                et = t.target().strip_typedefs()
                self.spans.append((base, base + size, oid, et.sizeof, 'array'))
            else:
                self.spans.append((base, base + size, oid, size, 'object'))
            self.todo.append((oid, v, region, base))
        return oid

    def scalar_var(self, v, ref):
        a = addr_of(v)
        if a is not None:
            self.vars[a] = ref

    def expand(self):
        while self.todo:
            oid, v, region, base = self.todo.pop(0)
            self.objs[oid] = self.shape(v, region, base)
        return {k: x for k, x in self.objs.items() if x is not None}

    def shape(self, v, region, base):
        t = v.type.strip_typedefs()
        if t.code == gdb.TYPE_CODE_ARRAY:
            et = t.target().strip_typedefs()
            n = t.sizeof // max(1, et.sizeof)
            items = [self.val(v[i], region) for i in range(min(n, MAX_ITEMS))]
            return {'kind': 'array', 'type': tname(t), 'len': n, 'items': items,
                    'addr': hexs(base), 'region': region, 'elem': et.sizeof}
        fields = []
        for f in t.fields():
            if not f.name:
                continue
            fv = v[f.name]
            ft = f.type.strip_typedefs()
            if ft.code == gdb.TYPE_CODE_ARRAY and ft.target().strip_typedefs().sizeof == 1 and 'char' in str(ft.target()):
                # 구조체 안의 char 배열은 문자열로 보여 준다 (칸마다 펼치면 너무 복잡하다)
                raw = bytes(gdb.selected_inferior().read_memory(addr_of(fv), ft.sizeof))
                val = {'t': 'str', 'v': raw.split(b'\0', 1)[0].decode('utf-8', 'replace')}
            else:
                val = self.val(fv, region)
            fields.append({'name': f.name, 'type': tname(f.type), 'value': val})
        return {'kind': 'object', 'type': tname(t), 'fields': fields, 'addr': hexs(base), 'region': region}

    def val(self, v, region='stack'):
        t = v.type.strip_typedefs()
        c = t.code
        try:
            if c in (gdb.TYPE_CODE_INT, gdb.TYPE_CODE_CHAR):
                n = int(v)
                if t.sizeof == 1 and ('char' in str(t)):
                    if n == 0:
                        return {'t': 'char', 'v': '\\0'}   # 문자열 끝 표시
                    return {'t': 'char', 'v': chr(n & 0xff)} if 32 <= (n & 0xff) < 127 else {'t': 'num', 'v': n}
                return {'t': 'num', 'v': n}
            if c == gdb.TYPE_CODE_BOOL:
                return {'t': 'bool', 'v': bool(int(v))}
            if c == gdb.TYPE_CODE_FLT:
                x = float(v)
                if x != x or x in (float('inf'), float('-inf')):
                    return {'t': 'num', 'v': None, 'float': True, 'text': str(x)}
                return {'t': 'num', 'v': x, 'float': True}
            if c == gdb.TYPE_CODE_ENUM:
                return {'t': 'unknown', 'text': str(v)}
            if c in (gdb.TYPE_CODE_ARRAY, gdb.TYPE_CODE_STRUCT, gdb.TYPE_CODE_UNION):
                return {'t': 'ref', 'id': self.obj(v, region)}
            if c == gdb.TYPE_CODE_PTR:
                return self.pointer(v)
            if c == gdb.TYPE_CODE_FUNC:
                return {'t': 'unknown', 'text': str(v)}
        except gdb.error as e:
            return {'t': 'unknown', 'text': f'<{e}>'}
        return {'t': 'unknown', 'text': str(v)}

    def pointer(self, v):
        p = int(v) & 0xffffffffffffffff
        if p == 0:
            return {'t': 'null'}
        return {'t': 'ptr', 'addr': p, 'type': v.type.strip_typedefs()}   # 대상은 모든 변수를 본 뒤에 푼다

    def resolve(self, raw):
        """포인터를 대상(배열 칸, 구조체, 변수, malloc 블록)으로 푼다"""
        p = raw['addr']
        addr = hexs(p)
        for (a, b, oid, esz, kind) in self.spans:
            if a <= p < b:
                if kind == 'array':
                    off = p - a
                    return {'t': 'ref', 'id': oid, 'idx': off // esz if off % esz == 0 else None, 'addr': addr}
                return {'t': 'ref', 'id': oid, 'addr': addr}
        if p in self.vars:
            return {'t': 'ref', 'id': self.vars[p], 'addr': addr}
        target = raw['type'].target().strip_typedefs()
        for base, size in list(blocks.items()):
            if base <= p < base + size:
                esz = max(1, target.sizeof) if target.code != gdb.TYPE_CODE_VOID else 1
                count = max(1, size // esz)
                if count == 1 and target.code in (gdb.TYPE_CODE_STRUCT, gdb.TYPE_CODE_UNION) and p == base:
                    # 구조체 하나를 받은 블록은 구조체 그대로 (원소 1개짜리 배열로 감싸지 않는다)
                    oid = self.obj(gdb.Value(base).cast(target.pointer()).dereference(), 'heap')
                    return {'t': 'ref', 'id': oid, 'addr': addr}
                arr_t = target.array(count - 1) if target.code != gdb.TYPE_CODE_VOID else gdb.lookup_type('unsigned char').array(size - 1)
                oid = self.obj(gdb.Value(base).cast(arr_t.pointer()).dereference(), 'heap')
                off = p - base
                return {'t': 'ref', 'id': oid, 'idx': off // esz if off % esz == 0 else None, 'addr': addr}
        for base, size in freed.items():
            if base <= p < base + size:
                return {'t': 'unknown', 'text': f'{addr} (해제된 메모리)'}
        if target.code in (gdb.TYPE_CODE_INT, gdb.TYPE_CODE_CHAR) and target.sizeof == 1:
            try:   # 문자열 상수: 메모리를 직접 읽어 NUL에서 자른다
                raw_bytes = bytes(gdb.selected_inferior().read_memory(p, 64))
                text = raw_bytes.split(b'\0', 1)[0].decode('utf-8', 'replace')
                return {'t': 'str', 'v': text, 'addr': addr}
            except (gdb.error, gdb.MemoryError):
                pass
        return {'t': 'unknown', 'text': addr}

    def finish(self, values):
        """values 안의 포인터 자리표를 실제 값으로 바꾼다 (객체 안의 포인터까지)"""
        def fix(x):
            if isinstance(x, dict) and x.get('t') == 'ptr':
                return self.resolve(x)
            return x
        for var in values:
            var['value'] = fix(var['value'])
        # 포인터를 풀다가 새 객체(malloc 블록)가 생길 수 있어 몇 번 반복한다
        for _ in range(4):
            objs = self.expand()
            changed = False
            for o in objs.values():
                for i, it in enumerate(o.get('items', [])):
                    if isinstance(it, dict) and it.get('t') == 'ptr':
                        o['items'][i] = self.resolve(it)
                        changed = True
                for f in o.get('fields', []):
                    if isinstance(f['value'], dict) and f['value'].get('t') == 'ptr':
                        f['value'] = self.resolve(f['value'])
                        changed = True
            if not changed and not self.todo:
                return objs
        return self.expand()


def frame_vars(frame, line, revisit=False):
    """프레임에서 지금 보이는 변수들 (매개변수 먼저, 지역 변수는 선언된 줄 이후에만).
    revisit: 이 줄에 다시 돌아왔다(반복문 머리) — 이 줄에서 선언한 변수(for의 i)도 이미 살아 있다"""
    try:
        block = frame.block()
    except RuntimeError:
        return []
    args, local_vars, seen = [], [], set()
    while block is not None:
        for sym in block:
            if not (sym.is_variable or sym.is_argument) or sym.name in seen:
                continue
            if not sym.is_argument and sym.addr_class != gdb.SYMBOL_LOC_STATIC:
                if sym.line > line or (sym.line == line and not revisit):
                    continue
            seen.add(sym.name)
            (args if sym.is_argument else local_vars).append(sym)
        if block.function is not None:
            break
        block = block.superblock
    local_vars.sort(key=lambda s: s.line)
    return args + local_vars


def global_vars():
    out = []
    try:
        blk = gdb.newest_frame().block()
    except RuntimeError:
        return out
    for b in (blk.global_block, blk.static_block):
        for sym in b:
            if sym.is_variable and sym.symtab and sym.symtab.filename.endswith('main.c'):
                out.append(sym)
    return sorted(out, key=lambda s: s.line)


def snapshot(event, line, ret=None, exc=None):
    mem = Mem()
    frames = []
    all_vars = []
    gl = global_vars()
    if gl:
        locs = []
        for sym in gl:
            v = sym.value()
            ref = f'@var:0:{sym.name}'
            entry = {'name': sym.name, 'type': tname(v.type), 'value': mem.val(v, 'static')}
            mem.scalar_var(v, ref)
            locs.append(entry)
        frames.append({'fn': '<global>', 'line': 0, 'locals': locs})
        all_vars += locs
    for f in frames_out_to_in():
        fi = len(frames)
        fl = f.find_sal().line
        locs = []
        key = frame_key(f)
        seen_lines = visited.setdefault(key, set())
        for sym in frame_vars(f, fl, fl in seen_lines):
            try:
                v = sym.value(f)
            except gdb.error:
                continue
            region = 'static' if sym.addr_class == gdb.SYMBOL_LOC_STATIC else 'stack'
            entry = {'name': sym.name, 'type': tname(v.type), 'value': mem.val(v, region)}
            mem.scalar_var(v, f'@var:{fi}:{sym.name}')
            locs.append(entry)
        frames.append({'fn': f.function().name, 'line': fl, 'locals': locs})
        all_vars += locs
        if f == gdb.newest_frame():
            seen_lines.add(fl)
    extra = []
    if ret is not None:
        extra.append({'value': mem.val(ret)})
    heap = mem.finish(all_vars + extra)
    step = {'line': line, 'event': event, 'frames': frames, 'heap': heap, 'out': out_len()}
    if ret is not None:
        step['ret'] = extra[0]['value']
    if exc:
        step['exception'] = exc
    return step


visited = {}   # 프레임 → 지나간 줄들


def frame_key(f):
    try:
        return (f.function().name, int(f.read_register('rbp')))
    except (gdb.error, AttributeError):
        return (str(f.function()), 0)


def out_len():
    try:
        return os.path.getsize(OUT)
    except OSError:
        return 0


# ── 실행 ─────────────────────────────────────────────

SIGNALS = {
    'SIGSEGV': '잘못된 메모리 접근 (Segmentation fault)',
    'SIGFPE': '산술 오류 (0으로 나누기 등)',
    'SIGABRT': '프로그램 중단 (abort, assert 실패 등)',
    'SIGBUS': '잘못된 메모리 정렬 접근 (Bus error)',
}


def alive():
    inf = gdb.selected_inferior()
    return inf is not None and inf.pid != 0 and inf.threads()


def stop_signal():
    try:
        sig = gdb.parse_and_eval('$_siginfo.si_signo')
        n = int(sig)
        return signal.Signals(n).name
    except (gdb.error, ValueError):
        return None


blocked = []   # 막은 함수를 부른 기록 (fork 등)


class Forbid(gdb.Breakpoint):
    """새 프로세스를 만드는 함수는 막는다 (fork 폭탄 등). 부르는 순간 멈추고 오류로 기록한다."""

    def __init__(self, name):
        super().__init__(name, internal=True)
        self.fname = name

    def stop(self):
        blocked.append(self.fname)
        return True


def user_functions():
    """main.c의 함수 시작 주소들 (함수 입구의 줄 중단점은 빼려고: 프롤로그 전이라 매개변수가 아직 없다)"""
    out = set()
    try:
        blk = gdb.newest_frame().block()
    except RuntimeError:
        return out
    for b in (blk.global_block, blk.static_block):
        for sym in b:
            if sym.is_function and sym.symtab and sym.symtab.filename.endswith('main.c'):
                try:
                    out.add(int(sym.value().address))
                except gdb.error:
                    pass
    return out


def line_breakpoints():
    """사용자 코드의 모든 줄 시작에 중단점을 건다. continue로 다음 줄까지 가면 같은 줄로 되돌아오는 반복도 매번 멈춘다."""
    st = gdb.newest_frame().find_sal().symtab
    entries = set(user_functions())
    seen = set()
    for e in st.linetable():
        if e.line <= 0 or e.pc in seen or e.pc in entries:
            continue
        if getattr(e, 'is_stmt', True) is False:
            continue
        seen.add(e.pc)
        gdb.Breakpoint(f'*{e.pc:#x}', internal=True)


def return_steps():
    """방금 끝난 함수가 있으면 '반환' 단계를 넣는다 (끝나기 직전 모습 + 반환값)"""
    while pending:
        fn, rv = pending.pop(0)
        if not steps:
            continue
        last = dict(steps[-1])
        last['event'] = 'return'
        last.pop('exception', None)
        if rv is not None:
            val = Mem().val(rv)
            if val.get('t') == 'ptr':
                val = {'t': 'unknown', 'text': hexs(val['addr'])}
            last['ret'] = val
        else:
            last.pop('ret', None)
        steps.append(last)


def main():
    global cut
    err = compile_source()
    if err:
        emit(err)
    gdb.execute('set pagination off')
    gdb.execute('set confirm off')
    gdb.execute('set print elements 64')
    gdb.execute('set disable-randomization on')
    gdb.execute('set charset UTF-8')
    gdb.execute(f'file {BIN}')
    # 프로그램만 메모리 128MB로 묶는다 (넘으면 malloc이 NULL을 돌려주거나 잘못된 접근으로 멈춘다)
    gdb.execute('set exec-wrapper /opt/tracer/limit.sh')
    gdb.execute(f'set args > {OUT} < /dev/null 2>&1')
    gdb.execute('start', to_string=True)
    for name in ('malloc', 'calloc', 'realloc', 'free'):
        try:
            AllocBreak(name)
        except gdb.error:
            pass
    for name in ('fork', 'vfork', '_Fork', 'system', 'popen', 'posix_spawn', 'posix_spawnp', 'execve', 'clone', 'clone3'):
        try:
            Forbid(name)
        except gdb.error:
            pass
    line_breakpoints()
    pid = gdb.selected_inferior().pid
    prev_depth = 1
    last_key = None
    last_pc = -1

    while True:
        if len(steps) >= MAX_STEPS:
            cut = True
            emit({'kind': 'limit', 'message': f'{MAX_STEPS}단계를 넘어 앞부분만 기록했습니다.'})
        if time.monotonic() - started > MAX_SECONDS:
            cut = True
            emit({'kind': 'limit', 'message': '실행 시간이 너무 깁니다 (무한 반복일 수 있습니다). 앞부분만 기록했습니다.'})
        if not alive():
            break
        f = gdb.newest_frame()
        if blocked:
            ff = f
            while ff is not None and not user_frame(ff):
                ff = ff.older()
            ln = ff.find_sal().line if ff is not None else 0
            if ff is not None:
                ff.select()
                steps.append(snapshot('exception', ln, exc='새 프로세스를 만들 수 없습니다'))
            emit({'kind': 'runtime', 'message': f'{blocked[0]}(): 이 실행 환경에서는 새 프로세스를 만들 수 없습니다', 'line': ln})
        if user_frame(f):
            depth = len(frames_out_to_in())
            line = f.find_sal().line
            return_steps()
            key = (depth, line, frame_key(f))
            pc = f.pc()
            # 같은 줄의 다음 조각(for의 증감식 → 조건식처럼 앞으로 이어지는 것)은 한 단계로 본다.
            # 뒤로 돌아왔으면(반복) 같은 줄이어도 새 단계다
            if key != last_key or pc <= last_pc:
                if depth > prev_depth:
                    visited.pop(frame_key(f), None)   # 같은 자리에 새로 생긴 프레임 (재귀 등)
                    Ret(f, f.function().name)
                    steps.append(snapshot('call', line))
                else:
                    steps.append(snapshot('line', line))
            last_key = key
            last_pc = pc
            prev_depth = depth

        # 다음 줄까지 실행. 줄 하나 안에서 끝없이 돌면(예: while(1);) 시간이 되면 멈춘다
        timer = threading.Timer(max(0.1, MAX_SECONDS - (time.monotonic() - started)), lambda: os.kill(pid, signal.SIGINT))
        timer.start()
        try:
            gdb.execute('continue', to_string=True)
        except gdb.error:
            timer.cancel()
            break
        timer.cancel()
        sig = stop_signal() if alive() else None
        if sig in SIGNALS:
            f2 = gdb.newest_frame()
            while f2 is not None and not user_frame(f2):
                f2 = f2.older()
            ln = 0
            if f2 is not None:
                f2.select()
                ln = f2.find_sal().line
                return_steps()
                steps.append(snapshot('exception', ln, exc=SIGNALS[sig]))
            emit({'kind': 'runtime', 'message': SIGNALS[sig], 'line': ln})
        if sig == 'SIGINT':
            cut = True
            emit({'kind': 'limit', 'message': '실행 시간이 너무 깁니다 (무한 반복일 수 있습니다). 앞부분만 기록했습니다.'})

    # 프로그램이 끝났다
    return_steps()
    killed = gdb.convenience_variable('_exitsignal')
    code = gdb.convenience_variable('_exitcode')
    if steps and code is not None:
        last = dict(steps[-1])   # main의 반환 (반환값 = 종료 코드)
        last['event'] = 'return'
        last['ret'] = {'t': 'num', 'v': int(code)}
        steps.append(last)
    if steps:
        steps[-1]['out'] = out_len()
    if killed is not None:
        emit({'kind': 'runtime', 'message': f'프로그램이 신호 {int(killed)}로 강제 종료되었습니다 (메모리 한도 초과 등)'})
    emit()


try:
    main()
except Exception as e:  # noqa: BLE001
    emit({'kind': 'internal', 'message': f'추적기 오류: {e}'})
