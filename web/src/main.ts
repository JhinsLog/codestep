import './style.css';
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
