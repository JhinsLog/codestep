// 밝은/어두운 화면. 사용자가 토글로 고르면 그 값을 기억하고, 고른 적이 없으면 시스템 설정을 따른다.
//
// <html data-theme="light|dark">를 정하고, 바뀌면 'codestep:theme' 이벤트를 낸다.
// CSS는 data-theme이 없을 때 prefers-color-scheme을 따르므로 이 스크립트가 늦게 돌아도
// 시스템 설정과 같은 사용자는 깜빡임이 없다.

const KEY = 'codestep.theme';
const media = matchMedia('(prefers-color-scheme: dark)');

function saved(): boolean | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v === 'dark';
  } catch { /* 저장소를 못 쓰는 환경 */ }
  return null;
}

let chosen: boolean | null = saved();

export function isDark(): boolean {
  return chosen ?? media.matches;
}

function apply() {
  document.documentElement.dataset.theme = isDark() ? 'dark' : 'light';
  window.dispatchEvent(new Event('codestep:theme'));
}

export function setDark(on: boolean): void {
  chosen = on;
  try { localStorage.setItem(KEY, on ? 'dark' : 'light'); } catch { /* 무시 */ }
  apply();
}

/** 화면 색이 바뀔 때마다 부른다. 해제 함수를 돌려준다 */
export function onTheme(cb: () => void): () => void {
  window.addEventListener('codestep:theme', cb);
  return () => window.removeEventListener('codestep:theme', cb);
}

media.addEventListener('change', () => {
  if (chosen === null) apply();
});
apply();
