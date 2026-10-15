// 첫 화면: 학습할 언어 고르기
export interface LangCard {
  path: string;
  name: string;
  desc: string;
  status: 'ready' | 'beta' | 'soon';
}

export const LANGS: LangCard[] = [
  { path: '/java', name: 'Java', desc: '진짜 JVM 디버거로 한 줄씩. 호출 스택, 객체, 컬렉션이 어떻게 바뀌는지 봅니다.', status: 'beta' },
  { path: '/c', name: 'C', desc: '진짜 gdb로 한 줄씩. 포인터의 주소가 배열 칸과 변수를 어떻게 가리키는지 봅니다.', status: 'beta' },
  { path: '/python', name: 'Python', desc: '리스트·딕셔너리가 참조로 어떻게 공유되는지, 재귀와 클래스를 한 줄씩 봅니다.', status: 'beta' },
  { path: '/sql', name: 'SQL', desc: '쿼리가 테이블의 행을 하나씩 어떻게 읽고 거르는지 봅니다.', status: 'ready' },
];

const BADGE = { ready: '사용 가능', beta: '베타', soon: '준비 중' } as const;

export function mountHome(root: HTMLElement): () => void {
  root.innerHTML = `
    <section class="hero">
      <h2>코드가 실제로 어떻게 실행되는지, 한 줄씩 보세요</h2>
      <p class="muted">작성한 코드를 진짜로 실행하면서 변수와 자료구조의 변화를 기록합니다.
        디버거처럼 앞뒤로 움직이고, 줄을 누르면 그 줄이 실행된 직후의 상태로 갑니다.</p>
    </section>
    <a class="exam-feature" href="/exam" data-link>
      <span class="badge beta">새 기능</span>
      <h3>정보처리기사 실기 모드</h3>
      <p>C·Java·Python·SQL 코드 문제와 페이지 교체·CPU 스케줄링·트리 순회·서브넷 문제를 풀고,
        채점한 뒤 실행 과정을 그래픽으로 따라갑니다.</p>
      <span class="exam-feature-go">문제 풀러 가기 →</span>
    </a>
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
