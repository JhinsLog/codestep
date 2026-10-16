// 2024년 회차. 문항 개념은 공개된 복원 자료의 개념 목록을 참고했다 (지문·코드는 새로 씀).
import { blanks, out, raw, round, sqlOut, term } from '../build';

export const Y2024 = [
  round('2024-3', {
    pass: 20.71, level: 4,
    note: '이론은 평이했지만 코딩이 매우 어려웠던 회차. Java 생성자 체인·제네릭·문자열 비교, C 이중 포인터와 연결 리스트, 3중 중첩 쿼리가 나왔고 URL 구조를 묻는 문제가 처음 나왔다.',
  }, [
    out('java', '문자열 비교 ==와 equals', `public class Main {
    public static void main(String[] args) {
        String a = "java";
        String b = "java";
        String c = new String("java");
        String d = c.intern();
        String[] arr = {a, c, "ja" + "va"};
        int cnt = 0;
        for (String s : arr) if (s == a) cnt++;
        System.out.println((a == b) + " " + (a == c) + " " + a.equals(c) + " " + (a == d) + " " + cnt);
    }
}
`, 'true false true true 2',
      `==는 "같은 객체인가(주소)", equals는 "내용이 같은가"를 비교한다.
• 문자열 리터럴은 상수 풀에 하나만 만들어져 a와 b가 같은 객체 → true
• new String은 새 객체 → a == c는 false, 내용은 같아 equals는 true
• intern()은 상수 풀의 객체를 돌려준다 → a == d는 true
• "ja" + "va"는 컴파일할 때 "java"로 합쳐진 상수라 풀의 a와 같다 → a, "ja"+"va" 두 개`),
    out('python', '리스트 교환과 음수 인덱스', `a = [4, 9, 2, 7, 5, 1]
a[0], a[-1] = a[-1], a[0]
a[1], a[-2] = a[-2], a[1]
print(a, sum(a[:3]) - sum(a[-3:]), a[-4])
`, '[1, 5, 2, 7, 9, 4] -12 2',
      `x, y = y, x는 오른쪽을 먼저 다 계산한 뒤 넣어서 두 값을 맞바꾼다.
처음과 끝 교환 → [1, 9, 2, 7, 5, 4], 1번과 뒤에서 두 번째(4번) 교환 → [1, 5, 2, 7, 9, 4]
앞 3개 합 8 - 뒤 3개 합 20 = -12, a[-4]는 뒤에서 네 번째 = 2`),
    term('net', '애드혹 네트워크',
      `다음 설명에 해당하는 네트워크를 쓰시오.
기지국이나 무선 공유기(AP) 같은 고정된 기반 시설 없이, 무선 단말기(노드)끼리 직접 연결해 스스로 구성하는 네트워크다. 노드가 움직이면 연결 구조(토폴로지)가 계속 바뀌며, 각 노드가 라우터 역할도 한다. 재난 현장, 군사 작전 등에 쓰인다.`,
      ['애드혹 네트워크', 'Ad-hoc Network', '애드혹', 'Ad hoc', 'Ad-hoc', 'MANET'],
      `애드혹(Ad-hoc) 네트워크. 노드가 이동하는 경우를 특히 MANET(Mobile Ad-hoc Network)이라 한다.
비슷한 신기술 용어: 메시 네트워크(노드가 그물처럼 연결, 대규모 디바이스), WSN(센서 네트워크), 피코넷(블루투스).`),
    raw({
      kind: 'paging', cat: 'os', title: 'LRU 페이지 부재 횟수',
      question: '페이지 프레임이 3개이고 처음에는 모두 비어 있다. 다음 순서로 페이지를 참조할 때 LRU 기법의 페이지 부재 횟수를 쓰시오.',
      refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2], frames: 3, algo: 'LRU',
      explain: 'LRU는 가장 오랫동안 사용하지 않은 페이지를 교체한다. 적중했을 때도 그 페이지의 "마지막 사용 시각"이 갱신된다는 점이 FIFO와 다르다. 처음 비어 있는 프레임을 채우는 것도 부재로 센다.',
    }),
    term('sec', '스머프 공격',
      `다음 설명에 해당하는 서비스 거부(DoS) 공격을 쓰시오.
공격자가 출발지 IP를 피해자의 IP로 위조한 ICMP Echo Request(ping)를 네트워크의 브로드캐스트 주소로 보낸다. 그러면 그 네트워크의 모든 호스트가 피해자에게 Echo Reply를 한꺼번에 보내 피해자의 회선과 시스템이 마비된다.`,
      ['스머프', 'Smurf', '스머핑', 'Smurfing', '스머프 공격'],
      `브로드캐스트로 응답을 "증폭"시키는 것이 핵심이다. 대응: 라우터에서 외부의 브로드캐스트 ping(directed broadcast)을 막는다.
비교: SYN 플러딩(반쯤 열린 TCP 연결), 랜드 어택(출발지 = 목적지), 티어드롭(IP 조각 오프셋 조작), Ping of Death(아주 큰 ICMP).`),
    out('c', '이중 포인터로 포인터 옮기기', `#include <stdio.h>

void move(int **pp, int k) {
    *pp += k;
}

int main(void) {
    int a[] = {10, 20, 30, 40, 50};
    int *p = a;
    int **pp = &p;
    move(pp, 2);
    **pp += 5;
    move(&p, -1);
    printf("%d %d %d", *p, a[2], *(*pp + 3));
    return 0;
}
`, '20 35 50',
      `pp는 p의 주소다. *pp는 p 자체, **pp는 p가 가리키는 값.
• move(pp, 2): p를 두 칸 옮김 → a[2]
• **pp += 5: a[2] = 35
• move(&p, -1): p를 한 칸 뒤로 → a[1]
• *p = 20, *(*pp + 3)은 p + 3 = a[4] = 50`),
    term('net', 'VPN',
      `다음 설명에 해당하는 것을 영문 약어로 쓰시오.
인터넷 같은 공중망 위에 암호화된 터널을 만들어, 떨어진 지점끼리 마치 전용선으로 연결된 사설망처럼 안전하게 통신하게 한다. 재택근무자가 회사 내부망에 접속할 때 많이 쓰며, IPsec이나 SSL/TLS 방식으로 구현한다.`,
      ['VPN', 'Virtual Private Network', '가상 사설망', '가상 사설 네트워크'],
      `VPN(Virtual Private Network, 가상 사설망). 계층별로 PPTP·L2TP(2계층), IPsec(3계층), SSL VPN(4계층 이상)이 있다.`),
    blanks('design', '디자인 패턴 분류',
      'GoF 디자인 패턴은 목적에 따라 생성, 구조, 행위 패턴으로 나뉜다. 각 패턴이 속하는 분류를 쓰시오.',
      [['① 옵저버', '행위', '행위 패턴', 'Behavioral'], ['② 데코레이터', '구조', '구조 패턴', 'Structural'], ['③ 빌더', '생성', '생성 패턴', 'Creational'],
        ['④ 스테이트', '행위', '행위 패턴', 'Behavioral'], ['⑤ 컴포지트', '구조', '구조 패턴', 'Structural']],
      `• 생성(5): 추상 팩토리, 빌더, 팩토리 메서드, 프로토타입, 싱글톤
• 구조(7): 어댑터, 브리지, 컴포지트, 데코레이터, 퍼사드, 플라이웨이트, 프록시
• 행위(11): 책임 연쇄, 커맨드, 인터프리터, 반복자, 중재자, 메멘토, 옵저버, 상태, 전략, 템플릿 메서드, 방문자`),
    blanks('dev', '커버리지 종류',
      '화이트박스 테스트의 커버리지에 대한 설명이다. 빈칸에 알맞은 커버리지를 쓰시오.',
      [['①', '구문 커버리지', '문장 커버리지', 'Statement Coverage', '구문', '문장'], ['②', '결정 커버리지', '분기 커버리지', 'Decision Coverage', 'Branch Coverage', '결정', '분기'],
        ['③', '조건 커버리지', 'Condition Coverage', '조건']],
      `강도: 구문 < 결정 < 조건/결정 < 변경 조건/결정(MC/DC) < 다중 조건
결정 커버리지는 if (a > 0 && b > 0) "전체"의 참·거짓을, 조건 커버리지는 a > 0, b > 0 "각각"의 참·거짓을 본다.`,
      { pre: `( ① ) : 프로그램의 모든 문장을 적어도 한 번씩 실행한다
( ② ) : 각 결정문(if, while 등)의 전체 결과가 참과 거짓을 적어도 한 번씩 갖게 한다
( ③ ) : 결정문 안의 각 개별 조건식이 참과 거짓을 적어도 한 번씩 갖게 한다` }),
    blanks('db', '키의 종류',
      '관계 데이터베이스의 키에 대한 설명이다. 빈칸에 알맞은 키를 쓰시오.',
      [['①', '후보키', 'Candidate Key', '후보 키'], ['②', '대체키', 'Alternate Key', '대체 키', '보조키'], ['③', '슈퍼키', 'Super Key', '슈퍼 키'], ['④', '외래키', 'Foreign Key', '외부키', 'FK']],
      `• 유일성: 키 값으로 튜플을 하나만 찾을 수 있다 / 최소성: 꼭 필요한 속성만으로 이루어진다
• 슈퍼키: 유일성만 / 후보키: 유일성 + 최소성 / 기본키: 후보키 중 선택한 하나 / 대체키: 나머지 후보키
• 외래키: 다른 릴레이션의 기본키를 참조`,
      { pre: `( ① ) : 튜플을 유일하게 식별할 수 있는 속성들 중 유일성과 최소성을 모두 만족하는 것
( ② ) : ( ① ) 중에서 기본키로 선택되지 않은 나머지
( ③ ) : 유일성은 만족하지만 최소성은 만족하지 않을 수 있는 속성의 집합
( ④ ) : 다른 릴레이션의 기본키를 참조해 두 릴레이션을 연결하는 속성` }),
    out('java', '생성자 체인과 오버라이딩', `class Base {
    int x;
    Base() { this(5); System.out.print("B0 "); }
    Base(int x) { this.x = x; System.out.print("B" + x + " "); }
    int get() { return x; }
}

class Sub extends Base {
    int x = 20;
    Sub() { System.out.print("S "); }
    Sub(int x) { super(x * 2); this.x = x; System.out.print("S" + x + " "); }
    @Override
    int get() { return x + super.get(); }
}

public class Main {
    public static void main(String[] args) {
        Base a = new Sub();
        Base b = new Sub(3);
        System.out.println(a.get() + b.get());
    }
}
`, 'B5 B0 S B6 S3 34',
      `• new Sub(): Sub()에는 super()가 숨어 있다 → Base() → this(5) → Base(5)가 "B5 " → Base()로 돌아와 "B0 " → Sub의 x = 20 → "S "
  a.get() = Sub의 x(20) + Base의 x(5) = 25
• new Sub(3): super(6) → "B6 " → Sub의 x = 20으로 초기화된 뒤 this.x = 3 → "S3 "
  b.get() = 3 + 6 = 9
• 25 + 9 = 34 (정수 덧셈)`),
    out('c', '연결 리스트 값 맞바꾸기', `#include <stdio.h>

struct Node {
    int v;
    struct Node *next;
};

int main(void) {
    struct Node n[5];
    for (int i = 0; i < 5; i++) {
        n[i].v = (i + 1) * 10;
        n[i].next = i < 4 ? &n[i + 1] : NULL;
    }
    struct Node *p = &n[0];
    while (p != NULL && p->next != NULL) {
        int t = p->v;
        p->v = p->next->v;
        p->next->v = t;
        p = p->next->next;
    }
    for (p = &n[0]; p; p = p->next) printf("%d ", p->v);
    return 0;
}
`, '20 10 40 30 50',
      `노드 두 개씩 묶어 값을 맞바꾸고 두 칸 건너뛴다.
10 ↔ 20, 30 ↔ 40, 50은 짝이 없어서(p->next가 NULL) 그대로 → 20 10 40 30 50`),
    blanks('db', '위반되는 무결성',
      '[학생](학번 기본키, 학과코드는 [학과]를 참조하는 외래키) 테이블에 다음 SQL을 실행하면 오류가 난다. 각 SQL이 위반하는 무결성 제약 조건을 쓰시오. ([학과]에는 D1, D2만 있다)',
      [['①', '개체 무결성', 'Entity Integrity', '개체'], ['②', '참조 무결성', 'Referential Integrity', '참조']],
      `① 기본키(학번)에 NULL → 개체 무결성 위반 (기본키는 NULL·중복 불가)
② 외래키 학과코드에 [학과]에 없는 D9 → 참조 무결성 위반 (외래키는 참조 테이블의 기본키 값이거나 NULL)`,
      { pre: `① INSERT INTO 학생 VALUES (NULL, '홍길동', 'D1');
② INSERT INTO 학생 VALUES (7, '이몽룡', 'D9');` }),
    out('python', 'type()으로 나눠 처리하기', `def size(x):
    if type(x) == int:
        return x
    elif type(x) == str:
        return len(x)
    elif type(x) == tuple:
        return sum(size(e) for e in x)
    else:
        return -1


data = [3, "four", (1, "ab", (2, 3)), [5], 2.0]
print(sum(size(d) for d in data), size(data[2]))
`, '13 8',
      `• 3 → int라 3
• "four" → 길이 4
• (1, "ab", (2, 3)) → 1 + 2 + (2 + 3) = 8 (튜플 안의 튜플도 재귀로)
• [5]는 list, 2.0은 float → 둘 다 -1
합: 3 + 4 + 8 - 1 - 1 = 13`),
    sqlOut('3중 중첩 서브쿼리',
      '[부서], [사원] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄)',
      `CREATE TABLE 부서(부서코드 TEXT PRIMARY KEY, 부서명 TEXT, 지역 TEXT);
INSERT INTO 부서 VALUES ('D1', '영업', '서울'), ('D2', '개발', '판교'), ('D3', '인사', '서울'), ('D4', '기획', '부산');
CREATE TABLE 사원(사번 INTEGER PRIMARY KEY, 이름 TEXT, 부서코드 TEXT, 급여 INTEGER);
INSERT INTO 사원 VALUES (1, '강하늘', 'D1', 350), (2, '남궁민', 'D2', 500), (3, '도경수', 'D3', 280),
  (4, '류준열', 'D3', 320), (5, '마동석', 'D4', 400), (6, '박보검', 'D1', 300);`,
      `SELECT 이름 FROM 사원
WHERE 부서코드 IN (SELECT 부서코드 FROM 부서
                   WHERE 지역 = (SELECT 지역 FROM 부서 WHERE 부서명 = '영업'))
  AND 급여 > 300
ORDER BY 이름;`,
      '강하늘\n류준열',
      `가장 안쪽부터 푼다.
① 영업 부서의 지역 → 서울
② 지역이 서울인 부서 → D1, D3
③ D1·D3 소속이면서 급여 300 "초과": 강하늘(350), 류준열(320). 박보검은 300이라 빠진다.`),
    out('java', '제네릭과 Object', `import java.util.*;

class Box<T> {
    private T item;
    Box(T item) { this.item = item; }
    T get() { return item; }
}

public class Main {
    static int total(List<Box<? extends Number>> list) {
        int s = 0;
        for (Box<? extends Number> b : list) s += b.get().intValue();
        return s;
    }

    public static void main(String[] args) {
        List<Box<? extends Number>> list = new ArrayList<>();
        list.add(new Box<>(3));
        list.add(new Box<>(2.9));
        list.add(new Box<>(10L));
        Object o = list.get(1).get();
        String type = o instanceof Integer ? "I" : o instanceof Double ? "D" : "?";
        System.out.println(total(list) + type + new Box<Object>("x").get().equals("x"));
    }
}
`, '15Dtrue',
      `• 3, 2.9, 10L은 오토박싱으로 Integer, Double, Long이 된다. 모두 Number의 자식이라 ? extends Number에 들어간다
• intValue()는 소수점을 버린다: 3 + 2 + 10 = 15
• o에 든 실제 객체는 Double → "D"
• Box<Object>에 "x"를 넣어도 실제 객체는 String이라 equals("x")는 true
• 15 + "D"부터 문자열 연결 → "15Dtrue"`),
    blanks('net', 'URL의 구조',
      '다음 URL에서 각 부분을 이르는 이름을 〈보기〉에서 골라 쓰시오.',
      [['① https', '스킴', 'Scheme', '프로토콜', 'Protocol'], ['② 8443', '포트', 'Port', '포트 번호'], ['③ page=2', '쿼리', 'Query', '쿼리 문자열', 'Query String', '쿼리스트링'], ['④ top', '프래그먼트', 'Fragment', '앵커', 'Anchor']],
      `scheme://host:port/path?query#fragment
• 스킴(https): 쓸 프로토콜 / 호스트(www.example.com) / 포트(8443, 생략하면 https는 443)
• 경로(/board/list) / 쿼리(?뒤, 이름=값&…) / 프래그먼트(#뒤, 문서 안의 위치 — 서버로 보내지지 않는다)`,
      { pre: 'https://www.example.com:8443/board/list?page=2#top', options: ['스킴', '호스트', '포트', '경로', '쿼리', '프래그먼트'] }),
    term('net', 'RIP',
      `다음 설명에 해당하는 라우팅 프로토콜을 영문 약어로 쓰시오.
거리 벡터(Distance Vector) 방식의 내부 라우팅 프로토콜이다. 목적지까지 거치는 라우터 수(홉 수)만으로 경로를 고르고, 최대 15홉까지만 갈 수 있다(16은 도달 불가). 30초마다 이웃 라우터와 라우팅 테이블 전체를 주고받는다.`,
      ['RIP', 'Routing Information Protocol'],
      `RIP는 벨만-포드 알고리즘을 쓰고 설정이 쉽지만, 느린 수렴과 무한 계수(Count to Infinity) 문제가 있어 소규모 네트워크에 알맞다. 대규모에는 링크 상태 방식의 OSPF를 쓴다.`),
    blanks('db', '관계 대수 연산자',
      '관계 대수의 연산 기호에 해당하는 연산 이름을 쓰시오.',
      [['① σ', '셀렉트', 'Select', '선택', '셀렉션', 'Selection'], ['② π', '프로젝트', 'Project', '추출', '프로젝션', 'Projection'], ['③ ⋈', '조인', 'Join'], ['④ ÷', '디비전', 'Division', '나누기', '나눗셈']],
      `• σ(셀렉트): 조건에 맞는 튜플(행)을 고른다 — 수평 연산
• π(프로젝트): 지정한 속성(열)만 뽑는다 — 수직 연산, 중복 제거
• ⋈(조인): 공통 속성으로 두 릴레이션을 합친다
• ÷(디비전): 나누는 릴레이션의 값을 모두 가진 튜플을 고른다
일반 집합 연산: ∪ 합집합, ∩ 교집합, − 차집합, × 카티션 곱`),
    term('sec', '제로 트러스트',
      `다음 설명에 해당하는 보안 모델을 쓰시오.
"아무것도 믿지 말고 항상 검증하라"는 원칙에 따라, 내부망 안에 있는 사용자나 기기라도 기본적으로 신뢰하지 않는다. 자원에 접근할 때마다 사용자·기기·상황을 확인해 필요한 최소 권한만 주고, 네트워크를 잘게 나눠(마이크로 세그멘테이션) 침입자가 옆으로 퍼지지 못하게 한다.`,
      ['제로 트러스트', 'Zero Trust', '제로트러스트', 'ZTA', 'Zero Trust Architecture'],
      `기존의 "경계 보안"(방화벽 안은 믿는다)과 반대 개념이다. 재택근무·클라우드가 늘면서 내부와 외부의 경계가 흐려져 주목받았다.`,
      { trend: true }),
  ]),

  round('2024-2', {
    pass: 27.74, level: 3,
    note: '프로그래밍이 개편 뒤 가장 많은 9문항 나온 회차. C 값 전달·switch·문자열 복사·포인터 배열·구조체 체인, Java 배열 참조·인터페이스·재귀·split이 나왔고, RIP 경로와 SRT 계산도 있었다.',
  }, [
    out('java', '배열 참조와 메서드 인자', `public class Main {
    static void change(int[] a, int[] b) {
        a[0] = 100;
        b = new int[] {7, 8, 9};
        b[0] = 200;
    }

    public static void main(String[] args) {
        int[] x = {1, 2, 3};
        int[] y = {1, 2, 3};
        int[] z = x;
        change(x, y);
        System.out.println(x[0] + " " + y[0] + " " + (x == z) + " " + (x == y) + " "
            + java.util.Arrays.equals(y, new int[] {1, 2, 3}));
    }
}
`, '100 1 true false true',
      `Java는 참조값을 "복사해서" 넘긴다.
• a[0] = 100: a와 x는 같은 배열 → x[0]이 100
• b = new int[]…: 매개변수 b만 새 배열을 가리키게 될 뿐, y는 그대로 → y[0]은 1
• x == z: 같은 배열 → true / x == y: 내용은 같아도 다른 배열 → false
• Arrays.equals는 내용 비교 → true`),
    term('db', '반정규화',
      `다음 설명에 해당하는 데이터 모델링 기법을 쓰시오.
정규화된 데이터 모델에서 조회 성능을 높이거나 개발을 단순하게 하려고, 일부러 데이터 중복을 허용하거나 테이블을 합치고 나누는 기법이다. 예: 주문 테이블에 고객 이름을 중복 저장해 매번 조인하지 않게 한다.`,
      ['반정규화', '역정규화', 'Denormalization', '비정규화'],
      `반정규화(역정규화)는 정규화 원칙을 의도적으로 어긴다. 방법: 테이블 통합·분할, 중복 테이블(집계 테이블) 추가, 중복 속성 추가, 관계 중복.
대가로 데이터 일관성·무결성을 지키는 부담이 늘어난다.`),
    blanks('sql', 'DML 빈칸',
      '다음 SQL의 빈칸에 알맞은 키워드를 쓰시오.',
      [['①', 'INSERT'], ['②', 'SELECT'], ['③', 'UPDATE'], ['④', 'SET']],
      `• INSERT INTO 테이블 SELECT …: 다른 테이블의 조회 결과를 한꺼번에 넣는다 (VALUES 대신)
• UPDATE 테이블 SET 열 = 값 WHERE 조건: WHERE를 빼면 모든 행이 바뀐다
DML: SELECT, INSERT, UPDATE, DELETE / DDL: CREATE, ALTER, DROP, TRUNCATE / DCL: GRANT, REVOKE`,
      { pre: `-- [신입] 테이블의 모든 행을 [학생] 테이블에 넣는다
( ① ) INTO 학생 ( ② ) * FROM 신입;

-- 학번이 3인 학생의 학과를 '전기'로 바꾼다
( ③ ) 학생 ( ④ ) 학과 = '전기' WHERE 학번 = 3;` }),
    blanks('db', '카디널리티와 차수',
      '다음 [도서] 릴레이션의 카디널리티와 차수를 쓰시오.',
      [['① 카디널리티', '6'], ['② 차수', '5']],
      `카디널리티 = 튜플(행)의 수 = 6, 차수(디그리) = 속성(열)의 수 = 5
제목 행(속성 이름)은 튜플이 아니다.`,
      { tables: [{ name: '도서', cols: ['도서번호', '제목', '저자', '출판연도', '가격'], rows: [
        [101, '자료구조', '김', 2019, 25000], [102, '운영체제', '이', 2020, 30000], [103, '네트워크', '박', 2018, 28000],
        [104, '데이터베이스', '최', 2021, 32000], [105, '알고리즘', '정', 2022, 27000], [106, '보안', '한', 2023, 29000]] }] }),
    blanks('sec', 'IPsec과 AH·ESP',
      '네트워크 계층 보안 프로토콜에 대한 설명이다. 빈칸에 알맞은 말을 영문 약어로 쓰시오.',
      [['①', 'IPsec', 'IP Security', 'IPSec'], ['②', 'AH', 'Authentication Header', '인증 헤더'], ['③', 'ESP', 'Encapsulating Security Payload']],
      `IPsec은 IP 계층에서 암호화·인증을 제공해 VPN에 많이 쓰인다.
• AH: 출발지 인증과 무결성만 (암호화 없음)
• ESP: 암호화(기밀성) + 인증·무결성
• 동작 모드: 전송 모드(데이터만 보호), 터널 모드(IP 패킷 전체를 새 패킷에 담음)
• 키 교환: IKE`,
      { pre: `( ① ) : IP 계층에서 패킷을 암호화·인증하는 보안 프로토콜 묶음. VPN 구현에 많이 쓰인다
( ② ) : 데이터의 출처를 인증하고 무결성을 보장하지만 암호화는 하지 않는 헤더
( ③ ) : 데이터를 암호화해 기밀성까지 제공하는 헤더` }),
    term('design', '순차적 응집도',
      '모듈 안에서 한 활동의 "출력 데이터"가 바로 다음 활동의 "입력 데이터"로 쓰이는 관계로 묶인 응집도를 〈보기〉에서 골라 쓰시오.',
      ['순차적 응집도', '순차적', '순차 응집도', 'Sequential Cohesion'],
      `예: 파일 읽기 → (읽은 데이터로) 검증 → (검증된 데이터로) 저장
교환(통신)적 응집도는 같은 입력·출력을 "함께 쓰는" 것이고, 순차적은 앞의 출력을 뒤가 "이어 받는" 것이다.
응집도 강도: 기능적 > 순차적 > 교환적 > 절차적 > 시간적 > 논리적 > 우연적`,
      { options: ['기능적 응집도', '순차적 응집도', '교환적 응집도', '절차적 응집도', '시간적 응집도', '논리적 응집도'] }),
    term('design', '반복자 패턴',
      `다음 설명에 해당하는 GoF 디자인 패턴을 쓰시오.
컬렉션(리스트, 트리, 해시 등)의 내부 구조를 드러내지 않고, 그 안의 원소들에 차례대로 접근하는 방법을 제공한다. Java의 for-each 문과 hasNext()·next()가 이 패턴이다. 행위 패턴에 속한다.`,
      ['반복자', 'Iterator', '이터레이터'],
      `반복자(Iterator) 패턴은 "순회 방법"을 컬렉션과 분리한다. 컬렉션이 바뀌어도 순회하는 코드는 그대로 쓸 수 있다.`),
    out('python', '부분 문자열 세기와 f-string', `text = "abababcab"
pat = "ab"
cnt = 0
pos = []
for i in range(len(text) - len(pat) + 1):
    if text[i:i+len(pat)] == pat:
        cnt += 1
        pos.append(i)
print(f"{cnt}:{pos[-1]}:{text.count('aba')}:{text[pos[1]:pos[2]]}")
`, '4:7:1:ab',
      `"ab"는 0, 2, 4, 7번 위치에서 시작한다 → 4개, 마지막 7
str.count는 "겹치지 않게" 센다: 0번의 "aba"를 센 뒤 3번부터 찾으면 "aba"가 더 없다 → 1
(겹쳐서 세면 0, 2번 두 개지만 count는 그렇게 세지 않는다)
text[2:4] = "ab"`),
    blanks('net', '가상 회선과 데이터그램',
      '패킷 교환 방식에 대한 설명이다. 빈칸에 알맞은 방식을 쓰시오.',
      [['①', '가상 회선', 'Virtual Circuit', '가상 회선 방식', '가상회선'], ['②', '데이터그램', 'Datagram', '데이터그램 방식']],
      `• 가상 회선: 연결형. 경로를 먼저 정하고 모든 패킷이 같은 경로로 순서대로 간다 (예: X.25, TCP의 개념)
• 데이터그램: 비연결형. 패킷마다 독립적으로 경로를 고르고, 순서가 바뀌어 도착할 수 있다 (예: IP, UDP)`,
      { pre: `( ① ) 방식 : 데이터를 보내기 전에 논리적인 경로를 먼저 설정하고, 모든 패킷이 그 경로로 순서대로 전달된다 (연결형)
( ② ) 방식 : 경로를 미리 정하지 않고 패킷마다 독립적으로 경로를 골라 전달한다. 도착 순서가 바뀔 수 있다 (비연결형)` }),
    out('c', '값 전달과 switch 빠져나감', `#include <stdio.h>

int n = 10;

void f(int n) {
    switch (n % 4) {
        case 1: n += 1;
        case 2: n += 2;
        case 3: n += 3; break;
        default: n += 100;
    }
    printf("%d ", n);
}

int main(void) {
    for (int i = 5; i <= 8; i++) f(i);
    printf("%d", n);
    return 0;
}
`, '11 11 10 108 10',
      `case 끝에 break가 없으면 아래 case로 계속 내려간다(fall-through).
• 5 % 4 = 1 → +1 +2 +3 → 11
• 6 % 4 = 2 → +2 +3 → 11
• 7 % 4 = 3 → +3 → 10
• 8 % 4 = 0 → default +100 → 108
매개변수 n은 전역 n을 가린다. 전역 n은 한 번도 바뀌지 않아 10`),
    out('c', '포인터로 문자열 복사', `#include <stdio.h>

void copy(char *d, const char *s) {
    while ((*d++ = *s++) != '\\0')
        ;
}

int main(void) {
    char a[20] = "black";
    char b[] = "white";
    copy(a + 2, b + 1);
    printf("%s ", a);
    a[4] = '\\0';
    printf("%s %d", a, (int)sizeof(b));
    return 0;
}
`, 'blhite blhi 6',
      `*d++ = *s++는 한 글자를 옮기고 두 포인터를 다음 칸으로 보낸다. NUL('\\0')까지 옮기고 멈춘다.
a + 2 자리부터 "hite"를 덮어쓴다 → "bl" + "hite" = "blhite"
a[4]에 NUL을 넣으면 문자열이 거기서 끝난다 → "blhi"
sizeof(b)는 글자 5개 + NUL = 6`),
    out('java', '인터페이스로 조건 바꾸기', `interface Rule {
    boolean test(int n);
}

class Even implements Rule {
    public boolean test(int n) { return n % 2 == 0; }
}

class Big implements Rule {
    int limit;
    Big(int limit) { this.limit = limit; }
    public boolean test(int n) { return n > limit; }
}

public class Main {
    static int sum(int[] arr, Rule r) {
        int s = 0;
        for (int v : arr) if (r.test(v)) s += v;
        return s;
    }

    public static void main(String[] args) {
        int[] arr = {3, 8, 5, 12, 7, 10};
        Rule[] rules = { new Even(), new Big(6), n -> n % 3 == 0 };
        for (Rule r : rules) System.out.print(sum(arr, r) + " ");
    }
}
`, '30 37 15',
      `sum은 Rule 인터페이스만 알고, 실제 어떤 규칙인지는 넘겨받은 객체가 정한다(다형성).
• 짝수: 8 + 12 + 10 = 30
• 6보다 큼: 8 + 12 + 7 + 10 = 37
• 람다(3의 배수): 3 + 12 = 15
메서드가 하나뿐인 인터페이스는 람다식으로 구현할 수 있다.`),
    blanks('net', 'RIP와 OSPF의 경로',
      '다음은 라우터 A~F의 연결과 링크 비용이다. ①에는 RIP를 쓸 때, ②에는 OSPF(링크 비용 기준)를 쓸 때 A에서 F로 가는 경로를 쓰시오. (예: A-B-F)',
      [['①', 'A-D-F', 'ADF', 'A→D→F'], ['②', 'A-B-C-F', 'ABCF', 'A→B→C→F']],
      `• RIP는 홉 수(거치는 링크 수)만 본다: A-D-F는 2홉, A-B-C-F는 3홉 → A-D-F
• OSPF는 링크 비용 합을 본다: A-D-F = 10 + 10 = 20, A-B-C-F = 1 + 1 + 1 = 3 → A-B-C-F
비용은 보통 대역폭에서 나온다. 홉 수가 적어도 느린 회선이면 OSPF는 피한다.`,
      { pre: `A ──1── B ──1── C ──1── F
│                       │
10                      │
│                       │
D ─────────10───────────┘

(A-B 1, B-C 1, C-F 1, A-D 10, D-F 10)` }),
    term('sec', 'AES',
      `다음 설명에 해당하는 암호 알고리즘을 영문 약어로 쓰시오.
미국 국립표준기술연구소(NIST)가 DES를 대체하기 위해 공모해 2001년 표준으로 정한 대칭키 블록 암호다. 블록 크기는 128비트이고 키 길이는 128, 192, 256비트 중에서 고른다.`,
      ['AES', 'Advanced Encryption Standard'],
      `대칭키 블록 암호: DES(56비트 키, 64비트 블록), 3DES, AES, SEED·ARIA(국내), IDEA, Skipjack
대칭키 스트림 암호: RC4, LFSR / 비대칭키(공개키): RSA, ECC, 디피-헬만, ElGamal`),
    out('c', '2차원 배열과 포인터 배열', `#include <stdio.h>

int main(void) {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int *p[2] = {a[1], a[0]};
    int (*q)[3] = a;
    printf("%d ", *p[0] + p[1][2]);
    printf("%d ", *(*(q + 1) + 2) - **q);
    printf("%d ", *(p[1] + 2));
    printf("%d", (int)(sizeof(a) / sizeof(a[0])));
    return 0;
}
`, '7 5 3 2',
      `• int *p[2]는 "포인터 2개짜리 배열": p[0]은 a[1] 행, p[1]은 a[0] 행을 가리킨다
• int (*q)[3]은 "int 3개짜리 행을 가리키는 포인터": q + 1은 다음 행
• *p[0] = a[1][0] = 4, p[1][2] = a[0][2] = 3 → 7
• *(*(q + 1) + 2) = a[1][2] = 6, **q = a[0][0] = 1 → 5
• *(p[1] + 2) = a[0][2] = 3
• sizeof(a) / sizeof(a[0]) = 24 / 12 = 2 (행의 수)`),
    raw({
      kind: 'sched', cat: 'os', title: 'SRT 평균 대기 시간',
      question: '다음 프로세스를 SRT 기법으로 스케줄링할 때 평균 대기 시간을 쓰시오.',
      procs: [{ name: 'P1', arrival: 0, burst: 8 }, { name: 'P2', arrival: 1, burst: 4 }, { name: 'P3', arrival: 2, burst: 9 }, { name: 'P4', arrival: 3, burst: 5 }],
      algo: 'SRT', ask: 'avgWait',
      explain: 'SRT는 새 프로세스가 도착할 때마다 남은 실행 시간이 가장 짧은 프로세스에 CPU를 준다. 1초에 P2(4)가 오면 P1(남은 7)을 멈추고 P2를 실행한다. 대기 시간 = 종료 - 도착 - 실행 시간.',
    }),
    out('java', '재귀와 중복 검사 배열', `public class Main {
    static boolean[] used = new boolean[26];

    static String uniq(String s, int i) {
        if (i == s.length()) return "";
        char c = s.charAt(i);
        if (used[c - 'a']) return uniq(s, i + 1);
        used[c - 'a'] = true;
        return c + uniq(s, i + 1) + (i % 2 == 0 ? "" : String.valueOf(c).toUpperCase());
    }

    public static void main(String[] args) {
        System.out.println(uniq("banana", 0));
    }
}
`, 'banA',
      `처음 나온 글자만 남기고, 홀수 번째에서 처음 나온 글자는 돌아올 때 대문자를 뒤에 붙인다.
• i=0 'b'(처음): "b" + uniq(1)
• i=1 'a'(처음): "a" + uniq(2) + "A"
• i=2 'n'(처음): "n" + uniq(3) + ""
• i=3~5: 이미 나온 글자 → 건너뜀
uniq(2) = "n", uniq(1) = "a" + "n" + "A" = "anA" → "banA"
c - 'a'는 글자를 0~25 번호로 바꾼다.`),
    term('design', '제어 결합도',
      `다음 설명에 해당하는 결합도를 쓰시오.
한 모듈이 다른 모듈에게 단순한 데이터가 아니라 "어떻게 처리하라"는 제어 신호(플래그, 기능 코드)를 넘겨, 받는 모듈의 내부 처리 흐름을 결정한다. 호출한 쪽이 받는 쪽의 내부 논리를 알아야 하므로 정보 은닉이 깨진다.`,
      ['제어 결합도', 'Control Coupling', '제어'],
      `예: print(data, mode) 에서 mode가 1이면 화면, 2면 파일로 출력하게 하는 경우.
결합도 순서(약 → 강): 자료 < 스탬프 < 제어 < 외부 < 공통 < 내용`),
    out('c', '구조체 포인터 따라가기', `#include <stdio.h>

struct Dept { char name[10]; int floor; };
struct Emp { char name[10]; struct Dept *dept; struct Emp *boss; };

int main(void) {
    struct Dept d1 = {"Sales", 3}, d2 = {"Dev", 7};
    struct Emp ceo = {"Han", &d2, NULL};
    struct Emp mgr = {"Yoon", &d1, &ceo};
    struct Emp staff = {"Jang", &d1, &mgr};
    struct Emp *p = &staff;
    printf("%s ", p->boss->name);
    printf("%d ", p->boss->boss->dept->floor);
    p->boss->dept = &d2;
    printf("%s %d", mgr.dept->name, staff.dept->floor + mgr.dept->floor);
    return 0;
}
`, 'Yoon 7 Dev 10',
      `-> 는 "포인터가 가리키는 구조체의 멤버"다. 왼쪽부터 따라간다.
• p->boss는 mgr → "Yoon"
• p->boss->boss는 ceo, 그 dept는 d2 → 7층
• p->boss->dept = &d2: mgr의 부서가 Dev로 바뀐다
• staff는 여전히 d1(3층), mgr은 d2(7층) → 10`),
    out('java', 'split과 빈 문자열', `public class Main {
    public static void main(String[] args) {
        String s = "a,b,,c,";
        String[] p1 = s.split(",");
        String[] p2 = "2024-08-05".split("-");
        String[] p3 = "x1y22z333".split("[0-9]+");
        System.out.println(p1.length + " " + p1[2].isEmpty() + " "
            + (Integer.parseInt(p2[1]) + Integer.parseInt(p2[2])) + " " + p3.length + p3[2]);
    }
}
`, '4 true 13 3z',
      `• split은 가운데 빈 문자열은 남기고, 맨 끝의 빈 문자열은 버린다: "a,b,,c," → [a, b, "", c] → 4개, p1[2]는 빈 문자열
• "08", "05"를 정수로 바꾸면 8, 5 → 13
• split의 인자는 정규식이다. [0-9]+(숫자 1개 이상)로 나누면 [x, y, z] → 3개, p3[2]는 "z"`),
  ]),

  round('2024-1', {
    pass: 36.08, level: 1,
    note: '기출 개념이 거의 그대로 나와 "물시험"이라 불린 회차. 개편 뒤 처음으로 페이지 교체 계산이 나왔고, 싱글톤·응집도 순서·정규화·조인 종류처럼 기본기를 물었다.',
  }, [
    out('java', '싱글톤과 static', `class Counter {
    private static Counter inst = null;
    private int count = 0;
    private Counter() {}

    static Counter get() {
        if (inst == null) inst = new Counter();
        return inst;
    }

    int up() { return ++count; }
}

public class Main {
    public static void main(String[] args) {
        Counter a = Counter.get();
        Counter b = Counter.get();
        a.up();
        b.up();
        Counter.get().up();
        System.out.println(a.up() + " " + (a == b));
    }
}
`, '4 true',
      `싱글톤: 생성자를 private으로 막고, static 메서드가 처음 한 번만 객체를 만들어 계속 같은 객체를 돌려준다.
a, b, Counter.get()은 모두 같은 객체라 count가 1, 2, 3으로 이어지고, 마지막 a.up()이 4를 돌려준다. a == b는 true`),
    out('c', '삼항 연산자와 시프트', `#include <stdio.h>

int main(void) {
    int a = 12, b = 5;
    int x = a > b ? a << 1 : b >> 1;
    int y = (a & 1) ? a : a >> 2;
    int z = x > 20 ? (y < 3 ? 1 : 2) : 3;
    printf("%d %d %d %d", x, y, z, (x | y) ^ z);
    return 0;
}
`, '24 3 2 25',
      `• x: 12 > 5 → 12 << 1 = 24 (왼쪽 시프트 1번 = ×2)
• y: 12 & 1 = 0(짝수) → 12 >> 2 = 3 (오른쪽 시프트 2번 = ÷4)
• z: 24 > 20 → (3 < 3은 거짓) → 2
• (24 | 3) = 11000 | 00011 = 11011(27), 27 ^ 2 = 11011 ^ 00010 = 11001 = 25`),
    term('design', '응집도 강도 순서',
      '응집도를 강한 것(좋은 것)부터 약한 것 순서로 〈보기〉의 기호를 나열하시오.',
      ['ㄱ ㅁ ㄷ ㅅ ㄹ ㅂ ㄴ'],
      `기능적 > 순차적 > 교환적 > 절차적 > 시간적 > 논리적 > 우연적 ("기순교절시논우")
• 절차적: 순서대로 실행해야 하는 기능들을 묶음 / 시간적: 같은 시기에 실행되는 것(초기화 등)
• 논리적: 비슷한 성격의 기능을 묶고 플래그로 고름 / 우연적: 아무 관련 없는 것들`,
      { options: ['ㄱ. 기능적', 'ㄴ. 우연적', 'ㄷ. 교환적', 'ㄹ. 시간적', 'ㅁ. 순차적', 'ㅂ. 논리적', 'ㅅ. 절차적'] }),
    out('c', '포인터로 문자열 뒤집기', `#include <stdio.h>
#include <string.h>

void rev(char *s) {
    char *e = s + strlen(s) - 1;
    while (s < e) {
        char t = *s;
        *s++ = *e;
        *e-- = t;
    }
}

int main(void) {
    char s[] = "ALGORITHM";
    rev(s);
    printf("%s ", s);
    for (int i = 1; s[i]; i += 2) printf("%c", s[i]);
    return 0;
}
`, 'MHTIROGLA HIOL',
      `양 끝을 가리키는 두 포인터를 가운데로 모으며 글자를 맞바꾼다 → "MHTIROGLA"
그다음 홀수 번째(1, 3, 5, 7) 글자: H, I, O, L`),
    term('net', '할당 가능한 IP (CIDR)',
      '네트워크 10.10.8.0/21에 속하며 호스트에 할당할 수 있는 IP 주소를 〈보기〉에서 모두 골라 기호로 쓰시오.',
      ['ㄴ, ㄹ', 'ㄹ, ㄴ'],
      `/21은 세 번째 옥텟을 8씩 나눈다 → 10.10.8.0 ~ 10.10.15.255
• 10.10.8.0은 네트워크 주소, 10.10.15.255는 브로드캐스트 주소라 할당할 수 없다
• 10.10.9.0은 끝자리가 0이지만 네트워크 주소가 아니라 범위 안의 평범한 호스트 주소다(함정)
• 10.10.7.200, 10.10.16.1은 범위 밖
→ ㄴ(10.10.9.0), ㄹ(10.10.12.34)`,
      { options: ['ㄱ. 10.10.7.200', 'ㄴ. 10.10.9.0', 'ㄷ. 10.10.15.255', 'ㄹ. 10.10.12.34', 'ㅁ. 10.10.16.1', 'ㅂ. 10.10.8.0'] }),
    blanks('db', '제3정규형 판별',
      '[주문] 릴레이션의 기본키는 주문번호이고 함수 종속은 아래와 같다. ①에는 이 릴레이션이 만족하는 가장 높은 정규형을, ②에는 제3정규형이 되기 위해 제거해야 하는 종속을 쓰시오.',
      [['①', '제2정규형', '2NF', '2정규형', '제2 정규형'], ['②', '이행 함수 종속', '이행적 함수 종속', '이행 종속', 'Transitive Dependency', '이행적 종속']],
      `기본키가 속성 하나라서 부분 함수 종속은 생길 수 없다 → 제2정규형은 만족한다.
그런데 주문번호 → 고객번호 → 고객등급처럼 기본키가 아닌 속성을 거쳐 결정되는 이행 함수 종속이 있다 → 제3정규형이 아니다.
[고객(고객번호, 고객등급)]을 떼어 내면 제3정규형이 된다.`,
      {
        tables: [{ name: '주문', cols: ['주문번호 (PK)', '고객번호', '고객등급', '주문일'], rows: [['O1', 'C1', 'VIP', '05-01'], ['O2', 'C2', '일반', '05-02'], ['O3', 'C1', 'VIP', '05-03']] }],
        pre: '함수 종속\n주문번호 → 고객번호, 주문일\n고객번호 → 고객등급',
      }),
    blanks('net', '라우팅 프로토콜 구분',
      '라우팅 프로토콜에 대한 설명이다. 빈칸에 알맞은 프로토콜을 영문 약어로 쓰시오.',
      [['①', 'RIP', 'Routing Information Protocol'], ['②', 'OSPF', 'Open Shortest Path First'], ['③', 'BGP', 'Border Gateway Protocol']],
      `• 내부(IGP): RIP(거리 벡터, 홉 수, 최대 15홉), OSPF(링크 상태, 다익스트라, 대규모)
• 외부(EGP): BGP(자율 시스템 사이, 경로 벡터)`,
      { pre: `( ① ) : 거리 벡터 방식. 홉 수로 경로를 정하며 최대 15홉까지 지원한다
( ② ) : 링크 상태 방식. 다익스트라 알고리즘으로 최단 경로를 계산하며 대규모 네트워크에 알맞다
( ③ ) : 서로 다른 자율 시스템(AS) 사이에서 경로 정보를 교환한다` }),
    blanks('db', '조인의 종류',
      '조인에 대한 설명이다. 빈칸에 알맞은 조인을 쓰시오.',
      [['①', '세타 조인', 'Theta Join', '세타'], ['②', '동등 조인', 'Equi Join', '동일 조인', '동등'], ['③', '자연 조인', 'Natural Join', '자연']],
      `• 세타 조인: =, <, >, ≤, ≥, ≠ 등 비교 연산자로 조인
• 동등 조인: 세타 조인 중 = 만 쓴 것 (같은 속성이 두 번 나온다)
• 자연 조인: 동등 조인에서 중복된 속성을 하나로 합친 것 (기호 ⋈)
외부 조인(LEFT/RIGHT/FULL)은 짝이 없는 튜플도 NULL을 채워 남긴다.`,
      { pre: `( ① ) : 두 릴레이션의 속성을 =, <, > 같은 비교 연산자로 비교해 조건을 만족하는 튜플을 합친다
( ② ) : ( ① ) 중 = 연산자만 쓴 조인. 결과에 조인 속성이 두 번 나타난다
( ③ ) : ( ② )의 결과에서 중복된 조인 속성을 하나만 남긴 조인` }),
    raw({
      kind: 'paging', cat: 'os', title: 'LRU 페이지 부재 횟수 (프레임 4개)',
      question: '페이지 프레임이 4개이고 처음에는 모두 비어 있다. 다음 순서로 페이지를 참조할 때 LRU 기법의 페이지 부재 횟수를 쓰시오.',
      refs: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], frames: 4, algo: 'LRU',
      explain: 'LRU는 가장 오랫동안 쓰지 않은 페이지를 교체한다. 5가 처음 들어올 때 프레임에는 1, 2, 3, 4가 있고, 가장 오래전에 쓴 것은 3이다(1, 2는 방금 다시 썼다).',
    }),
    out('java', '생성자 호출 순서', `class A {
    A() { System.out.print("A"); init(); }
    void init() { System.out.print("a"); }
}

class B extends A {
    B() { this(0); System.out.print("B"); }
    B(int n) { System.out.print("b" + n); }
    @Override
    void init() { System.out.print("i"); }
}

public class Main {
    public static void main(String[] args) {
        new B();
        System.out.print("/");
        new A();
    }
}
`, 'Aib0B/Aa',
      `new B(): B()는 this(0)로 B(int)를 먼저 부르고, B(int)의 첫 줄에 숨은 super()가 A()를 부른다.
A() → "A" → init()은 객체가 B라 B.init() → "i" → B(int) → "b0" → B() → "B"
new A(): "A" → A의 init() → "a"`),
    out('c', '구조체 포인터와 정수 나눗셈', `#include <stdio.h>

typedef struct {
    char name[10];
    int kor, eng, math;
    double avg;
} Score;

void calc(Score *s) {
    s->avg = (s->kor + s->eng + s->math) / 3;
}

int main(void) {
    Score a = {"Kim", 90, 85, 80, 0};
    Score b = {"Lee", 70, 75, 81, 0};
    calc(&a);
    calc(&b);
    printf("%.1f %.2f %s", a.avg, b.avg, a.avg > b.avg ? a.name : b.name);
    return 0;
}
`, '85.0 75.00 Kim',
      `(int + int + int) / 3은 정수 나눗셈이라 소수점이 먼저 버려진 뒤 double에 들어간다.
a: 255 / 3 = 85 → 85.0 / b: 226 / 3 = 75 (75.33…이 아님) → 75.00
정확히 구하려면 / 3.0으로 나눠야 한다. 구조체를 포인터로 넘겨서 avg가 main의 a, b에 저장된다.`),
    out('python', '문자열 인덱싱과 연결', `words = ["python", "java", "c", "sql"]
s = ""
for w in words:
    s += w[len(w) // 2] if len(w) > 1 else w.upper()
print(s, s[::-1][1:3])
`, 'hvCq Cv',
      `가운데 글자(len // 2번)를 모은다. 한 글자짜리는 대문자로.
python(6) → 3번 'h', java(4) → 2번 'v', c → 'C', sql(3) → 1번 'q' → "hvCq"
뒤집으면 "qCvh", [1:3]은 "Cv"`),
    sqlOut('IN 서브쿼리',
      '[학생], [수강] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄)',
      `CREATE TABLE 학생(학번 INTEGER PRIMARY KEY, 이름 TEXT, 학과 TEXT);
INSERT INTO 학생 VALUES (1, '김철', '컴퓨터'), (2, '이영', '컴퓨터'), (3, '박민', '전자'), (4, '최수', '전자');
CREATE TABLE 수강(학번 INTEGER, 과목 TEXT, 점수 INTEGER);
INSERT INTO 수강 VALUES (1, 'DB', 95), (1, 'OS', 70), (2, 'DB', 85), (3, 'OS', 92), (3, 'DB', 91), (4, 'NW', 60);`,
      `SELECT 이름 FROM 학생
WHERE 학번 IN (SELECT 학번 FROM 수강 WHERE 점수 >= 90)
ORDER BY 이름;`,
      '김철\n박민',
      `서브쿼리: 90점 이상인 수강 기록의 학번 → 1, 3, 3 (중복이어도 IN에는 상관없다)
바깥 쿼리: 학번이 1 또는 3인 학생 → 김철, 박민. 이름순으로 정렬한다.`),
    term('dev', 'MC/DC 커버리지',
      '결정문 안의 각 개별 조건이, 다른 조건의 값과 관계없이 결정 전체의 결과에 독립적으로 영향을 주는지 확인하는 커버리지를 〈보기〉에서 골라 쓰시오.',
      ['변경 조건/결정 커버리지', 'MC/DC', 'Modified Condition/Decision Coverage', '변경 조건 결정 커버리지', '변형 조건/결정 커버리지'],
      `MC/DC(Modified Condition/Decision Coverage). 항공기 소프트웨어 같은 안전 필수 분야에서 요구한다.
조건/결정 커버리지보다 강하고, 모든 조합을 시험하는 다중 조건 커버리지보다는 케이스가 적다.`,
      { options: ['구문 커버리지', '결정 커버리지', '조건 커버리지', '조건/결정 커버리지', '변경 조건/결정 커버리지', '다중 조건 커버리지'] }),
    term('sec', '루트킷',
      '시스템에 침입해 관리자(root) 권한을 얻은 뒤, 침입 흔적·악성 프로세스·파일을 숨기고 그 권한을 계속 유지하게 해 주는 도구 모음을 〈보기〉에서 골라 쓰시오.',
      ['루트킷', 'Rootkit', '루트 킷'],
      `루트킷(Rootkit)은 "숨기기"가 핵심이다. 운영체제 커널까지 고쳐 백신·관리 도구에서 보이지 않게 한다.
• 백도어: 정상 인증을 거치지 않는 뒷문 / 트로이 목마: 정상 프로그램으로 위장 / 웜: 스스로 복제·전파`,
      { options: ['루트킷', '백도어', '트로이 목마', '웜', '스파이웨어'] }),
    out('java', '업캐스팅과 동적 바인딩', `class Animal {
    String sound() { return "..."; }
    String speak(int n) { return sound().repeat(n); }
}

class Dog extends Animal {
    String sound() { return "멍"; }
}

class Puppy extends Dog {
    String speak(int n) { return "끙" + super.speak(n - 1); }
}

public class Main {
    public static void main(String[] args) {
        Animal[] arr = { new Animal(), new Dog(), new Puppy() };
        for (Animal a : arr) System.out.print(a.speak(2) + " ");
    }
}
`, '...... 멍멍 끙멍',
      `배열 타입은 Animal이지만 실행되는 메서드는 실제 객체의 것이다.
• Animal: "..."를 2번 → "......"
• Dog: speak는 Animal 것, 그 안의 sound()는 Dog 것 → "멍멍"
• Puppy: "끙" + Animal의 speak(1) → 그 안의 sound()는 여전히 객체(Puppy)의 것 = Dog의 "멍" → "끙멍"`),
    term('sec', 'APT',
      `다음 설명에 해당하는 공격을 영문 약어로 쓰시오.
특정 기업이나 기관을 목표로 정해, 스피어 피싱·워터링 홀·제로데이 취약점 등 여러 방법으로 침투한 뒤 오랜 기간 들키지 않게 잠복하며 내부 정보를 빼내거나 시스템을 파괴하는 지능적이고 지속적인 공격이다.`,
      ['APT', 'Advanced Persistent Threat', '지능형 지속 위협', '지능형 지속 공격'],
      `APT(Advanced Persistent Threat, 지능형 지속 위협). 단계: 침투 → 검색(내부 탐색) → 수집 → 유출.`),
    sqlOut('AND와 OR의 우선순위',
      '[제품] 테이블에 다음 SQL을 실행한 결과를 쓰시오.',
      `CREATE TABLE 제품(코드 TEXT PRIMARY KEY, 분류 TEXT, 가격 INTEGER, 재고 INTEGER);
INSERT INTO 제품 VALUES ('A1', '식품', 3000, 0), ('A2', '식품', 12000, 5), ('B1', '가전', 50000, 2),
  ('B2', '가전', 8000, 0), ('C1', '의류', 15000, 7), ('C2', '의류', 9000, 1);`,
      `SELECT COUNT(*) FROM 제품
WHERE 분류 = '가전' OR 분류 = '의류' AND 가격 >= 10000 AND 재고 > 0;`,
      '3',
      `AND가 OR보다 먼저 계산된다. 즉 분류 = '가전' OR (분류 = '의류' AND 가격 >= 10000 AND 재고 > 0)
• 가전: B1, B2 (가격·재고 조건과 상관없이 모두)
• 의류 중 10000 이상·재고 있음: C1
→ 3개. (분류 = '가전' OR 분류 = '의류')로 괄호를 쳤다면 B1, C1 두 개였다.`),
    out('c', 'ctype.h로 문자 바꾸기', `#include <stdio.h>
#include <ctype.h>

int main(void) {
    char s[] = "Hello, C99 World!";
    int up = 0, dg = 0;
    for (int i = 0; s[i]; i++) {
        if (isupper(s[i])) { up++; s[i] = tolower(s[i]); }
        else if (islower(s[i])) s[i] = toupper(s[i]);
        else if (isdigit(s[i])) { dg++; s[i] = '#'; }
        else if (s[i] == ' ') s[i] = '_';
    }
    printf("%s %d %d", s, up, dg);
    return 0;
}
`, 'hELLO,_c##_wORLD! 3 2',
      `대문자 ↔ 소문자를 바꾸고, 숫자는 #, 공백은 _로. 쉼표·느낌표는 그대로.
대문자는 H, C, W 3개, 숫자는 9, 9 두 개.
else if라서 한 글자는 첫 번째로 맞는 조건 하나만 처리된다.`),
    term('design', '추상 팩토리 패턴',
      '구체적인 클래스를 지정하지 않고, 서로 관련된 객체들의 묶음(제품군)을 한 번에 생성하는 인터페이스를 제공하는 패턴을 〈보기〉에서 골라 쓰시오.',
      ['추상 팩토리', 'Abstract Factory', '추상팩토리'],
      `생성 패턴 중 "제품군 단위"로 만드는 것이 추상 팩토리다.
• 팩토리 메서드: 객체 하나를 어떤 클래스로 만들지 하위 클래스가 결정
• 빌더: 복잡한 객체를 단계별로 조립 / 프로토타입: 원본을 복제 / 싱글톤: 객체를 하나만`,
      { options: ['빌더', '프로토타입', '추상 팩토리', '팩토리 메서드', '싱글톤', '어댑터'] }),
  ]),
];
