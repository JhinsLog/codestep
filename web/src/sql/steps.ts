// 엔진의 opcode 기록을 학습자가 따라갈 수 있는 단계(Step)로 바꾼다.
// 각 단계는 그 시점의 화면 상태(Snapshot)를 통째로 들고 있어서,
// 디버거가 앞뒤 어느 단계로든 바로 이동할 수 있다.
import type { RawEvent, Scalar } from './engine';

export interface Table {
  name: string;
  cols: string[];   // 'rowid' 다음에 실제 열
  rows: Scalar[][]; // 각 행의 첫 값이 rowid
}

export type Verdict = 'pass' | 'fail';

export interface Snapshot {
  current: Record<string, number>;                  // 테이블 → 커서가 가리키는 rowid
  read: { table: string; rowid: number; col: string } | null;
  verdict: Record<string, Record<number, Verdict>>; // 테이블 → rowid → 결과 기여 여부
  results: Scalar[][];
  buffered: number;                                 // 정렬 버퍼에 들어간 행 수
}

export type StepKind = 'open' | 'visit' | 'read' | 'test' | 'seek' | 'emit'
  | 'skip' | 'sort' | 'agg' | 'end' | 'error';

export interface Step {
  kind: StepKind;
  text: string;
  snap: Snapshot;
}

export interface SqlTrace {
  tables: Table[];
  resultCols: number;
  steps: Step[];
  cut: boolean;   // 단계 상한에 걸려 뒷부분을 버렸는지
  error: string | null;
}

const MAX_STEPS = 5000;
const CMP: Record<string, string> = { Lt: '<', Le: '<=', Gt: '>', Ge: '>=', Eq: '=', Ne: '<>' };
const LOOP_ADVANCE = new Set(['Next', 'Prev', 'SorterNext']);

interface Cursor {
  label: string;
  table: string | null;  // 실제 테이블 이름 (인덱스면 그 인덱스의 테이블)
  cols: string[];
  temp: boolean;
  rowid?: number;
  produced: boolean;
}

export const show = (v: Scalar | undefined): string =>
  v === undefined ? '?' : v === null ? 'NULL'
    : typeof v === 'string' ? `'${v}'` : typeof v === 'object' ? `<blob ${v.blob}B>` : String(v);

export function buildSteps(events: RawEvent[]): SqlTrace {
  const schema = new Map<number, Extract<RawEvent, { t: 'schema' }>>();
  const tables: Table[] = [];
  const cursors = new Map<number, Cursor>();
  const regs = new Map<number, Scalar>();
  const steps: Step[] = [];
  const snap: Snapshot = { current: {}, read: null, verdict: {}, results: [], buffered: 0 };
  let pending: { p2: number; a: Scalar | undefined; b: Scalar | undefined; op: string } | null = null;
  let lastRead: Extract<RawEvent, { t: 'op' }> | null = null;
  let resultCols = 0;
  let cut = false;
  let error: string | null = null;

  const push = (kind: StepKind, text: string) => {
    if (steps.length >= MAX_STEPS) { cut = true; return; }
    steps.push({
      kind, text,
      snap: {
        current: { ...snap.current },
        read: snap.read,
        verdict: Object.fromEntries(Object.entries(snap.verdict).map(([k, v]) => [k, { ...v }])),
        results: snap.results.slice(),
        buffered: snap.buffered,
      },
    });
    snap.read = null;
  };

  const mark = (c: Cursor, v: Verdict) => {
    if (c.table === null || c.temp || c.rowid === undefined) return;
    (snap.verdict[c.table] ??= {})[c.rowid] = v;
  };

  const closeRow = (c: Cursor) => {
    if (c.rowid === undefined || c.temp) return;
    if (!c.produced) {
      mark(c, 'fail');
      push('skip', `✗ ${c.label}의 rowid ${c.rowid} 행은 결과에 들어가지 않음`);
    }
  };

  const contribute = () => {
    for (const c of cursors.values()) {
      c.produced = true;
      mark(c, 'pass');
    }
  };

  for (const e of events) {
    if (e.t === 'schema') { schema.set(e.root, e); continue; }
    if (e.t === 'table') {
      const s = [...schema.values()].find((x) => x.type === 'table' && x.name === e.name);
      tables.push({ name: e.name, cols: ['rowid', ...(s?.cols ?? [])], rows: e.rows });
      continue;
    }
    if (e.t === 'error') {
      error = `${e.where === 'setup' ? '테이블 준비' : e.where === 'prepare' ? '쿼리 해석' : '실행'} 오류: ${e.msg}`;
      if (e.msg === 'interrupted') error = '실행 단계가 너무 많아 중단했습니다 (무한 반복이나 너무 큰 결과).';
      push('error', error);
      continue;
    }
    if (e.t === 'done') { push('end', `완료: 결과 ${e.rows}행`); continue; }

    if (e.t === 'reg') {
      regs.set(e.r, e.v);
      if (lastRead && lastRead.pc === e.pc) {
        const c = cursors.get(lastRead.p1);
        if (c && !c.temp && c.table !== null && c.rowid !== undefined) {
          const col = lastRead.op === 'Column' ? (c.cols[lastRead.p2] ?? 'rowid') : 'rowid';
          snap.read = { table: c.table, rowid: c.rowid, col };
          push('read', `${c.table}.${col} 읽음 = ${show(e.v)}`);
        } else {
          push('read', `정렬 버퍼에서 값 꺼냄 = ${show(e.v)}`);
        }
        lastRead = null;
      }
      continue;
    }

    // e.t === 'op'
    if (pending) {
      const jumped = e.pc === pending.p2;
      const skip = jumped && LOOP_ADVANCE.has(e.op);
      push('test', `비교 ${show(pending.a)} ${CMP[pending.op]} ${show(pending.b)} → ${jumped ? '참' : '거짓'}`
        + (skip ? ' → 조건 불만족, 이 행은 건너뜀' : ' → 조건 만족'));
      pending = null;
    }
    const c = cursors.get(e.p1);
    switch (e.op) {
      case 'OpenRead': {
        const s = e.root !== undefined ? schema.get(e.root) : undefined;
        const isIndex = s?.type === 'index';
        const label = s ? (isIndex ? `인덱스 ${s.name}` : `테이블 ${s.name}`) : `페이지 ${e.root}`;
        cursors.set(e.p1, {
          label, table: s ? s.table : null,
          cols: isIndex ? (s?.cols ?? []) : (s?.cols ?? []),
          temp: false, produced: false,
        });
        push('open', `${label} 읽기 시작`);
        break;
      }
      case 'SorterOpen': case 'OpenEphemeral': case 'OpenPseudo':
        cursors.set(e.p1, { label: '정렬 버퍼', table: null, cols: [], temp: true, produced: false });
        if (e.op === 'SorterOpen') push('sort', '정렬 버퍼 준비');
        break;
      case 'Column': case 'Rowid': case 'IdxRowid':
        if (c && !c.temp && e.rowid !== undefined && e.rowid !== c.rowid) {
          closeRow(c);
          c.rowid = e.rowid;
          c.produced = false;
          if (c.table !== null) snap.current[c.table] = e.rowid;
          push('visit', `▶ ${c.label}: rowid ${e.rowid} 행으로 이동`);
        }
        lastRead = e;
        break;
      case 'Lt': case 'Le': case 'Gt': case 'Ge': case 'Eq': case 'Ne':
        // SQLite 규칙: r[P3] (op) r[P1]가 참이면 P2로 점프
        pending = { p2: e.p2, a: regs.get(e.p3), b: regs.get(e.p1), op: e.op };
        break;
      case 'SeekRowid':
        push('seek', `⤳ ${c?.label}: rowid ${show(regs.get(e.p3))} 행을 바로 찾아감 (전체를 훑지 않음)`);
        break;
      case 'SeekGE': case 'SeekGT': case 'SeekLE': case 'SeekLT': {
        const op = { SeekGE: '>=', SeekGT: '>', SeekLE: '<=', SeekLT: '<' }[e.op];
        push('seek', `⤳ ${c?.label}: 키 ${op} ${show(regs.get(e.p3))} 인 첫 위치로 바로 이동 (전체를 훑지 않음)`);
        break;
      }
      case 'ResultRow':
        contribute();
        resultCols = Math.max(resultCols, e.row?.length ?? 0);
        snap.results.push(e.row ?? []);
        push('emit', `★ 결과 행 출력 ${JSON.stringify(e.row)}`);
        break;
      case 'SorterInsert':
        contribute();
        snap.buffered++;
        push('sort', `↓ 정렬 버퍼에 넣음 (${snap.buffered}행째)`);
        break;
      case 'SorterSort': push('sort', `■ 정렬 버퍼의 ${snap.buffered}행을 정렬`); break;
      case 'SorterData': push('sort', '▶ 정렬된 순서로 다음 행을 꺼냄'); break;
      case 'Compare': push('agg', '이전 행과 그룹 키를 비교'); break;
      case 'AggStep': case 'AggStep1':
        contribute();
        push('agg', `Σ 그룹 집계에 ${show(regs.get(e.p2))} 누적`);
        break;
      case 'AggFinal': push('agg', '■ 그룹 하나의 집계 완료'); break;
      case 'Halt':
        for (const k of cursors.values()) closeRow(k);
        break;
    }
  }
  return { tables, resultCols, steps, cut, error };
}
