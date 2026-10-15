// trace.js가 낸 opcode 기록을 "스캔·필터·조인·정렬" 수준의 사건으로 묶어 출력한다.
// 프로토타입의 목적은 바이트코드 기록만으로 행 단위 처리 과정을 복원할 수 있는지 보는 것.
//
//   node build/trace.js setup.sql query.sql | node narrate.mjs
import { createInterface } from 'node:readline';

const CMP = { Lt: '<', Le: '<=', Gt: '>', Ge: '>=', Eq: '=', Ne: '<>' };
const schema = new Map();   // root page → { type, name, table, cols }
const cursors = new Map();  // cursor 번호 → { label, cols, isIndex, rowid, produced }
const regs = new Map();     // 레지스터 → 마지막으로 관측한 값
const events = [];
let pending = null;         // 결과를 다음 줄에서 확인해야 하는 opcode
let lastRead = null;        // 직전 Column/Rowid opcode (reg 값과 짝지음)

const show = (v) => (typeof v === 'string' ? `'${v}'` : JSON.stringify(v));
const say = (kind, text) => events.push({ kind, text });

function closeRow(c) {
  if (c.rowid !== undefined && !c.produced && !c.isTemp) {
    say('skip', `  ✗ ${c.label} rowid=${c.rowid} 탈락 (결과에 기여하지 않음)`);
  }
}

function onOp(e) {
  // 직전 opcode가 분기였다면 지금 pc로 점프 여부를 판정
  if (pending) {
    const jumped = e.pc === pending.p2;
    say('test', `  ? ${pending.text} → ${jumped ? '점프' : '통과'}`);
    pending = null;
  }
  const c = cursors.get(e.p1);
  switch (e.op) {
    case 'OpenRead': {
      const s = schema.get(e.root);
      const label = s ? (s.type === 'index' ? `인덱스 ${s.name}(${s.table})` : `테이블 ${s.name}`) : `root ${e.root}`;
      cursors.set(e.p1, { label, cols: s?.cols ?? [], isIndex: s?.type === 'index' });
      say('open', `커서 ${e.p1} 열기: ${label}`);
      break;
    }
    case 'SorterOpen': case 'OpenEphemeral':
      cursors.set(e.p1, { label: '정렬/임시 버퍼', cols: [], isTemp: true });
      say('open', `커서 ${e.p1} 열기: 정렬/임시 버퍼`);
      break;
    case 'Column': case 'Rowid': case 'IdxRowid':
      if (c && e.rowid !== undefined && e.rowid !== c.rowid) {
        closeRow(c);
        c.rowid = e.rowid; c.produced = false;
        say('visit', `▶ ${c.label}: rowid=${e.rowid} 방문`);
      }
      lastRead = e;
      break;
    case 'Lt': case 'Le': case 'Gt': case 'Ge': case 'Eq': case 'Ne':
      // SQLite 규칙: r[P3] (op) r[P1] 이면 P2로 점프
      pending = { p2: e.p2, text: `비교 ${show(regs.get(e.p3))} ${CMP[e.op]} ${show(regs.get(e.p1))}` };
      break;
    case 'SeekRowid': case 'SeekGE': case 'SeekGT': case 'SeekLE': case 'SeekLT':
      say('seek', `  ⤳ ${c?.label}: ${e.op} (키 r[${e.p3}]=${show(regs.get(e.p3))})로 바로 이동`);
      break;
    case 'ResultRow':
      for (const k of cursors.values()) k.produced = true;
      say('emit', `  ★ 결과 행 ${JSON.stringify(e.row)}`);
      break;
    case 'SorterInsert': say('sort', `  ↓ 정렬 버퍼에 넣음`); break;
    case 'SorterSort':   say('sort', `■ 정렬 실행`); break;
    case 'SorterData':   say('sort', `▶ 정렬된 순서로 한 행 꺼냄`); break;
    case 'AggStep':      say('agg', `  Σ 집계에 누적 (r[${e.p2}]=${show(regs.get(e.p2))})`); break;
    case 'AggFinal':     say('agg', `■ 집계 마무리`); break;
    case 'Halt':
      for (const k of cursors.values()) closeRow(k);
      say('end', '종료');
      break;
  }
}

const counts = {};
for await (const line of createInterface({ input: process.stdin })) {
  const e = JSON.parse(line);
  if (e.t === 'schema') schema.set(e.root, e);
  else if (e.t === 'op') { counts[e.op] = (counts[e.op] ?? 0) + 1; onOp(e); }
  else if (e.t === 'reg') {
    regs.set(e.r, e.v);
    if (lastRead && lastRead.pc === e.pc) {
      const k = cursors.get(lastRead.p1);
      const col = lastRead.op === 'Column' ? (k?.cols[lastRead.p2] ?? `rowid`) : 'rowid';
      say('read', `  · ${col} = ${show(e.v)}`);
      lastRead = null;
    }
  } else if (e.t === 'done') say('end', `완료: rc=${e.rc}, 결과 ${e.rows}행`);
}
console.log(events.map((x) => x.text).join('\n'));
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`\n[opcode ${total}회 실행] ` + Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(' '));
