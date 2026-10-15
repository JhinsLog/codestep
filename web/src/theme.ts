// 밝은/어두운 화면. 사용자가 고르면 그것을, 아니면 시스템 설정을 따른다.
//
// <html data-theme="light|dark">를 정하고, 바뀌면 'codestep:theme' 이벤트를 낸다.
// CSS는 data-theme이 없을 때 prefers-color-scheme을 따르므로 이 스크립트가 늦게 돌아도
// 시스템 설정 사용자는 깜빡임이 없다.

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'codestep.theme';
const media = matchMedia('(prefers-color-scheme: dark)');

function load(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* 저장소를 못 쓰는 환경 */ }
  return 'system';
}

let pref: ThemePref = load();

export function themePref(): ThemePref {
  return pref;
}

export function isDark(): boolean {
  return pref === 'dark' || (pref === 'system' && media.matches);
}

function apply() {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  window.dispatchEvent(new Event('codestep:theme'));
}

export function setTheme(p: ThemePref): void {
  pref = p;
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch { /* 무시 */ }
  apply();
}

/** 화면 색이 바뀔 때마다 부른다. 해제 함수를 돌려준다 */
export function onTheme(cb: () => void): () => void {
  window.addEventListener('codestep:theme', cb);
  return () => window.removeEventListener('codestep:theme', cb);
}

media.addEventListener('change', () => {
  if (pref === 'system') apply();
});
apply();
