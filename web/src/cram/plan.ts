// ⚡️벼락⚡️: 시험 직전에 볼 것만 모은 페이지의 내용.
// 합격 전략(코딩 6 + 이론 6 = 60점)을 과목별 "외울 것"으로 줄이고, 회차 모의고사(기출 개념 재현)에서
// 그 주제에 맞는 문제를 골라 바로 풀게 한다. 기출 원문은 싣지 않는다(회차 문제는 개념만 재현한 것).
import type { Category, Problem } from '../exam/problems';
import { ROUNDS } from '../exam/data';

export interface CramTopic {
  id: string;
  cat: Category;          // 칩 색
  name: string;
  goal?: string;          // 시험에서의 목표 (예: '2문제')
  focus: string;          // 출제 예상 유형 한 줄
  points: string[];       // 외울 것 (짧게). `코드`는 코드 글꼴로
  concepts: string[];     // 그림으로 볼 개념 id
  cats: Category[];       // 문제를 고를 과목
  kws: RegExp[];          // 문제를 고르는 낱말 (제목에 있으면 3점, 본문·코드에 있으면 1점)
  max: number;            // 뽑을 문제 수
}

export interface CramPart { id: 'code' | 'theory'; title: string; goal: string; topics: CramTopic[] }

export const CRAM: { title: string; target: string; parts: CramPart[] } = {
  title: '2026년 3회 실기 벼락치기',
  target: '20문항 중 코딩 6 + 이론 6 = 60점 이상. 코딩 11 · 이론 9문항 출제를 예상하고, 코딩은 Python, 이론은 보안에 힘을 싣는다.',
  parts: [
    {
      id: 'code', title: '코딩', goal: '6문제',
      topics: [
        {
          id: 'python', cat: 'python', name: 'Python', goal: '중점',
          focus: '문자열 처리 · 리스트 조작 · 딕셔너리 조회와 갱신',
          points: [
            '슬라이싱 `a[시작:끝:간격]` — 끝은 포함하지 않는다. `a[-1]`은 맨 뒤, `a[::-1]`은 거꾸로',
            '`s.split()`은 공백 기준으로 나눈 리스트, `s.split(",")`은 쉼표 기준. `"-".join(리스트)`는 문자열 요소를 이어 붙인다',
            '딕셔너리 `d[k]`는 없는 키면 오류, `d.get(k, 기본값)`은 기본값. `d[k] = v`는 있으면 갱신, 없으면 추가',
            '`b = a`는 같은 리스트(별명). `a[:]`·`a.copy()`는 얕은 복사 — 겉 리스트만 새로, 안쪽 리스트는 공유. `copy.deepcopy(a)`는 안쪽까지 새로',
          ],
          concepts: ['pycollections'],
          cats: ['python'],
          kws: [/split|join/, /슬라이싱|\[[^\]]*:[^\]]*\]/, /딕셔너리|dict|\{[^}]*:/, /copy|복사/, /문자열|str/, /리스트|list|append|extend/],
          max: 5,
        },
        {
          id: 'sql', cat: 'sql', name: 'SQL',
          focus: '실행 결과 계산 · 빈칸 채우기 · DDL/DML 문장 완성',
          points: [
            '처리 순서 `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY`',
            '`WHERE`는 행을 거르고(집계 함수 못 씀), `HAVING`은 그룹을 거른다(`HAVING COUNT(*) >= 2`)',
            '`LEFT OUTER JOIN`은 왼쪽 행을 모두 남기고 짝이 없으면 NULL. `COUNT(*)`는 NULL도 세고 `COUNT(열)`은 NULL을 뺀다',
            '상관 서브쿼리는 바깥 행마다 안쪽을 다시 실행한다 — `WHERE 급여 > (SELECT AVG(급여) FROM 사원 WHERE 부서 = E.부서)`',
            'DDL: `PRIMARY KEY`, `FOREIGN KEY (열) REFERENCES 표(열)`, `CHECK (조건)`, `CREATE DOMAIN … CHECK`. DML: `INSERT INTO 표(열) VALUES(…)`, `UPDATE 표 SET 열 = 값 WHERE …`',
          ],
          concepts: ['sqlorder', 'joins', 'sqlcmd', 'integrity'],
          cats: ['sql'],
          kws: [/JOIN/i, /HAVING/i, /GROUP BY/i, /서브쿼리|IN \(SELECT|EXISTS|\(SELECT/i, /CREATE|ALTER|FOREIGN|CHECK|REFERENCES/i, /INSERT|UPDATE|DELETE/i],
          max: 5,
        },
        {
          id: 'c', cat: 'c', name: 'C 언어',
          focus: '포인터 · 배열 · 구조체 · 자료구조(연결 리스트·스택·큐)',
          points: [
            '값에 의한 호출은 복사본만 바뀐다. 주소를 넘기고(`f(&x)`) `*p = …`로 고쳐야 원본이 바뀐다',
            '`*p++`는 값을 읽고 포인터를 옮긴다, `(*p)++`는 가리키는 값을 1 늘린다, `*++p`는 먼저 옮기고 읽는다',
            '`a[i]` = `*(a + i)`. 구조체 포인터는 `p->x` = `(*p).x`',
            '연결 리스트 끼워 넣기: `새->next = 앞->next; 앞->next = 새;` (순서가 바뀌면 뒤가 끊긴다). 스택은 나중에 넣은 것부터(LIFO), 큐는 먼저 넣은 것부터(FIFO)',
            '트리 순회: 전위(루트·왼·오), 중위(왼·루트·오), 후위(왼·오·루트)',
          ],
          concepts: ['cpointer', 'tree'],
          cats: ['c', 'ds'],
          kws: [/포인터|\*p|->|&/, /구조체|struct/, /swap|교환|주소/, /연결 리스트|next|스택|push|pop|큐|queue/i, /배열|\[\d*\]/, /순회|트리/],
          max: 5,
        },
        {
          id: 'java', cat: 'java', name: 'Java',
          focus: '상속 · 오버로딩/오버라이딩 · 생성자와 super · 실행 순서',
          points: [
            '오버로딩(이름 같고 매개변수 다름)은 컴파일 때 선언 타입으로 고르고, 오버라이딩(부모 메서드 재정의)은 실행 때 실제 객체로 고른다',
            '`Parent p = new Child(); p.m()` → 자식이 재정의한 `m()`이 실행된다. 단, 필드와 static 메서드는 선언 타입(Parent) 것을 쓴다',
            '자식 생성자 첫 줄에 `super()`가 숨어 있어 부모 생성자가 먼저 실행된다',
            '부모 생성자 안에서 재정의된 메서드를 부르면 자식 메서드가 불리는데, 자식 필드는 아직 초기화 전(0·null)이다',
            '`super.m()`은 부모 버전 호출, `this(…)`는 같은 클래스의 다른 생성자 호출',
          ],
          concepts: ['oop'],
          cats: ['java'],
          kws: [/오버라이딩|override/i, /오버로딩|overload/i, /super/, /생성자|new \w+\(/, /extends|상속|업캐스팅/, /static/],
          max: 5,
        },
      ],
    },
    {
      id: 'theory', title: '이론', goal: '6문제',
      topics: [
        {
          id: 'design', cat: 'design', name: '소프트웨어 설계', goal: '2문제',
          focus: '디자인 패턴 구분 · 응집도와 결합도',
          points: [
            '생성 패턴: 싱글톤, 팩토리 메서드, 추상 팩토리(관련 객체 묶음을 구체 클래스 없이 생성), 빌더, 프로토타입',
            '구조 패턴: 어댑터(인터페이스 변환), 브리지(기능과 구현을 분리해 따로 확장), 컴포지트, 데코레이터(기능 덧붙이기), 퍼사드, 플라이웨이트, 프록시',
            '행위 패턴: 옵서버(상태 변화 알림), 전략, 템플릿 메서드, 커맨드, 상태, 이터레이터, 방문자, 중재자, 메멘토, 책임 연쇄, 인터프리터',
            '응집도(강→약): 기능적 > 순차적 > 교환적 > 절차적 > 시간적 > 논리적 > 우연적',
            '결합도(약→강): 자료 < 스탬프 < 제어 < 외부 < 공통 < 내용. 좋은 설계는 응집도↑ 결합도↓',
          ],
          concepts: ['gof', 'cohesion', 'coupling'],
          cats: ['design'],
          kws: [/패턴|pattern/i, /브리지|bridge|추상 팩토리|abstract factory/i, /응집/, /결합/],
          max: 4,
        },
        {
          id: 'dev', cat: 'dev', name: '소프트웨어 개발', goal: '1문제',
          focus: '커버리지 · 블랙박스 테스트(경계값·결정 테이블)',
          points: [
            '커버리지(약→강): 구문(모든 문장 한 번) < 결정·분기(조건식 전체가 참·거짓 한 번씩) < 조건(개별 조건이 참·거짓 한 번씩) < 조건/결정 < MC/DC < 다중 조건(모든 조합)',
            '블랙박스: 동등 분할, 경계값 분석, 원인-결과 그래프, 결정 테이블, 오류 예측, 비교 검사',
            '경계값 분석: 1~100이 유효하면 0 · 1 · 100 · 101(경계와 그 바로 바깥)을 넣는다',
            '화이트박스: 기초 경로(McCabe 복잡도 V(G) = 간선 − 노드 + 2), 조건·루프 검사',
          ],
          concepts: ['coverage', 'blackbox'],
          cats: ['dev'],
          kws: [/커버리지|coverage/i, /경계값|동등 분할|결정 테이블|원인|블랙박스/, /화이트박스|McCabe|복잡도/i],
          max: 3,
        },
        {
          id: 'db', cat: 'db', name: '데이터베이스', goal: '1문제',
          focus: '관계 대수 · 관계 해석 · 기본 용어 · 논리 설계',
          points: [
            '릴레이션=표, 튜플=행, 속성=열. 차수(degree)=속성 수, 카디널리티(cardinality)=튜플 수, 도메인=속성이 가질 수 있는 값의 범위',
            '관계 대수(절차적): σ 셀렉트(행), π 프로젝트(열), ⋈ 조인, ÷ 디비전, ∪ ∩ − × . 관계 해석은 비절차적(무엇을 원하는지만)',
            '설계 순서: 요구 분석 → 개념(E-R) → 논리(릴레이션 변환·정규화) → 물리(저장 구조·인덱스) → 구현',
          ],
          concepts: ['relterms', 'relalg', 'dbdesign'],
          cats: ['db'],
          kws: [/관계 ?대수|σ|π|⋈|÷|셀렉트|프로젝트|디비전/, /관계 ?해석/, /카디널리티|차수|튜플|도메인|degree|cardinality/i, /논리 설계|개념 설계|물리 설계/],
          max: 3,
        },
        {
          id: 'netos', cat: 'net', name: '네트워크 · 운영체제', goal: '1문제',
          focus: '계층별 프로토콜 · 페이지 교체(FIFO · LRU · LFU)',
          points: [
            '응용 계층: HTTP, FTP, SMTP, DNS, SNMP, Telnet / 전송: TCP, UDP / 네트워크: IP, ICMP, IGMP, 라우팅(RIP·OSPF·BGP) / 데이터 링크: 이더넷, HDLC, PPP',
            'FIFO는 가장 먼저 들어온 페이지를, LRU는 가장 오래 쓰지 않은 페이지를, LFU는 사용 횟수가 가장 적은 페이지를 내보낸다(OPT는 앞으로 가장 오래 안 쓸 것)',
            '페이지 부재 수 세기: 참조한 페이지가 프레임에 없으면 +1 (처음 채울 때도 센다)',
          ],
          concepts: ['osi', 'paging', 'protocol'],
          cats: ['net', 'os'],
          kws: [/FIFO/, /LRU/, /LFU|OPT/, /계층|OSI|프로토콜|HTTP|DNS|TCP|UDP|ICMP/],
          max: 4,
        },
        {
          id: 'sec', cat: 'sec', name: '보안', goal: '1문제 이상 · 중점',
          focus: '공격 유형 · 보안 기능(SSO · RBAC · DLP) · 암호 알고리즘',
          points: [
            '공격: SQL 삽입, XSS, CSRF, 스니핑, 스푸핑, 서비스 거부(SYN 플러딩, 스머프, Ping of Death, Land), 랜섬웨어, APT, 피싱·스미싱, 제로데이',
            'SSO는 한 번 로그인으로 여러 시스템을 쓰는 것, DLP는 내부 정보 유출을 막는 것, IDS는 침입 탐지 / IPS는 탐지 후 차단',
            '접근 통제: DAC(소유자가 권한 결정) · MAC(보안 등급으로 강제) · RBAC(역할에 권한을 주고 사람에게 역할을 줌)',
            '암호: 대칭키 DES · 3DES · AES · SEED · ARIA · IDEA / 공개키 RSA(소인수분해) · ECC · ElGamal / 해시 MD5 · SHA',
          ],
          concepts: ['attacks', 'dos', 'access', 'crypto', 'sectech'],
          cats: ['sec'],
          kws: [/공격|스푸핑|스니핑|플러딩|XSS|CSRF|삽입|피싱|랜섬|APT/i, /(?<![A-Za-z])(SSO|RBAC|DLP|IDS|IPS|DAC)(?![A-Za-z])|접근 통제/, /암호|AES|DES|RSA|SEED|ARIA|해시|SHA/i],
          max: 5,
        },
      ],
    },
  ],
};

function textOf(p: Problem): string {
  const parts = [p.question];
  if (p.kind === 'code' || p.kind === 'code-blank') parts.push(p.code);
  if (p.kind === 'sql') parts.push(p.query, p.before ?? '');
  if (p.kind === 'sql-write') parts.push(p.answer);
  if (p.kind === 'short') parts.push(p.pre ?? '', (p.options ?? []).join(' '));
  return parts.join('\n');
}

/** 주제에 맞는 회차 문제. 한 문제씩 고르면서, 이미 다룬 낱말은 점수를 낮춰 여러 유형이 고루 나오게 한다.
 *  점수가 같으면 최근 회차부터, 경향으로 채운 문항(trend)은 뒤로 */
export function pickProblems(t: CramTopic): Problem[] {
  const pool: { p: Problem; hits: number[]; i: number }[] = [];
  let i = 0;
  for (const r of ROUNDS) for (const p of r.problems) {
    i++;
    if (!t.cats.includes(p.cat)) continue;
    const body = textOf(p);
    pool.push({ p, i, hits: t.kws.map((re) => (re.test(p.title) ? 3 : re.test(body) ? 1 : 0)) });
  }
  const covered = t.kws.map(() => 0);
  const score = (x: (typeof pool)[number]) =>
    x.hits.reduce((s, h, k) => s + h / (1 + covered[k]! * 2), 0) - (x.p.trend ? 3 : 0);
  const out: Problem[] = [];
  while (out.length < t.max && pool.length) {
    let best = 0;
    for (let k = 1; k < pool.length; k++) {
      const d = score(pool[k]!) - score(pool[best]!);
      if (d > 0 || (d === 0 && pool[k]!.i < pool[best]!.i)) best = k;
    }
    const [x] = pool.splice(best, 1);
    x!.hits.forEach((h, k) => { if (h) covered[k]!++; });
    out.push(x!.p);
  }
  return out;
}

/** 페이지 전체의 풀이 순서 (문제 화면의 이전·다음에 쓴다) */
let seq: Problem[] | null = null;
export function cramSequence(): Problem[] {
  if (seq) return seq;
  const seen = new Set<string>();
  seq = [];
  for (const part of CRAM.parts) for (const t of part.topics) for (const p of pickProblems(t)) {
    if (!seen.has(p.id)) { seen.add(p.id); seq.push(p); }
  }
  return seq;
}
