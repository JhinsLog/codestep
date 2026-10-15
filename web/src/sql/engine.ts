// 계측한 SQLite(WASM)를 불러 SQL을 실행하고, 실행 기록(JSON 한 줄씩)을 모은다.
// 엔진 빌드: spikes/sqlite-vdbe/build.sh → public/sql/ (npm run engine)

export type Scalar = number | string | null | { blob: number };

export type RawEvent =
  | { t: 'schema'; type: 'table' | 'index'; name: string; table: string; root: number; cols: string[] }
  | { t: 'table'; name: string; rows: Scalar[][] }
  | { t: 'op'; pc: number; op: string; p1: number; p2: number; p3: number; p5: number;
      root?: number; rowid?: number; row?: Scalar[] }
  | { t: 'reg'; pc: number; r: number; v: Scalar }
  | { t: 'error'; where: 'setup' | 'prepare' | 'step'; msg: string }
  | { t: 'done'; rc: number; rows: number };

interface EmModule {
  ccall(name: string, ret: 'number', types: ['string', 'string'], args: [string, string]): number;
}
type Factory = (opts: { print: (line: string) => void; printErr: (line: string) => void }) => Promise<EmModule>;

let sink: string[] = [];
let modulePromise: Promise<EmModule> | null = null;

function load(): Promise<EmModule> {
  modulePromise ??= import(/* @vite-ignore */ `${import.meta.env.BASE_URL}sql/sqltrace.mjs`)
    .then((m: { default: Factory }) => m.default({
      print: (line) => sink.push(line),
      printErr: (line) => console.warn('[sqltrace]', line),
    }));
  return modulePromise;
}

export async function runSql(setup: string, query: string): Promise<RawEvent[]> {
  const mod = await load();
  sink = [];
  mod.ccall('codestep_run', 'number', ['string', 'string'], [setup, query]);
  const lines = sink;
  sink = [];
  return lines.map((l) => JSON.parse(l) as RawEvent);
}
