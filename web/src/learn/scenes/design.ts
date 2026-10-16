// 소프트웨어 설계 개념의 예시 장면: 결합도 6가지, 응집도 7가지
import { svg } from '../core';
import { scene, type SceneApi } from '../scene';

// ── 결합도: 모듈 A와 B 사이에 "무엇이" 오가는가 ──
const AB = [{ id: 'a', x: 90, y: 100, icon: '🧩', label: '모듈 A' }, { id: 'b', x: 470, y: 100, icon: '🧩', label: '모듈 B' }];

export const COUPLING: Record<string, () => HTMLElement> = {
  data: () => scene({ actors: AB, links: [['a', 'b', 'dash']], async play(s) {
    s.caption('A가 B를 부르면서 꼭 필요한 값만 넘긴다');
    const t = s.token('add(3, 5)', 90, 100);
    await t.move(470, 100);
    await s.say('b', '3 + 5 = 8', 'good', 900);
    t.label('8');
    await t.move(90, 100, 700);
    s.caption('자료 결합도: 값만 주고받아 서로의 내부를 몰라도 된다. 가장 바람직하다');
  } }),
  stamp: () => scene({ actors: AB, links: [['a', 'b', 'dash']], async play(s) {
    s.caption('A가 학생 구조체를 통째로 넘긴다');
    const t = s.token('학생{이름, 학번, 주소, 전화, 성적…}', 120, 100);
    await t.move(400, 100, 1000);
    await s.say('b', '이 중에 학번만 쓰는데…', 'bad', 1300);
    s.caption('스탬프 결합도: 자료 구조를 통째로 넘긴다. 구조(필드)가 바뀌면 일부만 쓰는 B도 고쳐야 할 수 있다');
  } }),
  control: () => scene({ actors: AB, links: [['a', 'b', 'dash']], async play(s) {
    s.caption('A가 "어떻게 처리하라"는 플래그를 넘긴다');
    const t = s.token('print(data, mode=2)', 90, 100);
    await t.move(470, 100);
    await s.say('b', 'mode 2면… 파일로 출력', '', 1200);
    s.mark(280, 160, 'A가 B의 내부 분기(if mode == 2)를 알고 있어야 한다', 'axis');
    s.caption('제어 결합도: 제어 신호로 상대의 내부 흐름을 정한다. B를 고치면 A도 영향을 받는다');
  } }),
  external: () => scene({ actors: [...AB, { id: 'x', x: 280, y: 35, icon: '📜', label: '외부 형식·규약' }], links: [['a', 'x', 'dash'], ['b', 'x', 'dash']], async play(s) {
    s.caption('A와 B가 바깥에서 정한 데이터 형식(파일 형식, 통신 규약, 장치)을 함께 쓴다');
    await Promise.all([s.token('읽기', 90, 100).move(250, 40), s.token('읽기', 470, 100).move(310, 40)]);
    await s.say('x', '형식이 바뀌면?', 'bad', 1200);
    s.caption('외부 결합도: 외부에서 선언한 형식을 함께 참조한다. 형식이 바뀌면 둘 다 고쳐야 한다');
  } }),
  common: () => scene({ actors: [...AB, { id: 'c', x: 280, y: 160, icon: '🧩', label: '모듈 C' }, { id: 'g', x: 280, y: 40, icon: '🌐', label: '전역 변수 G' }], links: [['a', 'g', 'dash'], ['b', 'g', 'dash'], ['c', 'g', 'dash']], async play(s) {
    s.caption('A, B, C가 하나의 전역 변수 G를 함께 쓴다');
    const t = s.token('G = 5', 90, 100);
    await t.move(250, 40, 800);
    t.remove();
    s.flash('g');
    await Promise.all([s.say('b', '어? G가 왜 5지?', 'bad', 1400), s.say('c', '나도 영향받음', 'bad', 1400)]);
    s.caption('공통 결합도: 하나를 고치면 그 전역 변수를 쓰는 모든 모듈이 영향을 받는다. 원인을 찾기도 어렵다');
  } }),
  content: () => scene({ actors: AB, async play(s) {
    s.raw(svg('rect', { x: 400, y: 60, width: 140, height: 80, rx: 10, class: 'scene-module' }));
    s.mark(470, 76, 'B의 내부', 'axis');
    s.caption('A가 B의 내부 변수와 코드에 직접 손을 댄다');
    const t = s.token('B.x = 999', 90, 100);
    await t.move(470, 125, 1000);
    await s.say('b', '내 내부를 맘대로!', 'bad', 1300);
    s.caption('내용 결합도: 다른 모듈의 내부를 직접 참조·수정하거나 코드 중간으로 뛰어든다. 가장 나쁘다');
  } }),
};

// ── 응집도: 모듈 하나 안의 요소들이 "왜" 함께 있는가 ──
const box = (s: SceneApi, title: string) => {
  s.raw(svg('rect', { x: 20, y: 22, width: 520, height: 140, rx: 12, class: 'scene-module' }));
  s.mark(280, 40, title, 'axis');
};
const fn = (id: string, x: number, y: number, label: string, icon = '⚙️') => ({ id, x, y, icon, label });

export const COHESION: Record<string, () => HTMLElement> = {
  functional: () => scene({ actors: [fn('a', 110, 100, '기본급 계산'), fn('b', 280, 100, '수당 더하기'), fn('c', 450, 100, '세금 빼기')], links: [['a', 'b'], ['b', 'c']], async play(s) {
    box(s, '모듈: 급여 계산');
    const t = s.token('직원 정보', 110, 145);
    await t.move(280, 145, 600); await t.move(450, 145, 600);
    t.label('실수령액');
    s.caption('기능적 응집도: 모든 요소가 "급여 계산"이라는 하나의 기능만을 위해 함께 있다. 가장 바람직하다');
  } }),
  sequential: () => scene({ actors: [fn('a', 110, 100, '파일 읽기', '📂'), fn('b', 280, 100, '형식 검사', '🔍'), fn('c', 450, 100, '저장', '💾')], links: [['a', 'b'], ['b', 'c']], async play(s) {
    box(s, '모듈: 자료 등록');
    const t = s.token('원본', 110, 100);
    await t.move(280, 100, 700);
    t.label('검사한 자료');
    await t.move(450, 100, 700);
    s.caption('순차적 응집도: 앞 요소의 "출력"이 다음 요소의 "입력"이 되는 순서로 묶였다');
  } }),
  communicational: () => scene({ actors: [fn('d', 110, 100, '학생 표', '🗂️'), fn('a', 400, 65, '평균 계산'), fn('b', 400, 135, '명단 출력')], links: [['d', 'a'], ['d', 'b']], async play(s) {
    box(s, '모듈: 학생 보고서');
    await Promise.all([s.token('같은 학생 표', 110, 100).move(400, 65, 900), s.token('같은 학생 표', 110, 100).move(400, 135, 900)]);
    s.caption('교환적(통신적) 응집도: 서로 다른 기능이 "같은 입력(또는 출력) 데이터"를 쓰기 때문에 묶였다');
  } }),
  procedural: () => scene({ actors: [fn('a', 110, 100, '로그인 확인', '🔑'), fn('b', 280, 100, '메뉴 표시', '📋'), fn('c', 450, 100, '접속 기록', '📝')], links: [['a', 'b'], ['b', 'c']], async play(s) {
    box(s, '모듈: 시작 처리');
    for (const id of ['a', 'b', 'c']) { s.flash(id); await s.wait(600); }
    s.mark(280, 150, '순서만 정해져 있고 주고받는 데이터는 없다', 'axis');
    s.caption('절차적 응집도: 정해진 "순서"대로 실행해야 하는 기능들을 묶었다(데이터를 이어 받지는 않는다)');
  } }),
  temporal: () => scene({ actors: [fn('t', 90, 100, '프로그램 시작', '⏰'), fn('a', 365, 55, '변수 초기화'), fn('b', 365, 100, '파일 열기'), fn('c', 365, 145, '화면 지우기')], async play(s) {
    box(s, '모듈: 초기화');
    s.flash('t');
    await s.wait(400);
    for (const id of ['a', 'b', 'c']) s.flash(id);
    s.mark(480, 104, '같은 "때"에 실행될 뿐', 'axis');
    s.caption('시간적 응집도: 서로 관련은 없지만 같은 시점(시작할 때, 끝날 때)에 실행되는 것끼리 묶였다');
  } }),
  logical: () => scene({ actors: [fn('f', 90, 100, 'flag = 2', '🚩'), fn('a', 370, 55, '1: 화면 출력'), fn('b', 370, 100, '2: 프린터 출력'), fn('c', 370, 145, '3: 파일 출력')], async play(s) {
    box(s, '모듈: 출력');
    const t = s.token('flag 2', 90, 100);
    await t.move(370, 100, 900);
    s.flash('b');
    s.caption('논리적 응집도: 비슷한 성격(출력)의 처리를 한데 모으고, 플래그로 하나를 골라 실행한다');
  } }),
  coincidental: () => scene({ actors: [fn('a', 110, 100, '날짜 계산', '📅'), fn('b', 280, 100, '메일 검사', '✉️'), fn('c', 450, 100, '파일 압축', '🗜️')], async play(s) {
    box(s, '모듈: Utils');
    await s.say('b', '우리가 왜 같이 있지?', 'bad', 1500);
    s.caption('우연적 응집도: 아무 관련 없는 것들이 우연히 한 모듈에 모였다. 가장 나쁘다');
  } }),
};
