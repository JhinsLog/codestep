// SQL 작성 문제 채점: 쓴 SQL을 브라우저 안의 SQLite로 실제 실행해 모범 답안과 결과를 비교한다.
//   조회(SELECT) 문제  → 결과 행을 비교 (모범 답안에 ORDER BY가 있으면 순서까지)
//   변경(INSERT·UPDATE·DELETE·DDL) 문제 → 실행한 뒤 check 조회문의 결과를 비교
import type { Problem } from './problems';
import { runSql, type RawEvent } from '../sql/engine';
import { show } from '../sql/steps';

function rowsOf(events: RawEvent[]): string[] | null {
  const rows: string[] = [];
  for (const e of events) {
    if (e.t === 'error') return null;
    if (e.t === 'op' && e.op === 'ResultRow' && e.row) rows.push(e.row.map((v) => show(v)).join(' '));
  }
  return rows;
}

export async function sqlResult(p: Problem & { kind: 'sql-write' }, sql: string): Promise<string[] | null> {
  const body = sql.trim();
  if (!body) return null;
  if (p.check) return rowsOf(await runSql(`${p.setup}\n${body.endsWith(';') ? body : `${body};`}`, p.check));
  return rowsOf(await runSql(p.setup, body));
}

export async function sameSqlResult(p: Problem & { kind: 'sql-write' }, sql: string): Promise<boolean> {
  const [mine, want] = await Promise.all([sqlResult(p, sql), sqlResult(p, p.answer)]);
  if (!mine || !want || mine.length !== want.length) return false;
  const ordered = !p.check && /\border\s+by\b/i.test(p.answer);
  const a = ordered ? mine : [...mine].sort();
  const b = ordered ? want : [...want].sort();
  return a.every((r, i) => r === b[i]);
}
