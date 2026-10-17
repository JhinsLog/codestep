import './style.css';
import { isDark, setDark, onTheme } from './theme';
import { mountHome, LANGS } from './pages/home';
import { mountJava } from './pages/java';
import { mountSql } from './pages/sql';
import { mountPython } from './pages/python';
import { mountC } from './pages/c';

type Mount = (root: HTMLElement, path: string) => () => void;

/** 정보처리기사 모드는 문제 데이터가 커서 들어갈 때 따로 불러온다 */
const mountExam: Mount = (root, path) => {
  let gone = false;
  let cleanup = () => {};
  root.replaceChildren(Object.assign(document.createElement('p'), { className: 'muted', textContent: '문제를 불러오는 중…' }));
  void import('./pages/exam').then((m) => {
    if (!gone) cleanup = m.mountExam(root, path);
  });
  return () => { gone = true; cleanup(); };
};

/** 정보처리기사 학습 모드 (개념 그림이 많아 들어갈 때 따로 불러온다) */
const mountLearn: Mount = (root, path) => {
  let gone = false;
  let cleanup = () => {};
  root.replaceChildren(Object.assign(document.createElement('p'), { className: 'muted', textContent: '학습 화면을 불러오는 중…' }));
  void import('./pages/learn').then((m) => {
    if (!gone) cleanup = m.mountLearn(root, path);
  });
  return () => { gone = true; cleanup(); };
};

/** ⚡️벼락⚡️ (문제 데이터를 쓰므로 들어갈 때 따로 불러온다) */
const mountCram: Mount = (root) => {
  let gone = false;
  let cleanup = () => {};
  root.replaceChildren(Object.assign(document.createElement('p'), { className: 'muted', textContent: '불러오는 중…' }));
  void import('./pages/cram').then((m) => {
    if (!gone) cleanup = m.mountCram(root);
  });
  return () => { gone = true; cleanup(); };
};

// 앞부분이 같은 주소는 그 화면이 나머지를 처리한다 (/exam/<문제>/solve 등)
const ROUTES: Record<string, { mount: Mount; title: string; prefix?: boolean }> = {
  '/': { mount: mountHome, title: '' },
  '/learn': { mount: mountLearn, title: '정보처리기사 학습', prefix: true },
  '/exam': { mount: mountExam, title: '정보처리기사 모의고사', prefix: true },
  '/cram': { mount: mountCram, title: '⚡️벼락⚡️' },
  '/java': { mount: (r) => mountJava(r), title: 'Java' },
  '/c': { mount: (r) => mountC(r), title: 'C' },
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

// 정보처리기사(학습·모의고사)는 언어들과 따로, 맨 앞에
for (const [text, href] of [['정보처리기사 학습', '/learn'], ['모의고사', '/exam'], ['⚡️벼락⚡️', '/cram']] as const) {
  const a = document.createElement('a');
  a.textContent = text;
  a.href = href;
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
  const to = a.pathname + a.hash;
  if (to !== location.pathname + location.hash) history.pushState(null, '', to);
  show();
});
window.addEventListener('popstate', show);
show();
