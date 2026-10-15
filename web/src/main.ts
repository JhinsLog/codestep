import './style.css';
import { setTheme, themePref, onTheme, type ThemePref } from './theme';
import { mountHome, LANGS } from './pages/home';
import { mountJava } from './pages/java';
import { mountSql } from './pages/sql';

type Mount = (root: HTMLElement) => () => void;

const ROUTES: Record<string, { mount: Mount; title: string }> = {
  '/': { mount: mountHome, title: '' },
  '/java': { mount: mountJava, title: 'Java' },
  '/sql': { mount: mountSql, title: 'SQL' },
};

const app = document.getElementById('app')!;
const crumb = document.getElementById('crumb')!;
const nav = document.getElementById('nav')!;
let unmount: (() => void) | null = null;

for (const l of LANGS) {
  const a = document.createElement('a');
  a.textContent = l.name;
  if (l.status === 'soon') {
    a.className = 'soon';
    a.title = '준비 중';
  } else {
    a.href = l.path;
    a.dataset.link = '';
  }
  nav.append(a);
}

// 화면 색 버튼: 자동(시스템) → 밝게 → 어둡게 → 자동
const themeBtn = document.getElementById('theme') as HTMLButtonElement;
const THEME_LABEL: Record<ThemePref, [string, string]> = {
  system: ['◐ 자동', '화면 색: 시스템 설정을 따름 (누르면 밝게)'],
  light: ['☀ 밝게', '화면 색: 밝게 (누르면 어둡게)'],
  dark: ['☾ 어둡게', '화면 색: 어둡게 (누르면 자동)'],
};
const NEXT: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
const paintThemeBtn = () => {
  const [text, title] = THEME_LABEL[themePref()];
  themeBtn.textContent = text;
  themeBtn.title = title;
  themeBtn.setAttribute('aria-label', title);
};
themeBtn.addEventListener('click', () => setTheme(NEXT[themePref()]));
onTheme(paintThemeBtn);
paintThemeBtn();

function show() {
  const route = ROUTES[location.pathname] ?? ROUTES['/']!;
  unmount?.();
  app.className = location.pathname === '/' ? 'page home' : 'page';
  crumb.textContent = route.title;
  document.title = route.title ? `${route.title} · codestep` : 'codestep';
  for (const a of nav.querySelectorAll('a')) a.classList.toggle('active', a.getAttribute('href') === location.pathname);
  unmount = route.mount(app);
}

document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  if (a.pathname !== location.pathname) history.pushState(null, '', a.pathname);
  show();
});
window.addEventListener('popstate', show);
show();
