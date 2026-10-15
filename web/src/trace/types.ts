// Trace — 언어별 실행기와 화면 사이의 유일한 계약.
//
//   사용자 코드 ──> 실행기(Java: runners/java, …) ──> Trace(JSON) ──> 화면
//
// 화면은 어느 언어가 이 기록을 만들었는지 모른다. 언어를 늘리려면 이 모양의
// JSON을 내는 실행기를 하나 더 만들면 된다. 실행기가 HTTP 뒤에 있어도 같다.

export type Value =
  | { t: 'num'; v: number | null; text?: string; float?: boolean } // text: JSON으로 정확히 못 옮기는 수
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'char'; v: string }
  | { t: 'null' }
  | { t: 'ref'; id: string }    // heap의 객체를 가리킨다
  | { t: 'unknown'; text: string };

export interface Var {
  name: string;
  type: string;
  value: Value;
}

export type SeqKind = 'array' | 'list' | 'stack' | 'deque' | 'set';

export type HeapObj =
  | { kind: SeqKind; type: string; len: number; items: Value[] } // items는 앞에서부터 잘릴 수 있다
  | { kind: 'map'; type: string; len: number; entries: [Value, Value][] }
  | { kind: 'object'; type: string; fields: Var[] }
  | { kind: 'opaque'; type: string };                              // 내부를 펼치지 않는 라이브러리 객체

export interface Frame {
  fn: string;
  cls?: string;
  line: number;
  locals: Var[];
}

/** line: 이 줄을 실행하기 직전 / call: 함수에 막 들어옴 / return: 함수가 값을 돌려주기 직전 */
export type StepEvent = 'line' | 'call' | 'return' | 'exception';

export interface Step {
  line: number;                    // 가장 안쪽 프레임의 줄
  event: StepEvent;
  frames: Frame[];                 // 바깥 → 안
  heap: Record<string, HeapObj>;   // 이 시점에 프레임에서 닿는 객체
  out: number;                     // 이 시점까지의 표준출력 길이 (Trace.stdout 앞부분)
  ret?: Value;
  exception?: string;
}

export interface Diagnostic {
  line: number;
  col: number;
  message: string;
}

export interface TraceError {
  kind: 'compile' | 'runtime' | 'limit' | 'internal';
  message: string;
  line?: number;
  diagnostics?: Diagnostic[];
}

export interface Trace {
  lang: 'java' | 'c' | 'python';
  steps: Step[];
  stdout: string;
  cut: boolean;   // 단계·시간·출력 상한에 걸려 뒷부분이 없다
  error?: TraceError;
}
