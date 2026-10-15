// 첫 화면: 학습할 언어 고르기
export interface LangCard {
  path: string;
  name: string;
  desc: string;
  status: 'ready' | 'beta' | 'soon';
}

export const LANGS: LangCard[] = [
  { path: '/java', name: 'Java', desc: '진짜 JVM 디버거로 한 줄씩. 호출 스택, 객체, 컬렉션이 어떻게 바뀌는지 봅니다.', status: 'beta' },
  { path: '/c', name: 'C', desc: '포인터와 메모리, 배열이 실제로 어떻게 움직이는지 봅니다.', status: 'soon' },
  { path: '/python', name: 'Python', desc: '리스트, 딕셔너리, 재귀를 브라우저 안에서 한 줄씩 따라갑니다.', status: 'soon' },
  { path: '/sql', name: 'SQL', desc: '쿼리가 테이블의 행을 하나씩 어떻게 읽고 거르는지 봅니다.', status: 'ready' },
];

const BADGE = { ready: '사용 가능', beta: '비공개 테스트', soon: '준비 중' } as const;

export function mountHome(root: HTMLElement): () => void {
  root.innerHTML = `
    <section class="hero">
      <h2>코드가 실제로 어떻게 실행되는지, 한 줄씩 보세요</h2>
      <p class="muted">작성한 코드를 진짜로 실행하면서 변수와 자료구조의 변화를 기록합니다.
        디버거처럼 앞뒤로 움직이고, 줄을 누르면 그 줄이 실행된 직후의 상태로 갑니다.</p>
    </section>
    <section class="langs" aria-label="언어 선택"></section>`;
  const list = root.querySelector('.langs')!;
  for (const l of LANGS) {
    const card = document.createElement(l.status === 'soon' ? 'div' : 'a');
    card.className = `lang ${l.status}`;
    if (card instanceof HTMLAnchorElement) {
      card.href = l.path;
      card.dataset.link = '';
    }
    const h = document.createElement('h3');
    h.textContent = l.name;
    const badge = document.createElement('span');
    badge.className = `badge ${l.status}`;
    badge.textContent = BADGE[l.status];
    h.append(badge);
    const p = document.createElement('p');
    p.textContent = l.desc;
    card.append(h, p);
    list.append(card);
  }
  return () => {};
}
