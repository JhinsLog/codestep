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
    <div class="exam-features">
      <a class="exam-feature" href="/learn" data-link>
        <span class="badge beta">새 기능</span>
        <h3>정보처리기사 학습</h3>
        <p>문제를 풀면서 바로 옆에서 그림으로 확인합니다. 코드는 한 줄씩 실행하며 값이 바뀌는 모습을,
          이론은 OSI 7계층 캡슐화·TCP 연결·정규화·디자인 패턴 같은 기초 지식을 애니메이션으로 봅니다.</p>
        <span class="exam-feature-go">보면서 공부하기 →</span>
      </a>
      <a class="exam-feature" href="/exam" data-link>
        <h3>정보처리기사 모의고사</h3>
        <p>2020년 개편 이후 21개 회차를 같은 개념·같은 함정으로 다시 만든 모의고사. 쓰는 즉시 임시 저장되고, 채점 뒤 해설과 그래픽 풀이를 봅니다.</p>
        <span class="exam-feature-go">시험처럼 풀기 →</span>
      </a>
    </div>
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
