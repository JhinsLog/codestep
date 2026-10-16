// 2022년 회차. 문항 개념은 공개된 복원 자료의 개념 목록을 참고했다 (지문·코드는 새로 씀).
import { anyOrder, blanks, fill, out, raw, round, sqlOut, sqlWrite, term } from '../build';

export const Y2022 = [
  round('2022-3', {
    pass: 20.38, level: 4,
    note: '프로그래밍이 어려웠고 보안 용어의 함정이 많았던 회차. 4중 for문으로 지뢰 찾기 표를 채우는 문제가 유명하다. 서브네팅, 스케줄링 용어, E-R 기호, 형상 관리 도구까지 범위가 넓었다.',
  }, [
    out('c', '지뢰 찾기: 이웃 칸 세기', `#include <stdio.h>

#define R 4
#define C 4

int inside(int r, int c) { return r >= 0 && r < R && c >= 0 && c < C; }

int main(void) {
    int mine[R][C] = {
        {1, 0, 0, 1},
        {0, 0, 1, 0},
        {0, 1, 0, 0},
        {0, 0, 0, 1}
    };
    int cnt[R][C] = {0};
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            for (int dr = -1; dr <= 1; dr++)
                for (int dc = -1; dc <= 1; dc++) {
                    if (dr == 0 && dc == 0) continue;
                    if (inside(r + dr, c + dc) && mine[r + dr][c + dc]) cnt[r][c]++;
                }
    printf("%d %d %d %d", cnt[1][1], cnt[0][0], cnt[2][2], cnt[3][0]);
    return 0;
}
`, '3 0 3 1',
      `각 칸을 둘러싼 8칸 중 지뢰(1)의 수를 센다. 판 밖은 inside()로 거른다.
• (1,1): 둘레에 (0,0) (1,2) (2,1) → 3
• (0,0): 둘레 (0,1) (1,0) (1,1) 모두 0 → 0 (자기 자신은 세지 않는다)
• (2,2): (1,2) (2,1) (3,3) → 3
• (3,0): (2,1) → 1
&&는 앞이 거짓이면 뒤를 계산하지 않아서, 판 밖의 mine[-1][…]을 읽지 않는다.`),
    blanks('db', '관계 대수 연산',
      '관계 대수 연산에 대한 설명이다. 빈칸에 알맞은 연산 이름을 쓰시오.',
      [['①', '셀렉트', 'Select', '선택', '셀렉션', 'Selection'], ['②', '프로젝트', 'Project', '추출', '프로젝션', 'Projection'], ['③', '조인', 'Join'], ['④', '디비전', 'Division', '나누기', '나눗셈']],
      `σ 셀렉트(행 고르기), π 프로젝트(열 고르기), ⋈ 조인(합치기), ÷ 디비전(모두 가진 것)
셀렉트와 프로젝트는 릴레이션 하나에, 조인과 디비전은 두 릴레이션에 쓴다.`,
      { pre: `( ① ) : 릴레이션에서 조건을 만족하는 튜플만 골라낸다 (기호 σ)
( ② ) : 릴레이션에서 지정한 속성만 뽑아낸다. 중복 튜플은 제거된다 (기호 π)
( ③ ) : 공통 속성을 기준으로 두 릴레이션을 하나로 합친다 (기호 ⋈)
( ④ ) : 한 릴레이션이 다른 릴레이션의 모든 값과 연관된 튜플만 골라낸다 (기호 ÷)` }),
    blanks('design', '구조 패턴과 행위 패턴',
      '다음 디자인 패턴이 구조 패턴인지 행위 패턴인지 쓰시오.',
      [['① 퍼사드', '구조', '구조 패턴', 'Structural'], ['② 커맨드', '행위', '행위 패턴', 'Behavioral'], ['③ 프록시', '구조', '구조 패턴', 'Structural'], ['④ 전략', '행위', '행위 패턴', 'Behavioral']],
      `• 구조: 클래스·객체를 "어떻게 조합"할지 — 어댑터, 브리지, 컴포지트, 데코레이터, 퍼사드, 플라이웨이트, 프록시
• 행위: 객체 사이의 "책임과 소통" — 커맨드(요청을 객체로), 전략(알고리즘 교체), 옵저버, 상태, 템플릿 메서드, 반복자 …
퍼사드는 복잡한 하위 시스템 앞에 단순한 창구를 두는 패턴이다.`),
    out('c', '등수 계산', `#include <stdio.h>

int main(void) {
    int s[5] = {80, 95, 70, 95, 85};
    int rank[5];
    for (int i = 0; i < 5; i++) {
        rank[i] = 1;
        for (int j = 0; j < 5; j++)
            if (s[j] > s[i]) rank[i]++;
    }
    for (int i = 0; i < 5; i++) printf("%d ", rank[i]);
    return 0;
}
`, '4 1 5 1 3',
      `등수 = 1 + (나보다 점수가 높은 사람 수). 같은 점수는 같은 등수가 된다.
80: 95, 95, 85가 높다 → 4등 / 95: 없음 → 1등 / 70: 4명 → 5등 / 85: 95 두 명 → 3등`),
    raw({
      kind: 'subnet-div', cat: 'net', title: 'FLSM 서브넷의 브로드캐스트 주소',
      question: '192.168.50.0/24 네트워크를 FLSM 방식으로 5개의 서브넷으로 나누었다. 네 번째 서브넷의 브로드캐스트 주소를 쓰시오. (서브넷 제로 사용)',
      base: '192.168.50.0', prefix: 24, count: 5, nth: 4, ask: 'broadcast',
      explain: '5개 이상으로 나누려면 서브넷 비트가 3개 필요하다(2² = 4 < 5 ≤ 8 = 2³). /27이 되어 32개씩: .0, .32, .64, .96 … 네 번째는 192.168.50.96/27이고 브로드캐스트는 .127.',
    }),
    term('dev', '경계값 분석',
      '입력 조건의 경계값 바로 아래·경계·바로 위의 값을 테스트 케이스로 골라, 경계 부근에서 자주 생기는 오류를 찾는 블랙박스 테스트 기법을 쓰시오. (예: 1~100만 허용하면 0, 1, 100, 101을 넣는다)',
      ['경계값 분석', 'Boundary Value Analysis', '경계 값 분석', '경계값 분석 테스트', 'BVA'],
      `"< 와 <= 를 헷갈리는" 실수는 경계에서 드러난다. 동등 분할과 함께 쓰는 경우가 많다.
블랙박스: 동등 분할, 경계값 분석, 원인-결과 그래프, 오류 예측, 비교 검사 / 화이트박스: 기초 경로, 제어 구조(조건·루프·데이터 흐름) 검사`),
    sqlOut('외래키 CASCADE 뒤의 행 수',
      '[부서], [사원] 테이블(사원.부서는 부서.코드를 참조하며 ON DELETE CASCADE)에 아래 SQL을 차례로 실행했을 때 마지막 SELECT의 결과를 쓰시오.',
      `PRAGMA foreign_keys = ON;
CREATE TABLE 부서(코드 TEXT PRIMARY KEY, 이름 TEXT);
INSERT INTO 부서 VALUES ('D1', '영업'), ('D2', '개발'), ('D3', '인사');
CREATE TABLE 사원(사번 INTEGER PRIMARY KEY, 이름 TEXT, 부서 TEXT REFERENCES 부서(코드) ON DELETE CASCADE);
INSERT INTO 사원 VALUES (1, '가윤', 'D1'), (2, '나래', 'D1'), (3, '다온', 'D2'), (4, '라희', 'D3'), (5, '마루', 'D1'), (6, '바다', 'D2');`,
      'SELECT COUNT(*) FROM 사원;',
      '4',
      `• INSERT로 사원이 7명이 된다
• D1 부서를 지우면, ON DELETE CASCADE라서 D1을 참조하던 사원(가윤, 나래, 마루)도 함께 지워진다
• 7 - 3 = 4
CASCADE가 없었다면(기본 RESTRICT) 참조하는 행이 있어서 부서 삭제가 거부된다.`,
      { before: `INSERT INTO 사원 VALUES (7, '사랑', 'D2');
DELETE FROM 부서 WHERE 코드 = 'D1';` }),
    blanks('sec', '사회공학과 다크 데이터',
      '다음 설명에 해당하는 용어를 쓰시오.',
      [['①', '사회공학', 'Social Engineering', '사회 공학'], ['②', '다크 데이터', 'Dark Data']],
      `• 사회공학: 기술이 아니라 "사람"을 속인다 — 피싱, 프리텍스팅(가짜 신분), 베이팅(미끼 USB), 테일게이팅(뒤따라 출입)
• 다크 데이터: 모아 두었지만 분석·활용하지 않는 데이터 (로그, 오래된 문서 …). 저장 비용과 보안 위험이 된다`,
      { pre: `① 시스템의 기술적 취약점이 아니라 사람의 심리와 신뢰를 이용해, 비밀 정보를 알아내거나 보안 절차를 우회하게 만드는 공격 기법
② 수집되어 저장은 되어 있지만, 분석에 활용되지 않고 방치된 데이터` }),
    out('python', '람다와 map·filter', `nums = [5, 12, 7, 20, 3]
f = lambda x: x * 2 if x > 6 else x - 1
a = list(map(f, nums))
b = list(filter(lambda x: x % 4 == 0, a))
c = sorted(nums, key=lambda x: -x % 5)
print(a, b, c[0])
`, '[4, 24, 14, 40, 2] [4, 24, 40] 5',
      `• map: 6보다 크면 두 배, 아니면 1 빼기 → [4, 24, 14, 40, 2]
• filter: 4의 배수만 → [4, 24, 40]
• key의 -x % 5는 (-x) % 5다(단항 -가 먼저). 5 → 0, 12 → 3, 7 → 3, 20 → 0, 3 → 2
  키가 작은 순(같으면 원래 순서): 5, 20, 3, 12, 7 → c[0] = 5
Python의 %는 결과가 항상 0 이상이다(-12 % 5 = 3).`),
    term('sec', 'SIEM',
      `다음 설명에 해당하는 보안 솔루션을 영문 약어로 쓰시오.
방화벽, 침입 탐지 시스템, 서버, 네트워크 장비 등 여러 곳에서 나오는 보안 로그와 이벤트를 한곳에 모아 상관 관계를 분석하고, 위협을 실시간으로 탐지해 경고한다. 빅데이터 분석을 활용해 장기간의 로그도 저장·검색한다.`,
      ['SIEM', 'Security Information and Event Management', '보안 정보 및 이벤트 관리'],
      `SIEM(Security Information and Event Management). 비슷한 ESM(Enterprise Security Management)은 여러 보안 장비를 통합 "관리"하는 데 중점을 둔다.
SIEM은 로그 "수집·상관 분석"이 핵심이다.`),
    term('dev', '형상 관리 도구 고르기',
      '〈보기〉에서 형상(버전) 관리 도구를 모두 골라 기호로 쓰시오.',
      anyOrder(['ㄱ', 'ㄷ', 'ㅁ']),
      `• 형상 관리(버전 관리): Git(분산형), SVN(Subversion, 중앙 집중형), CVS(중앙 집중형)
• JUnit: Java 단위 테스트 프레임워크 / Jenkins: 지속적 통합(CI) 서버 / Ant: 빌드 도구`,
      { options: ['ㄱ. Git', 'ㄴ. JUnit', 'ㄷ. SVN', 'ㄹ. Jenkins', 'ㅁ. CVS', 'ㅂ. Ant'] }),
    sqlOut('DISTINCT 결과 튜플 수',
      '[수강] 테이블에 다음 SQL을 실행했을 때 결과 행(튜플)의 개수를 쓰시오.',
      `CREATE TABLE 수강(학번 INTEGER, 과목 TEXT, 학기 INTEGER);
INSERT INTO 수강 VALUES (1, 'DB', 1), (1, 'DB', 2), (2, 'OS', 1), (1, 'OS', 1), (2, 'OS', 2), (3, 'DB', 1), (2, 'DB', 2);`,
      'SELECT DISTINCT 학번, 과목 FROM 수강;',
      '5',
      `DISTINCT는 SELECT한 열들의 "조합"이 같은 행을 하나로 친다. 학기는 SELECT에 없으므로 무시된다.
(1, DB) (2, OS) (1, OS) (3, DB) (2, DB) → 5개`,
      { count: true }),
    out('c', '약수의 합으로 수 분류', `#include <stdio.h>

int divsum(int n) {
    int s = 0;
    for (int d = 1; d < n; d++)
        if (n % d == 0) s += d;
    return s;
}

int main(void) {
    int perfect = 0, abundant = 0, last = 0;
    for (int n = 1; n <= 30; n++) {
        int s = divsum(n);
        if (s == n) perfect++;
        else if (s > n) { abundant++; last = n; }
    }
    printf("%d %d %d", perfect, abundant, last);
    return 0;
}
`, '2 5 30',
      `자기 자신을 뺀 약수의 합 s와 n을 비교한다.
• s == n (완전수): 6, 28 → 2개 (1은 약수의 합이 0이라 아니다)
• s > n (과잉수): 12, 18, 20, 24, 30 → 5개, 마지막 30`),
    blanks('sec', '트러스트존과 타이포스쿼팅',
      '다음 설명에 해당하는 용어를 쓰시오.',
      [['①', '트러스트존', 'TrustZone', 'Trust Zone'], ['②', '타이포스쿼팅', 'Typosquatting', 'URL 하이재킹', '타이포 스쿼팅']],
      `• 트러스트존(TrustZone): ARM 프로세서의 하드웨어 보안 기술. 일반 영역(Normal World)과 보안 영역(Secure World)을 나눈다
• 타이포스쿼팅: 오타 도메인 선점 (URL 하이재킹이라고도 한다). 비슷한 것: 도메인 이름을 미리 사 두는 사이버스쿼팅`,
      { pre: `① 하나의 프로세서 안에 일반 애플리케이션이 도는 영역과 분리된 독립적인 보안 영역을 하드웨어로 만들어, 중요한 정보(지문, 결제 키)를 보호하는 기술
② 사용자가 웹 주소를 잘못 입력하는 실수(예: gooogle.com)를 노려, 비슷한 도메인을 미리 등록해 두고 가짜 사이트로 유도하는 공격` }),
    term('sec', 'SSO',
      '한 번의 로그인으로 여러 시스템이나 서비스에 별도의 재인증 없이 접근할 수 있게 하는 인증 방식을 영문 약어로 쓰시오.',
      ['SSO', 'Single Sign-On', 'Single Sign On', '통합 인증'],
      `SSO(Single Sign-On). 사용자는 편하고 비밀번호 관리가 쉬워지지만, 그 계정 하나가 뚫리면 모든 서비스가 위험해진다.
표준: SAML, OAuth 2.0 + OpenID Connect, Kerberos`),
    blanks('os', '기아 현상과 호위 효과',
      'CPU 스케줄링에서 생기는 문제에 대한 설명이다. 빈칸에 알맞은 용어를 쓰시오.',
      [['①', '기아', '기아 현상', 'Starvation', '무한 대기'], ['②', '에이징', 'Aging', '노화'], ['③', '호위 효과', 'Convoy Effect', '콘보이 효과', '호위']],
      `• 기아: SJF·우선순위 스케줄링에서 긴(낮은 우선순위) 작업이 계속 밀림 → 에이징으로 해결 (HRN이 에이징을 수식으로 넣은 방식)
• 호위 효과: FCFS에서 긴 작업 하나 뒤에 짧은 작업들이 줄줄이 기다림 → 평균 대기 시간 증가`,
      { pre: `( ① ) : 우선순위가 낮거나 실행 시간이 긴 프로세스가, 계속 들어오는 다른 프로세스에 밀려 무한히 기다리는 현상
( ② ) : ( ① )를 막기 위해, 오래 기다린 프로세스의 우선순위를 점점 높여 주는 기법
( ③ ) : FCFS에서 실행 시간이 긴 프로세스가 먼저 CPU를 잡으면, 짧은 프로세스들이 그 뒤에 줄줄이 기다리는 현상` }),
    blanks('design', 'UML 구성 요소',
      'UML에 대한 설명이다. 빈칸에 알맞은 말을 쓰시오.',
      [['①', '사물', 'Things', '사물(Things)'], ['②', '관계', 'Relationships', 'Relationship'], ['③', '다이어그램', 'Diagram'], ['④', '오퍼레이션', 'Operation', '연산', '메서드', 'Method', '동작']],
      `UML 구성 요소: 사물(구조·행동·그룹·주해 사물), 관계(연관, 집합, 포함, 일반화, 의존, 실체화), 다이어그램
클래스 표기: 맨 위 칸 클래스 이름, 가운데 칸 속성, 아래 칸 오퍼레이션`,
      { pre: `UML의 구성 요소는 모델을 이루는 대상인 ( ① ), 그것들 사이의 연관성을 표현하는 ( ② ),
그리고 이 둘을 그림으로 나타낸 ( ③ )이다.
클래스 다이어그램에서 클래스는 이름, 속성, ( ④ )의 세 칸으로 나타낸다. ( ④ )은 클래스가 수행할 수 있는 동작이다.` }),
    blanks('db', 'E-R 다이어그램 기호',
      '피터 첸(Chen)의 E-R 다이어그램 기호가 뜻하는 것을 쓰시오.',
      [['① 사각형', '개체', 'Entity', '개체 타입', '엔티티'], ['② 마름모', '관계', 'Relationship', '관계 타입'], ['③ 타원', '속성', 'Attribute'],
        ['④ 이중 사각형', '약한 개체', 'Weak Entity', '약한 개체 타입'], ['⑤ 이중 타원', '다중값 속성', '다중 값 속성', 'Multivalued Attribute', '복수값 속성']],
      `• 사각형: 개체 / 마름모: 관계 / 타원: 속성 / 선: 연결
• 이중 사각형: 약한 개체(스스로 식별 못 함) / 이중 마름모: 식별 관계
• 이중 타원: 다중값 속성 / 밑줄 친 타원: 기본키 속성 / 점선 타원: 유도 속성`),
    out('java', '배열을 돌려주는 static 메서드', `public class Main {
    static int[] make(int n) {
        int[] a = new int[n];
        for (int i = 0; i < n; i++) a[i] = i * i % 7;
        return a;
    }

    static int count(int[] a, int v) {
        int c = 0;
        for (int x : a) if (x == v) c++;
        return c;
    }

    public static void main(String[] args) {
        int[] a = make(8);
        System.out.println(a.length + " " + a[5] + " " + count(a, 2) + " " + count(make(3), 1));
    }
}
`, '8 4 2 1',
      `i * i % 7: 0, 1, 4, 9%7=2, 16%7=2, 25%7=4, 36%7=1, 49%7=0
• 배열 길이는 .length (메서드가 아니라 필드라서 괄호가 없다. 문자열은 .length())
• a[5] = 4, 값이 2인 것은 3번·4번 → 2개
• make(3) = [0, 1, 4] → 1이 1개`),
    out('java', 'continue와 break', `public class Main {
    public static void main(String[] args) {
        int a = 0, b = 0;
        for (int i = 1; i <= 10; i++) {
            if (i % 3 == 0) continue;
            if (i % 2 == 0) a += i;
            else b = i;
            if (a > 15) break;
        }
        System.out.println(a + " " + b);
    }
}
`, '24 7',
      `3의 배수(3, 6, 9)는 건너뛴다. 짝수는 a에 더하고, 홀수는 b에 넣는다(덮어씀).
i=1 b=1 / i=2 a=2 / i=4 a=6 / i=5 b=5 / i=7 b=7 / i=8 a=14 / i=10 a=24 → 15 초과라 break`),
  ]),

  round('2022-2', {
    pass: 16.11, level: 4,
    note: '프로그래밍 비중이 커지고 영어 보기 문제가 많았던 회차(합격률 16.11%). IDEA·Skipjack 같은 암호 알고리즘, SQL ALL 연산자, 2020년 1회 switch 문제의 재출제가 있었다.',
  }, [
    term('db', '관계해석',
      '관계 데이터 모델의 연산 중, 원하는 정보가 "무엇인지"만 정의하는 비절차적 방법으로, 프레디킷 해석에 기반하며 튜플 관계해석과 도메인 관계해석으로 나뉘는 것을 쓰시오.',
      ['관계해석', 'Relational Calculus', '관계 해석'],
      `• 관계대수: 절차적 — 원하는 결과를 얻는 "방법(연산 순서)"을 기술
• 관계해석: 비절차적 — 원하는 결과가 "무엇"인지만 기술 (코드(E. F. Codd)가 제안)
두 방법의 표현 능력은 같다. SQL은 둘의 영향을 함께 받았다.`),
    blanks('sec', 'IDEA와 Skipjack',
      '다음 설명에 해당하는 대칭키 블록 암호 알고리즘을 〈보기〉에서 골라 쓰시오.',
      [['①', 'IDEA', 'International Data Encryption Algorithm'], ['②', 'Skipjack', '스킵잭']],
      `• IDEA: 1990년대 스위스(라이, 메시)가 개발, 64비트 블록 / 128비트 키, PGP에서 쓰였다
• Skipjack: 미국 NSA, 64비트 블록 / 80비트 키, 음성 암호화용 클리퍼 칩
• 국내: SEED(KISA, 128비트 블록), ARIA(학·연·관, 128비트 블록)`,
      {
        pre: `① 스위스에서 개발한 블록 암호로, 64비트 블록을 128비트 키로 암호화한다. PGP에 쓰였다
② 미국 NSA가 개발해 클리퍼 칩에 넣은 블록 암호로, 64비트 블록과 80비트 키를 쓴다. 음성 통신 암호화용이다`,
        options: ['DES', 'AES', 'IDEA', 'Skipjack', 'SEED', 'RC4'],
      }),
    blanks('sql', 'ALL과 SUM',
      '다음 SQL의 빈칸에 알맞은 키워드를 쓰시오.',
      [['①', 'ALL'], ['②', 'SUM'], ['③', 'HAVING']],
      `• > ALL(서브쿼리): 서브쿼리의 "모든" 값보다 크다 = 최댓값보다 크다
• > ANY(SOME): 서브쿼리의 값 중 "하나라도"보다 크다 = 최솟값보다 크다
• 그룹 조건은 HAVING, 합계는 SUM`,
      { pre: `-- 영업 부서의 모든 사원보다 급여가 많은 사원
SELECT 이름 FROM 사원
WHERE 급여 > ( ① ) (SELECT 급여 FROM 사원 WHERE 부서 = '영업');

-- 급여 합계가 1000 이상인 부서와 그 합계
SELECT 부서, ( ② )(급여) FROM 사원
GROUP BY 부서
( ③ ) ( ② )(급여) >= 1000;` }),
    sqlOut('IN, OR와 COUNT(열)',
      '[학생] 테이블에 다음 SQL을 실행한 결과를 쓰시오.',
      `CREATE TABLE 학생(학번 INTEGER PRIMARY KEY, 이름 TEXT, 학과 TEXT, 학년 INTEGER);
INSERT INTO 학생 VALUES (1, '가윤', '전기', 1), (2, '나래', NULL, 3), (3, '다온', '컴퓨터', 4),
  (4, '라희', '전기', 2), (5, '마루', NULL, 4), (6, '바다', '기계', 1);`,
      "SELECT COUNT(학과) FROM 학생 WHERE 학년 IN (3, 4) OR 학과 = '전기';",
      '3',
      `조건에 맞는 행: 가윤(전기), 나래(3학년), 다온(4학년), 라희(전기), 마루(4학년) → 5행
COUNT(학과)는 학과가 NULL인 나래, 마루를 세지 않는다 → 3
COUNT(*)였다면 5. NULL = '전기'는 참도 거짓도 아닌 "알 수 없음"이라 조건을 통과하지 못한다.`),
    term('net', '터널링',
      'VPN에서, 보내려는 패킷을 다른 프로토콜의 패킷 안에 통째로 감싸(캡슐화) 공중망을 통과시키고, 반대편 끝에서 꺼내는 기술을 쓰시오.',
      ['터널링', 'Tunneling', '터널'],
      `터널링(Tunneling): 겉 패킷이 공중망을 지나는 동안 안쪽 패킷은 보이지 않게(암호화) 전달된다.
프로토콜: PPTP, L2TP(2계층), IPsec(3계층), SSL/TLS VPN. IPv6 패킷을 IPv4 망에 실어 보내는 것도 터널링이다.`),
    term('design', '인터페이스 분리 원칙',
      '객체지향 설계 원칙(SOLID) 중, "클라이언트는 자신이 사용하지 않는 메서드에 의존하면 안 된다"는 원칙을 〈보기〉에서 골라 쓰시오.',
      ['인터페이스 분리 원칙', 'ISP', 'Interface Segregation Principle'],
      `ISP: 큰 인터페이스 하나보다 쓰임새별로 나눈 작은 인터페이스 여러 개가 낫다.
• SRP 단일 책임: 클래스는 바뀌는 이유가 하나뿐
• OCP 개방-폐쇄: 확장에는 열리고 수정에는 닫힘
• LSP 리스코프 치환: 자식은 부모 자리에 들어가도 문제없어야 함
• DIP 의존 역전: 구체 클래스가 아니라 추상(인터페이스)에 의존`,
      { options: ['SRP', 'OCP', 'LSP', 'ISP', 'DIP'] }),
    out('java', 'switch의 fall-through', `public class Main {
    public static void main(String[] args) {
        int total = 0;
        for (int i = 0; i < 5; i++) {
            switch (i) {
                case 0:
                case 1:
                    total += 1;
                case 2:
                    total += 10;
                    break;
                case 3:
                    total += 100;
                default:
                    total += 1000;
            }
        }
        System.out.println(total);
    }
}
`, '2132',
      `break를 만날 때까지 아래 case를 계속 실행한다.
• i=0, 1: +1, +10 (break) → 각 11
• i=2: +10
• i=3: +100, 그리고 break가 없어서 default의 +1000까지 → 1100
• i=4: 맞는 case가 없어 default → +1000
11 + 11 + 10 + 1100 + 1000 = 2132`),
    out('c', '구조체 배열 다루기', `#include <stdio.h>

struct Emp { char name[10]; int age; int pay; };

int main(void) {
    struct Emp e[4] = {{"Ann", 31, 300}, {"Bob", 25, 250}, {"Cid", 42, 500}, {"Dan", 28, 280}};
    int young = 0, sum = 0;
    for (int i = 0; i < 4; i++) {
        if (e[i].age < 30) young++;
        else sum += e[i].pay;
    }
    printf("%d %d %s", young, sum, e[young].name);
    return 0;
}
`, '2 800 Cid',
      `30세 미만: Bob, Dan → 2명. 나머지(Ann 300, Cid 500)의 급여 합 → 800
e[young]은 e[2] → "Cid"`),
    raw({
      kind: 'subnet', cat: 'net', title: '서브넷의 호스트 수',
      question: 'IP 주소가 172.16.10.130이고 서브넷 마스크가 255.255.255.192일 때, 이 서브넷에서 호스트에 할당할 수 있는 IP 주소의 수를 쓰시오.',
      ip: '172.16.10.130', prefix: 26, ask: 'hosts',
      explain: '255.255.255.192는 /26 → 호스트 비트 6개 → 2⁶ = 64개 주소. 네트워크 주소(172.16.10.128)와 브로드캐스트 주소(172.16.10.191)를 빼면 62개.',
    }),
    blanks('dev', '알파 테스트와 베타 테스트',
      '인수 테스트의 종류에 대한 설명이다. 빈칸에 알맞은 테스트를 쓰시오.',
      [['①', '알파 테스트', 'Alpha Test', '알파', 'Alpha Testing'], ['②', '베타 테스트', 'Beta Test', '베타', 'Beta Testing']],
      `• 알파: 개발자의 장소, 사용자가 시험하고 개발자가 옆에서 지켜보며 기록 (통제된 환경)
• 베타: 사용자의 실제 환경, 개발자 없이 사용자가 쓰고 문제를 보고
인수 테스트 종류: 사용자, 운영상, 계약, 규정, 알파, 베타`,
      { pre: `( ① ) : 개발자의 장소에서, 사용자가 개발자 앞에서 소프트웨어를 시험하고 개발자는 문제를 기록한다
( ② ) : 선정된 실제 사용자들이 자신의 환경에서 개발자 없이 소프트웨어를 쓰며 문제를 찾아 보고한다` }),
    term('dev', '회귀 테스트',
      '오류를 고치거나 기능을 수정한 뒤, 그 수정 때문에 원래 잘 되던 다른 부분에 새로운 오류가 생기지 않았는지 다시 확인하는 테스트를 〈보기〉에서 골라 쓰시오.',
      ['회귀 테스트', 'Regression Test', 'Regression Testing', '회귀'],
      `회귀(Regression) 테스트는 "고쳤더니 다른 데가 망가지는" 문제를 잡는다. 자동화된 테스트로 자주 돌린다.
• 회복 테스트: 고장을 일부러 내고 복구되는지 / 안전 테스트: 보안 / 강도 테스트: 과부하 / 성능 테스트: 응답 시간·처리량`,
      { options: ['회복 테스트', '안전 테스트', '강도 테스트', '회귀 테스트', '병행 테스트'] }),
    term('db', '프로젝트 결과 튜플 수',
      '다음 [학생] 릴레이션에 관계 대수 π학과,학년(학생)을 수행한 결과의 튜플 수를 쓰시오.',
      ['4'],
      `π는 지정한 속성 (학과, 학년)만 뽑고, 관계 대수의 결과는 집합이라 중복 튜플이 사라진다.
(컴퓨터, 1) (컴퓨터, 2) (전자, 1) (컴퓨터, 1)중복 (전자, 1)중복 (기계, 3) → 4개`,
      { tables: [{ name: '학생', cols: ['학번', '이름', '학과', '학년'], rows: [[1, '가윤', '컴퓨터', 1], [2, '나래', '컴퓨터', 2], [3, '다온', '전자', 1], [4, '라희', '컴퓨터', 1], [5, '마루', '전자', 1], [6, '바다', '기계', 3]] }] }),
    out('python', '슬라이싱과 % 서식', `s = "CodeStep2022"
a = s[:4].upper()
b = s[4:-4][::-1]
n = int(s[-2:]) % 7
print("%s-%s:%d" % (a, b, n), "%.2f" % (n / 3))
`, 'CODE-petS:1 0.33',
      `• s[:4] = "Code" → 대문자 "CODE"
• s[4:-4] = "Step" (뒤의 4글자 "2022" 앞까지) → 뒤집으면 "petS"
• s[-2:] = "22" → 22 % 7 = 1
• "%.2f" % (1 / 3) → 0.33
% 서식: %s 문자열, %d 정수, %.2f 소수 둘째 자리`),
    blanks('net', '라우팅 프로토콜 분류',
      '라우팅 프로토콜에 대한 설명이다. 빈칸에 알맞은 말을 〈보기〉에서 골라 쓰시오.',
      [['①', 'IGP', 'Interior Gateway Protocol', '내부 라우팅 프로토콜'], ['②', 'EGP', 'Exterior Gateway Protocol', '외부 라우팅 프로토콜'], ['③', 'OSPF'], ['④', 'BGP', 'Border Gateway Protocol']],
      `• IGP(AS 안): RIP(거리 벡터), OSPF(링크 상태), IGRP·EIGRP
• EGP(AS 사이): BGP — 인터넷 백본에서 ISP끼리 경로를 교환한다`,
      {
        pre: `하나의 자율 시스템(AS) 안에서 쓰는 라우팅 프로토콜을 ( ① ), AS와 AS 사이에서 쓰는 것을 ( ② )라 한다.
( ① ) 중 링크 상태 방식으로 다익스트라 알고리즘을 쓰는 대표 프로토콜은 ( ③ )이고,
( ② )의 대표 프로토콜은 ( ④ )이다.`,
        options: ['IGP', 'EGP', 'RIP', 'OSPF', 'BGP'],
      }),
    out('c', '포인터로 문자열 길이 구하기', `#include <stdio.h>

int len(const char *s) {
    const char *p = s;
    while (*p) p++;
    return p - s;
}

int main(void) {
    char a[] = "pointer";
    char *b = a + 2;
    printf("%d %d %d", len(a), len(b), len(b + len(b) - 1));
    return 0;
}
`, '7 5 1',
      `p를 NUL까지 옮긴 뒤 시작 주소와의 차이(p - s)가 글자 수다(strlen과 같다).
• a = "pointer" → 7
• b = a + 2 → "inter" → 5
• b + 4 → "r" → 1`),
    out('c', '포인터 산술과 누적', `#include <stdio.h>

int main(void) {
    int a[] = {3, 1, 4, 1, 5, 9, 2, 6};
    int *p = a;
    int s = 0;
    for (int i = 0; i < 4; i++) {
        s += *(p + i * 2) - *(p + i * 2 + 1);
    }
    p += 3;
    printf("%d %d %d", s, *p + p[2], (int)(&a[7] - p));
    return 0;
}
`, '-3 10 4',
      `두 개씩 짝지어 앞 - 뒤: (3 - 1) + (4 - 1) + (5 - 9) + (2 - 6) = 2 + 3 - 4 - 4 = -3
p += 3 → a[3]. *p = 1, p[2] = a[5] = 9 → 10
&a[7] - p = 7 - 3 = 4 (포인터 차이는 원소 수)`),
    out('java', '생성자와 참조 공유', `class Car {
    String name;
    int speed;
    Car(String name) { this(name, 10); }
    Car(String name, int speed) { this.name = name; this.speed = speed; }
    void up(int d) { speed += d; }
    String info() { return name + speed; }
}

public class Main {
    public static void main(String[] args) {
        Car a = new Car("K");
        Car b = new Car("S", 50);
        Car c = a;
        c.up(5);
        a.speed *= 2;
        b.name = a.name + b.name;
        System.out.println(a.info() + " " + b.info() + " " + c.info());
    }
}
`, 'K30 KS50 K30',
      `• new Car("K")는 this(name, 10)로 다른 생성자를 불러 speed가 10
• c = a는 객체를 복사하지 않고 같은 객체를 가리킨다 → c.up(5)로 a.speed 15, 다시 ×2 → 30
• b.name = "K" + "S" = "KS"
• c는 a와 같은 객체 → "K30"`),
    blanks('db', '함수 종속의 종류',
      '[수강](학번, 과목코드, 성적, 이름, 학과, 학과장) 릴레이션에 대한 설명이다. 빈칸에 알맞은 함수 종속을 쓰시오. (기본키: 학번 + 과목코드)',
      [['①', '완전 함수 종속', '완전 함수적 종속', '완전 종속', 'Full Functional Dependency'], ['②', '부분 함수 종속', '부분 함수적 종속', '부분 종속', 'Partial Functional Dependency'], ['③', '이행 함수 종속', '이행적 함수 종속', '이행 종속', 'Transitive Dependency']],
      `• 완전: 기본키 "전체"가 있어야 결정된다 → 2NF에서 남는 것
• 부분: 기본키의 "일부"로 결정된다 → 2NF에서 제거
• 이행: X → Y → Z처럼 다른 속성을 거쳐 결정된다 → 3NF에서 제거
BCNF는 모든 결정자가 후보키여야 한다.`,
      { pre: `① (학번, 과목코드) → 성적 : 기본키 전체에 의해서만 결정된다
② 학번 → 이름 : 기본키의 일부만으로 결정된다
③ 학번 → 학과, 학과 → 학과장 이므로 학번 → 학과장 : 다른 속성을 거쳐 결정된다` }),
    blanks('net', '하이퍼텍스트, HTTP, HTML',
      '웹 기술에 대한 설명이다. 빈칸에 알맞은 말을 〈보기〉에서 골라 쓰시오.',
      [['①', '하이퍼텍스트', 'Hypertext', 'HyperText'], ['②', 'HTTP', 'Hypertext Transfer Protocol', 'HyperText Transfer Protocol'], ['③', 'HTML', 'Hypertext Markup Language', 'HyperText Markup Language']],
      `• 하이퍼텍스트: 링크로 문서와 문서를 연결한 텍스트
• HTTP: 하이퍼텍스트를 주고받는 응용 계층 프로토콜 (기본 포트 80, 암호화한 HTTPS는 443)
• HTML: 하이퍼텍스트 문서를 만드는 마크업 언어 (태그로 구조를 표시)`,
      {
        pre: `( ① ) : 문서 안의 특정 단어나 그림을 누르면 연결된 다른 문서로 이동할 수 있게, 링크로 서로 연결된 텍스트
( ② ) : 웹 브라우저와 웹 서버가 ( ① ) 문서를 주고받을 때 쓰는 통신 규약
( ③ ) : 태그를 써서 ( ① ) 문서의 구조를 표현하는 언어`,
        options: ['하이퍼텍스트', 'HTTP', 'HTML', 'URL', 'XML', 'FTP'],
      }),
    blanks('design', '팬인과 팬아웃',
      '다음 모듈 구조도에서 ① 모듈 F의 팬인(Fan-In)과 ② 모듈 D의 팬아웃(Fan-Out)을 쓰시오.',
      [['① F의 팬인', '3'], ['② D의 팬아웃', '2']],
      `• 팬인: 나를 호출(상위에서 나에게 들어옴)하는 모듈 수 → F를 부르는 것은 B, C, D → 3
• 팬아웃: 내가 호출하는 모듈 수 → D가 부르는 것은 F, G → 2
팬인이 높으면 재사용이 잘 된 것이고, 팬아웃이 너무 높으면 모듈을 나눌 필요가 있다.`,
      { pre: `호출 관계 (화살표: 호출하는 쪽 → 호출되는 쪽)
A → B    A → C    A → D
B → E    B → F
C → F
D → F    D → G` }),
  ]),

  round('2022-1', {
    pass: 25.6, level: 3,
    note: 'TKIP·RAID·ISMS·워터링 홀처럼 그때까지 잘 나오지 않던 실무·보안 용어가 나와 까다로웠던 회차. 코드는 재귀·소수·자릿수 뒤집기처럼 평이한 편이었다.',
  }, [
    term('os', 'RAID 0',
      '여러 디스크에 데이터를 나눠서(스트라이핑) 동시에 저장해 속도를 높이지만, 중복 저장이 없어 디스크 하나만 고장 나도 전체 데이터를 잃는 RAID 레벨을 쓰시오.',
      ['RAID 0', 'RAID-0', 'RAID0', '레이드 0'],
      `• RAID 0: 스트라이핑 (빠름, 안정성 없음)
• RAID 1: 미러링 (같은 데이터를 두 디스크에, 용량 절반)
• RAID 5: 스트라이핑 + 패리티 분산 (디스크 1개 고장까지 복구)
• RAID 6: 패리티 2개 (2개 고장까지)`),
    blanks('db', '로그 기반 회복',
      '로그를 이용한 데이터베이스 회복 기법에 대한 설명이다. 빈칸에 알맞은 연산을 영문으로 쓰시오.',
      [['①', 'REDO', '재실행', 'Redo'], ['②', 'UNDO', '취소', 'Undo']],
      `• 장애 전에 커밋된 트랜잭션 → REDO (로그를 보고 다시 반영)
• 커밋되지 않은 트랜잭션 → UNDO (로그의 이전 값으로 되돌림)
즉시 갱신 기법은 REDO·UNDO 모두, 지연 갱신 기법은 REDO만 쓴다(커밋 전에는 DB에 쓰지 않으므로).`,
      { pre: `장애가 났을 때, 로그에 시작(start)과 완료(commit)가 모두 기록된 트랜잭션은 ( ① )를 수행해 변경 내용을 다시 반영하고,
시작만 기록되고 완료가 기록되지 않은 트랜잭션은 ( ② )를 수행해 변경 전의 값으로 되돌린다.` }),
    term('db', '삭제 이상',
      '정규화가 덜 된 릴레이션에서, 튜플 하나를 삭제할 때 원하지 않는 다른 정보까지 함께 삭제되는 현상을 쓰시오. (예: 한 과목만 듣던 학생의 수강 기록을 지우자 그 학생의 학과 정보까지 사라진다)',
      ['삭제 이상', 'Deletion Anomaly', '삭제이상'],
      `이상 현상(Anomaly) 3가지
• 삽입 이상: 원하지 않는 정보까지 함께 넣어야 한다 (수강하지 않은 학생은 넣을 수 없음)
• 삭제 이상: 원하지 않는 정보까지 함께 지워진다
• 갱신 이상: 중복된 값 중 일부만 바뀌어 불일치가 생긴다
정규화로 릴레이션을 나눠 해결한다.`),
    term('sec', 'TKIP',
      `다음 설명에 해당하는 무선 랜 보안 프로토콜을 영문 약어로 쓰시오.
취약한 WEP를 보완하기 위해 WPA에서 쓴 암호 프로토콜로, 기존 하드웨어를 그대로 쓰면서 패킷마다 암호화 키를 바꾸고 메시지 무결성 검사(MIC)를 추가했다.`,
      ['TKIP', 'Temporal Key Integrity Protocol'],
      `무선 랜 보안의 흐름: WEP(취약) → WPA(TKIP) → WPA2(AES 기반 CCMP) → WPA3(SAE)
TKIP도 지금은 취약하다고 보아 쓰지 않는다.`),
    term('design', 'NUI',
      '키보드나 마우스 같은 도구 없이, 사람의 말·몸짓·터치·시선 같은 자연스러운 행동으로 기기를 조작하는 사용자 인터페이스를 영문 약어로 쓰시오.',
      ['NUI', 'Natural User Interface'],
      `• CLI: 명령어를 입력 / GUI: 그래픽(아이콘·마우스) / NUI: 자연스러운 동작(음성·제스처)
• OUI(Organic UI): 모든 사물이 입출력 장치가 되는 유기적 인터페이스`),
    blanks('dev', '정적 분석과 동적 분석',
      '소스 코드 분석 기법에 대한 설명이다. 빈칸에 알맞은 말을 쓰시오.',
      [['①', '정적 분석', 'Static Analysis', '정적', '정적 테스트'], ['②', '동적 분석', 'Dynamic Analysis', '동적', '동적 테스트']],
      `• 정적 분석: 실행하지 않고 코드만 본다 — 코딩 규칙 위반, 잠재적 결함 (도구: PMD, Checkstyle, SonarQube, cppcheck)
• 동적 분석: 실행하며 본다 — 메모리 누수, 스레드 결함, 성능 (도구: Valgrind, Avalanche)`,
      { pre: `( ① ) : 프로그램을 실행하지 않고 소스 코드를 분석해 코딩 표준 위반이나 결함 가능성을 찾는다
( ② ) : 프로그램을 실제로 실행하면서 메모리 누수, 스레드 결함 같은 실행 중 문제를 찾는다` }),
    term('dev', 'JUnit',
      'Java로 단위 테스트를 작성하고 실행하는 xUnit 계열의 테스트 프레임워크를 쓰시오. (@Test 어노테이션과 assertEquals 같은 검증 메서드를 쓴다)',
      ['JUnit', '제이유닛', 'J Unit'],
      `xUnit 계열: JUnit(Java), NUnit(.NET), CppUnit(C++), PyUnit(Python의 unittest)
그 밖의 테스트 도구: Selenium(웹 UI), FitNesse(웹 기반 테스트 케이스), STAF, watir`),
    term('dev', '블랙박스 기법 고르기',
      '〈보기〉에서 블랙박스 테스트 기법을 모두 골라 기호로 쓰시오.',
      anyOrder(['ㄱ', 'ㄷ', 'ㅁ']),
      `• 블랙박스(명세 기반): 경계값 분석, 동등 분할, 원인-결과 그래프, 오류 예측, 비교 검사
• 화이트박스(구조 기반): 구문·결정·조건 커버리지, 기초 경로 검사, 루프 검사, 데이터 흐름 검사`,
      { options: ['ㄱ. 경계값 분석', 'ㄴ. 구문 커버리지', 'ㄷ. 동등 분할', 'ㄹ. 기초 경로 검사', 'ㅁ. 원인-결과 그래프', 'ㅂ. 조건 커버리지'] }),
    term('sec', '정보보호 관리체계 인증',
      '기업이 정보 자산을 보호하기 위한 관리 체계(정책, 조직, 위험 관리, 대책)를 수립·운영하는지 인증 기관이 심사해 인증해 주는 국내 제도를 영문 약어 4글자로 쓰시오.',
      ['ISMS', 'Information Security Management System'],
      `ISMS(Information Security Management System). 개인정보 보호까지 함께 심사하는 것이 ISMS-P다.
국제 표준은 ISO/IEC 27001이다.`),
    blanks('db', '키의 성질',
      '키에 대한 설명이다. 빈칸에 알맞은 성질을 쓰시오.',
      [['①', '유일성', 'Uniqueness'], ['②', '최소성', 'Minimality', '최소']],
      `• 유일성: 키 값으로 튜플을 하나만 찾을 수 있다
• 최소성: 꼭 필요한 최소한의 속성으로만 이루어진다
슈퍼키 = 유일성, 후보키 = 유일성 + 최소성. 예: (학번, 이름)은 슈퍼키지만 학번만으로 충분하므로 후보키가 아니다.`,
      { pre: `슈퍼키는 릴레이션의 모든 튜플을 서로 구별할 수 있는 ( ① )을 만족한다.
후보키는 ( ① )과 함께, 키를 이루는 속성 중 하나라도 빼면 ( ① )을 잃는 ( ② )까지 만족한다.` }),
    term('sec', '워터링 홀 공격',
      '공격 대상이 자주 방문하는 웹사이트를 미리 감염시켜 두고, 대상이 그 사이트에 접속하면 악성코드에 감염되도록 기다리는 표적 공격 기법을 쓰시오.',
      ['워터링 홀', 'Watering Hole', '워터링홀'],
      `대상에게 직접 메일을 보내는 스피어 피싱과 달리, 대상이 스스로 찾아오는 "길목"을 노린다. APT 공격의 침투 단계에서 쓰인다.`),
    blanks('dev', 'V-모델',
      'V-모델은 개발 단계와 테스트 단계를 짝지어 검증한다. 빈칸에 알맞은 테스트를 쓰시오.',
      [['①', '인수 테스트', 'Acceptance Test', '인수'], ['②', '시스템 테스트', 'System Test', '시스템'], ['③', '통합 테스트', 'Integration Test', '통합'], ['④', '단위 테스트', 'Unit Test', '단위']],
      `V의 왼쪽(내려가며 개발)과 오른쪽(올라가며 테스트)이 마주 본다.
요구사항 ↔ 인수 / 분석·시스템 설계 ↔ 시스템 / 아키텍처(설계) ↔ 통합 / 상세 설계·코딩 ↔ 단위
단위 → 통합 → 시스템 → 인수 순서로 테스트한다.`,
      { pre: `요구사항 분석 ─────────── ( ① )
   시스템 설계 ─────── ( ② )
      상세 설계 ──── ( ③ )
         코딩 ─── ( ④ )` }),
    sqlWrite('정렬 조건 두 개',
      '[학생] 테이블에서 학년이 3 이상인 학생의 이름과 점수를 조회하되, 점수가 높은 순으로, 점수가 같으면 이름 가나다순으로 정렬하는 SQL을 쓰시오.',
      `CREATE TABLE 학생(학번 INTEGER PRIMARY KEY, 이름 TEXT, 학년 INTEGER, 점수 INTEGER);
INSERT INTO 학생 VALUES (1, '최유나', 3, 88), (2, '김하늘', 4, 92), (3, '박서준', 2, 95), (4, '이도윤', 3, 88),
  (5, '정민호', 4, 70), (6, '강지우', 3, 92);`,
      'SELECT 이름, 점수 FROM 학생 WHERE 학년 >= 3 ORDER BY 점수 DESC, 이름 ASC;',
      `ORDER BY에 여러 기준을 쉼표로 이어 쓰면 앞의 것이 같을 때 뒤의 것으로 정렬한다. ASC는 생략할 수 있다.
결과: 강지우 92, 김하늘 92, 이도윤 88, 최유나 88, 정민호 70 (박서준은 2학년이라 빠진다)
이 문제는 쓴 SQL을 실제로 실행해 행과 "순서"까지 같으면 정답이다.`),
    blanks('python', '리스트 메서드',
      'Python 리스트 메서드에 대한 설명이다. 빈칸에 알맞은 메서드 이름을 쓰시오.',
      [['①', 'extend', 'extend()'], ['②', 'pop', 'pop()'], ['③', 'reverse', 'reverse()']],
      `• append(x): x 하나를 끝에 추가 / extend(리스트): 리스트의 원소들을 끝에 이어 붙임
• pop(i): i번(생략하면 마지막) 원소를 꺼내 돌려주고 삭제 / remove(x): 값이 x인 첫 원소 삭제
• reverse(): 제자리에서 뒤집기 / sort(): 제자리 정렬 / insert(i, x), index(x), count(x)`,
      { pre: `( ① ) : 다른 리스트의 모든 원소를 리스트 끝에 이어 붙인다  예) [1, 2].( ① )([3, 4]) → [1, 2, 3, 4]
( ② ) : 지정한 위치의 원소를 꺼내 돌려주고 리스트에서 지운다  예) a.( ② )(0)
( ③ ) : 리스트의 원소 순서를 제자리에서 거꾸로 뒤집는다` }),
    out('python', '기본 인자와 가변 객체', `def f(a, b=2, c=None):
    if c is None:
        c = []
    c.append(a * b)
    return c


def g(x, acc=[]):
    acc.append(x)
    return len(acc)


r1 = f(3)
r2 = f(1, 5, r1)
print(r1, r2 is r1, g(1), g(2), g(3, []))
`, '[6, 5] True 1 2 1',
      `• f(3): b는 기본값 2 → [6]
• f(1, 5, r1): c로 r1 자체를 넘겨 그 리스트에 5를 붙인다 → r1이 [6, 5], 돌려준 것도 같은 객체라 is는 True
• 함정: 기본값 []은 함수를 정의할 때 "한 번만" 만들어진다. g(1), g(2)는 같은 리스트에 쌓여 1, 2
• g(3, [])는 새 리스트를 넘겼으니 1
그래서 가변 객체 기본값은 None으로 두고 함수 안에서 만든다(f처럼).`),
    fill('java', 'Runnable과 Thread',
      'Runnable을 구현한 작업을 새 스레드에서 실행하려고 한다. 빈칸 ①, ②에 알맞은 말을 쓰시오. 빈칸을 채우면 5가 출력된다.',
      `class Task implements Runnable {
    int n;
    Task(int n) { this.n = n; }
    public void run() { Main.sum += n; }
}

public class Main {
    static int sum = 0;

    public static void main(String[] args) throws InterruptedException {
        Task task = new Task(5);
        Thread t = new ①(task);
        t.②();
        t.join();
        System.out.println(sum);
    }
}
`, [['①', 'Thread'], ['②', 'start']], '5',
      `Runnable 객체를 Thread 생성자에 넘기고 start()를 부르면 새 스레드가 만들어져 run()이 실행된다.
run()을 직접 부르면 새 스레드 없이 지금 스레드에서 그냥 메서드가 실행될 뿐이다(출력은 같지만 스레드가 아니다).
join()은 그 스레드가 끝날 때까지 기다린다.`),
    out('java', '객체 참조와 메서드', `class Box {
    int v;
    Box(int v) { this.v = v; }
}

public class Main {
    static void inc(Box b) { b.v++; }
    static void swap(Box a, Box b) { Box t = a; a = b; b = t; }
    static Box reset(Box b) { b = new Box(0); return b; }

    public static void main(String[] args) {
        Box x = new Box(1), y = new Box(10);
        inc(x);
        swap(x, y);
        Box z = reset(y);
        inc(z);
        System.out.println(x.v + " " + y.v + " " + z.v);
    }
}
`, '2 10 1',
      `Java는 참조값을 복사해 넘긴다.
• inc(x): 같은 객체의 필드를 고침 → x.v = 2
• swap: 매개변수끼리만 바꿀 뿐 x, y는 그대로
• reset(y): 매개변수 b가 새 객체를 가리키게 될 뿐 y는 그대로 10, 새 객체(0)를 돌려받은 z → inc → 1`),
    out('c', '재귀 팩토리얼과 호출 횟수', `#include <stdio.h>

int calls = 0;

long fact(int n) {
    calls++;
    if (n <= 1) return 1;
    return n * fact(n - 1);
}

int main(void) {
    long a = fact(5);
    long b = fact(3) + fact(0);
    printf("%ld %ld %d", a, b, calls);
    return 0;
}
`, '120 7 9',
      `fact(5) = 5 × 4 × 3 × 2 × 1 = 120, 호출은 fact(5)~fact(1) 5번
fact(3) = 6 (3번), fact(0) = 1 (1번) → b = 7
calls는 전역 변수라 계속 쌓인다: 5 + 3 + 1 = 9`),
    fill('c', '자릿수 뒤집기',
      '정수의 자릿수를 거꾸로 뒤집는 코드다. 빈칸 ①~③에 알맞은 연산자를 쓰시오. 빈칸을 채우면 4321이 출력된다.',
      `#include <stdio.h>

int main(void) {
    int n = 12340, r = 0;
    while (n ① 0) {
        r = r * 10 + n ② 10;
        n = n ③ 10;
    }
    printf("%d", r);
    return 0;
}
`, [['①', '>', '!='], ['②', '%'], ['③', '/']], '4321',
      `n % 10은 마지막 자리, n / 10은 마지막 자리를 뗀 수다.
12340 → r: 0 → 4 → 43 → 432 → 4321 (맨 끝의 0은 앞자리 0이 되어 사라진다)
n이 0이 되면 멈춘다(> 0 또는 != 0).`),
    out('c', '소수 판별', `#include <stdio.h>

int isPrime(int n) {
    if (n < 2) return 0;
    for (int i = 2; i * i <= n; i++)
        if (n % i == 0) return 0;
    return 1;
}

int main(void) {
    int cnt = 0, sum = 0;
    for (int n = 1; n <= 30; n++)
        if (isPrime(n)) { cnt++; sum += n; }
    printf("%d %d", cnt, sum);
    return 0;
}
`, '10 129',
      `i * i <= n까지만 나눠 보면 된다(약수는 √n을 기준으로 짝을 이룬다).
30 이하의 소수: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 → 10개, 합 129
1은 소수가 아니다(n < 2에서 걸러진다).`),
  ]),
];
