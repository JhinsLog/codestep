// 실행 API 호출 (server/api.mjs). C·Java는 서버의 격리 컨테이너에서 실행된다.
import type { Trace } from './trace/types';

/** 실행 API가 아직 공개 전이라 관리자 로그인이 필요할 때 */
export class LockedError extends Error {}

export async function runCode(lang: 'java' | 'python' | 'c', code: string): Promise<Trace> {
  let res: Response;
  try {
    res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, code }),
      redirect: 'manual', // Access 로그인 페이지로 튕기면 따라가지 않고 잠금으로 처리
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('실행 서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.');
  }
  if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 403) {
    let message = 'C·Java 실행은 아직 공개 전입니다. 관리자 로그인이 필요합니다.';
    try { message = ((await res.json()) as { message?: string }).message ?? message; } catch { /* 본문 없음 */ }
    throw new LockedError(message);
  }
  if (!res.ok) {
    let message = `실행에 실패했습니다 (${res.status}).`;
    try { message = ((await res.json()) as { message?: string }).message ?? message; } catch { /* 본문 없음 */ }
    throw new Error(message);
  }
  return (await res.json()) as Trace;
}

/** Access 로그인을 거쳐 지금 화면으로 돌아오는 주소 */
export function loginUrl(): string {
  return `/api/auth?next=${encodeURIComponent(location.pathname)}`;
}
