import './style.css';
import { isDark, setDark, onTheme } from './theme';
import { mountHome, LANGS } from './pages/home';
import { mountJava } from './pages/java';
import { mountSql } from './pages/sql';
import { mountExam } from './pages/exam';
import { mountPython } from './pages/python';

type Mount = (root: HTMLElement, path: string) => () => void;

// 앞부분이 같은 주소는 그 화면이 나머지를 처리한다 (/exam/<문제>/solve 등)
const ROUTES: Record<string, { mount: Mount; title: string; prefix?: boolean }> = {
  '/': { mount: mountHome, title: '' },
  '/exam': { mount: mountExam, title: '정보처리기사', prefix: true },
  '/java': { mount: (r) => mountJava(r), title: 'Java' },
  '/python': { mount: (r) => mountPython(r), title: 'Python' },
  '/sql': { mount: (r) => mountSql(r), title: 'SQL' },
};

function routeOf(path: string) {
  if (ROUTES[path]) return ROUTES[path];
  const hit = Object.entries(ROUTES).find(([k, r]) => r.prefix && path.startsWith(`${k}/`));
  return hit?.[1] ?? ROUTES['/']!;
}

const app = document.getElementById('app')!;
const crumb = document.getElementById('crumb')!;
const nav = document.getElementById('nav')!;
let unmount: (() => void) | null = null;

// 정보처리기사 모드는 언어들과 따로, 맨 앞에
{
  const a = document.createElement('a');
  a.textContent = '정보처리기사';
  a.href = '/exam';
  a.dataset.link = '';
  a.className = 'nav-exam';
  nav.append(a);
}
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

// 다크 모드 토글
const themeSwitch = document.getElementById('theme') as HTMLInputElement;
themeSwitch.checked = isDark();
themeSwitch.addEventListener('change', () => setDark(themeSwitch.checked));
onTheme(() => { themeSwitch.checked = isDark(); });

function show() {
  const path = location.pathname;
  const route = routeOf(path);
  unmount?.();
  app.className = path === '/' ? 'page home' : 'page';
  crumb.textContent = route.title;
  document.title = route.title ? `${route.title} · codestep` : 'codestep';
  for (const a of nav.querySelectorAll('a')) {
    const href = a.getAttribute('href');
    a.classList.toggle('active', !!href && (href === path || path.startsWith(`${href}/`)));
  }
  unmount = route.mount(app, path);
  window.scrollTo(0, 0);
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
