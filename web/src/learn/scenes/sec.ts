// 보안 개념의 예시 장면: 정보보안 3요소, 접근 통제 모델, 악성 소프트웨어
import { scene } from '../three/scene3d';

// ── 정보보안 3요소 ──
export const CIA: Record<string, () => HTMLElement> = {
  confidentiality: () => scene({
    actors: [{ id: 'me', x: 60, y: 110, icon: '🧑‍💼', label: '허가된 직원' }, { id: 'f', x: 280, y: 110, icon: '🗄️', label: '인사 기록' }, { id: 'eve', x: 500, y: 110, icon: '🕵️', label: '외부인', kind: 'bad' }],
    async play(s) {
      s.caption('기밀성: 허가된 사람만 정보를 볼 수 있어야 한다');
      const a = s.token('🔑 열람 요청', 60, 110);
      await a.move(230, 110, 800);
      await s.say('f', '권한 확인 ✓', 'good', 900);
      a.label('📄 내용 보임');
      await a.move(60, 150, 700);
      const b = s.token('열람 요청', 500, 110);
      await b.move(330, 110, 800);
      await s.say('f', '권한 없음 ✕', 'bad', 1100);
      await b.fade(300);
      s.caption('위협: 도청·스니핑, 무단 열람 / 대책: 암호화, 접근 통제, 인증');
    },
  }),
  integrity: () => scene({
    actors: [{ id: 'a', x: 60, y: 110, icon: '💻', label: '보내는 쪽' }, { id: 'm', x: 280, y: 40, icon: '😈', label: '변조자', kind: 'bad' }, { id: 'b', x: 500, y: 110, icon: '🏦', label: '받는 쪽' }],
    links: [['a', 'b']],
    async play(s) {
      s.caption('무결성: 허가된 방법으로만 바뀌어야 한다. 보낸 내용 그대로 도착했는지 확인한다');
      const t = s.token('1만 원 송금 | 해시 ab12', 70, 110);
      await t.move(280, 110, 900);
      await s.say('m', '0을 두 개 더 붙여야지', 'bad', 1100);
      t.label('100만 원 송금 | 해시 ab12');
      t.cls('broken');
      await t.move(500, 110, 900);
      await s.say('b', '다시 계산하니 해시 9f3c ≠ ab12 → 변조!', 'bad', 1500);
      s.caption('위협: 위·변조 / 대책: 해시로 확인, 전자서명, 접근 통제. 내용이 1비트만 바뀌어도 해시값이 완전히 달라진다');
    },
  }),
  availability: () => scene({
    actors: [{ id: 'bad', x: 60, y: 45, icon: '🤖', label: '공격 PC들', kind: 'bad' }, { id: 'u', x: 60, y: 150, icon: '🙂', label: '정상 사용자' }, { id: 's', x: 470, y: 100, icon: '🖥️', label: '서버' }],
    async play(s) {
      s.caption('가용성: 허가된 사용자가 필요할 때 언제든 쓸 수 있어야 한다');
      const flood = Array.from({ length: 8 }, (_, i) => s.token('요청', 60, 45 + (i % 3) * 6));
      await Promise.all(flood.map((t, i) => s.wait(i * 120).then(() => t.move(420, 80 + (i % 4) * 8, 700))));
      await s.say('s', '처리할 수가 없다…', 'bad', 900);
      const u = s.token('내 요청', 60, 150);
      await u.move(330, 140, 800);
      s.mark(350, 128, '✕', 'x');
      await s.say('u', '접속이 안 돼요', 'bad', 1200);
      s.caption('위협: 서비스 거부(DoS) 공격, 장애 / 대책: 이중화, 백업, 부하 분산, DoS 차단');
    },
  }),
};

// ── 접근 통제 모델 ──
export const ACCESS: Record<string, () => HTMLElement> = {
  mac: () => scene({
    actors: [{ id: 'u', x: 70, y: 100, icon: '🪖', label: '사용자 · 비밀 등급' }, { id: 'sys', x: 280, y: 100, icon: '🛡️', label: '시스템' }, { id: 'd1', x: 480, y: 45, icon: '📕', label: '1급 비밀 문서' }, { id: 'd2', x: 480, y: 155, icon: '📘', label: '대외비 문서' }],
    async play(s) {
      s.caption('강제적 접근 통제(MAC): 주체와 객체의 보안 등급(레이블)을 시스템이 비교해 강제로 정한다');
      const t = s.token('1급 비밀 열람', 70, 100);
      await t.move(280, 100, 800);
      await s.say('sys', '비밀 < 1급 비밀 → 거부', 'bad', 1300);
      t.label('대외비 열람');
      await t.move(480, 130, 800);
      await s.say('d2', '등급 충분 → 허용', 'good', 1100);
      s.caption('소유자도 마음대로 바꿀 수 없다. 군사·정부 기관처럼 보안이 엄격한 곳에서 쓴다');
    },
  }),
  dac: () => scene({
    actors: [{ id: 'o', x: 70, y: 100, icon: '🧑', label: '김 (파일 소유자)' }, { id: 'f', x: 280, y: 40, icon: '📄', label: '보고서.txt' }, { id: 'p', x: 480, y: 100, icon: '🧑', label: '이' }],
    async play(s) {
      s.caption('임의적 접근 통제(DAC): 파일의 소유자가 권한을 마음대로 주고 뺏는다');
      const g = s.token('읽기 권한 줌', 70, 100);
      await g.move(480, 100, 1000);
      await s.say('p', '이제 읽을 수 있다', 'good', 1000);
      g.label('권한 회수');
      g.cls('broken');
      await s.say('o', '다시 뺏을래', '', 900);
      await s.say('p', '이제 못 읽는다', 'bad', 1000);
      s.caption('유닉스 파일 권한(chmod), 접근 제어 목록(ACL)이 대표적이다');
    },
  }),
  rbac: () => scene({
    actors: [{ id: 'p', x: 70, y: 100, icon: '🧑', label: '박' }, { id: 'r1', x: 280, y: 45, icon: '💼', label: '역할: 회계 담당' }, { id: 'r2', x: 280, y: 155, icon: '📞', label: '역할: 영업 담당' }, { id: 'perm', x: 490, y: 45, icon: '✍️', label: '권한: 결재' }],
    links: [['r1', 'perm', 'dash']],
    async play(s) {
      s.caption('역할 기반 접근 통제(RBAC): 권한은 "역할"에 묶고, 사람에게는 역할을 준다');
      const t = s.token('박', 70, 100);
      await t.move(280, 72, 800);
      await s.say('perm', '회계 담당이면 결재 가능', 'good', 1200);
      s.caption('박이 영업팀으로 옮기면 → 역할만 바꾼다');
      await t.move(280, 128, 800);
      await s.say('r2', '결재 권한 없음', 'bad', 1100);
      s.caption('사람이 많고 인사이동이 잦은 기업에 알맞다. 권한을 하나하나 고칠 필요가 없다');
    },
  }),
};

// ── 악성 소프트웨어 ──
const PCS = [{ id: 'a', x: 70, y: 100, icon: '💻', label: '감염 PC' }, { id: 'b', x: 280, y: 45, icon: '💻', label: 'PC 2' }, { id: 'c', x: 280, y: 155, icon: '💻', label: 'PC 3' }, { id: 'd', x: 490, y: 100, icon: '💻', label: 'PC 4' }];

export const MALWARE: Record<string, () => HTMLElement> = {
  virus: () => scene({
    actors: [{ id: 'f', x: 120, y: 100, icon: '📄', label: '정상 프로그램' }, { id: 'g', x: 440, y: 100, icon: '📄', label: '다른 프로그램' }],
    async play(s) {
      s.caption('바이러스: 다른 파일(숙주)에 붙어서 퍼진다');
      const v = s.token('🦠', 30, 60);
      await v.move(120, 80, 700);
      await s.say('f', '감염됨', 'bad', 900);
      s.caption('감염된 프로그램을 실행하면 다른 파일에도 달라붙는다');
      await s.token('🦠', 120, 80).move(440, 80, 900);
      await s.say('g', '나도 감염', 'bad', 900);
      s.caption('스스로 퍼지지 못하고, 사람이 감염된 파일을 실행·복사해야 퍼진다 (웜과의 차이)');
    },
  }),
  worm: () => scene({
    actors: PCS, links: [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']],
    async play(s) {
      s.caption('웜: 숙주 없이 스스로 복제해 네트워크를 타고 퍼진다');
      await Promise.all([s.token('🪱', 70, 100).move(280, 45, 800), s.token('🪱', 70, 100).move(280, 155, 800)]);
      s.flash('b'); s.flash('c');
      await s.token('🪱', 280, 45).move(490, 100, 800);
      s.flash('d');
      s.caption('사람이 아무것도 하지 않아도 취약점을 통해 자동으로 퍼지고 네트워크를 마비시킨다');
    },
  }),
  trojan: () => scene({
    actors: [{ id: 'u', x: 80, y: 100, icon: '🙂', label: '사용자' }, { id: 'pc', x: 460, y: 100, icon: '💻', label: '내 PC' }],
    async play(s) {
      s.caption('트로이 목마: 유용한 프로그램인 척 위장한다');
      const t = s.token('🎮 무료 게임.exe', 80, 100);
      await t.move(460, 100, 1000);
      t.label('🐴 → 🕵️ 정보 유출');
      t.cls('broken');
      await s.say('pc', '게임 속에 악성코드가!', 'bad', 1300);
      s.caption('스스로 복제하지 않는다. 사용자가 속아서 직접 설치하게 만든다');
    },
  }),
  ransomware: () => scene({
    actors: [{ id: 'pc', x: 140, y: 100, icon: '💻', label: '내 PC' }, { id: 'h', x: 440, y: 100, icon: '💰', label: '공격자', kind: 'bad' }],
    async play(s) {
      s.caption('랜섬웨어: 파일을 암호화해 못 쓰게 만들고 몸값을 요구한다');
      const files = ['사진.jpg', '보고서.docx', '장부.xlsx'].map((f, i) => s.token(f, 140, 40 + i * 40));
      await s.wait(600);
      files.forEach((f) => { f.label('🔒 ????'); f.cls('broken'); });
      await s.say('h', '열고 싶으면 비트코인 보내', 'bad', 1500);
      s.caption('대책: 정기적인 오프라인 백업, 보안 업데이트, 의심스러운 첨부 파일 열지 않기');
    },
  }),
  scareware: () => scene({
    actors: [{ id: 'u', x: 90, y: 110, icon: '😨', label: '사용자' }, { id: 'pop', x: 380, y: 60, icon: '⚠️', label: '바이러스 37개 발견!', kind: 'bad' }],
    async play(s) {
      s.caption('스케어웨어: 가짜 경고로 겁을 준다');
      await s.say('pop', '지금 치료하려면 결제하세요', 'bad', 1400);
      const t = s.token('💳 결제', 90, 110);
      await t.move(380, 100, 900);
      s.caption('실제로는 아무 문제가 없거나, 결제·설치한 프로그램이 오히려 악성코드다');
    },
  }),
  adware: () => scene({
    actors: [{ id: 'pc', x: 280, y: 100, icon: '💻', label: '내 PC' }],
    async play(s) {
      s.caption('애드웨어: 원하지 않는 광고를 계속 띄운다');
      for (let i = 0; i < 5; i++) { s.token('📢 광고', 120 + i * 80, 40 + (i % 2) * 110); await s.wait(300); }
      s.caption('주로 무료 프로그램에 끼워 설치된다');
    },
  }),
  rootkit: () => scene({
    actors: [{ id: 'tm', x: 140, y: 100, icon: '📊', label: '작업 관리자' }, { id: 'rk', x: 440, y: 100, icon: '👻', label: '루트킷', kind: 'bad' }],
    async play(s) {
      s.caption('루트킷: 관리자(root) 권한을 얻은 뒤 자기 흔적을 숨긴다');
      const list = ['explorer.exe', 'chrome.exe', 'evil.exe'].map((p, i) => s.token(p, 140, 40 + i * 40));
      await s.wait(700);
      await list[2]!.fade(700);
      await s.say('tm', '수상한 프로세스 없음', '', 1200);
      s.caption('운영체제(커널)까지 고쳐 작업 관리자·백신에도 보이지 않게 하고, 권한을 계속 유지한다');
    },
  }),
  backdoor: () => scene({
    actors: [{ id: 'h', x: 70, y: 100, icon: '🕵️', label: '공격자', kind: 'bad' }, { id: 'front', x: 300, y: 45, icon: '🚪', label: '정문 (로그인)' }, { id: 'srv', x: 490, y: 100, icon: '🖥️', label: '서버' }],
    async play(s) {
      s.caption('백도어: 정상 인증(정문)을 거치지 않고 들어가는 비밀 뒷문');
      await s.say('front', '아이디·비밀번호?', '', 900);
      const t = s.token('뒷문으로', 70, 100);
      await t.move(300, 150, 700);
      await t.move(490, 120, 700);
      await s.say('srv', '인증 없이 접속됨', 'bad', 1100);
      s.caption('개발자가 남긴 디버그용 통로나 공격자가 심은 프로그램이 백도어가 된다');
    },
  }),
  keylogger: () => scene({
    actors: [{ id: 'u', x: 70, y: 100, icon: '⌨️', label: '키보드 입력' }, { id: 'site', x: 490, y: 45, icon: '🏦', label: '은행 사이트' }, { id: 'h', x: 490, y: 155, icon: '🕵️', label: '공격자', kind: 'bad' }],
    async play(s) {
      s.caption('키로거: 누르는 키를 몰래 기록해 빼돌린다');
      const t = s.token('p a s s 1 2 3 4', 70, 100);
      const c = s.token('p a s s 1 2 3 4', 70, 100);
      await Promise.all([t.move(490, 72, 1000), c.move(490, 128, 1000)]);
      await s.say('h', '비밀번호 수집 완료', 'bad', 1200);
      s.caption('대책: 가상 키보드, 2단계 인증(OTP), 백신');
    },
  }),
  spyware: () => scene({
    actors: [{ id: 'pc', x: 90, y: 100, icon: '💻', label: '내 PC' }, { id: 'h', x: 480, y: 100, icon: '🕵️', label: '수집 서버', kind: 'bad' }],
    async play(s) {
      s.caption('스파이웨어: 사용자 몰래 정보를 모아 보낸다');
      for (const info of ['방문 기록', '연락처', '카드 정보']) await s.token(info, 90, 100).move(480, 100, 700);
      s.caption('사용자가 눈치채지 못하게 오래 머물며 개인정보를 빼낸다');
    },
  }),
};
