// 2026년 회차. 문항 개념은 공개된 회차 후기의 개념 목록을 참고했다 (지문·코드는 새로 씀).
import { blanks, out, raw, round, sqlOut, term } from '../build';

const STUDENT = `CREATE TABLE 학과(학과코드 TEXT PRIMARY KEY, 학과명 TEXT);
INSERT INTO 학과 VALUES ('D1', '컴퓨터'), ('D2', '전자'), ('D3', '기계');
CREATE TABLE 학생(학번 INTEGER PRIMARY KEY, 이름 TEXT, 학과코드 TEXT, 점수 INTEGER);
INSERT INTO 학생 VALUES (1, '김하늘', 'D1', 90), (2, '이도윤', 'D1', 80), (3, '박서준', 'D2', 70),
  (4, '최유나', 'D2', 84), (5, '정민호', 'D3', 88), (6, '한소희', 'D1', 70);`;

export const Y2026 = [
  round('2026-2', {
    pass: 34.73, level: 2,
    note: '지엽적인 이론 없이 기출 개념 위주로 나와 개편 뒤 세 번째로 합격률이 높았던 회차. SQL이 4문항으로 많았고, 코드는 재귀·상속·값/주소 전달 같은 기본기를 물었다.',
  }, [
    term('design', '추상 팩토리 패턴',
      `다음 설명에 해당하는 GoF 디자인 패턴의 이름을 쓰시오.
· 서로 관련된 객체들의 묶음(제품군)을, 구체적인 클래스를 지정하지 않고 한 번에 만드는 인터페이스를 제공한다.
· 예: '밝은 테마'와 '어두운 테마'의 버튼·체크박스·스크롤바를 테마 단위로 통째로 바꿔 끼운다.
· 생성 패턴에 속한다.`,
      ['추상 팩토리', 'Abstract Factory', '추상팩토리'],
      `추상 팩토리(Abstract Factory)는 "제품군" 단위로 객체를 만든다. 비슷한 이름의 팩토리 메서드(Factory Method)는 객체 하나를 어떤 클래스로 만들지 하위 클래스에 맡기는 패턴이다.
생성 패턴 5가지: 추상 팩토리, 빌더, 팩토리 메서드, 프로토타입, 싱글톤.`),
    raw({
      kind: 'sched', cat: 'os', title: 'SRT 평균 대기 시간',
      question: '다음 프로세스를 SRT(Shortest Remaining Time) 기법으로 스케줄링할 때 평균 대기 시간을 쓰시오.',
      procs: [{ name: 'A', arrival: 0, burst: 7 }, { name: 'B', arrival: 1, burst: 4 }, { name: 'C', arrival: 2, burst: 2 }, { name: 'D', arrival: 4, burst: 5 }],
      algo: 'SRT', ask: 'avgWait',
      explain: `SRT는 새 프로세스가 도착할 때마다 "남은" 실행 시간을 비교해 가장 짧은 것을 실행한다(선점형 SJF).
대기 시간 = 종료 시간 - 도착 시간 - 실행 시간. 간트 차트를 그리며 도착 시각마다 비교하는 것이 핵심이다.`,
    }),
    blanks('db', '정규형 판정',
      `[수강] 릴레이션의 기본키는 (학번, 과목코드)이고 함수 종속은 아래와 같다. ①에는 이 릴레이션이 만족하는 가장 높은 정규형을, ②에는 다음 정규형으로 가기 위해 제거해야 하는 종속의 종류를 쓰시오.`,
      [['①', '제1정규형', '1NF', '1정규형', '제1 정규형'], ['②', '부분 함수 종속', '부분 함수적 종속', '부분 종속', 'Partial Functional Dependency']],
      `(학번, 과목코드) → 성적은 기본키 전체에 종속(완전 함수 종속)이지만, 학번 → 학과명은 기본키의 "일부"인 학번만으로 결정된다(부분 함수 종속).
부분 함수 종속이 있으면 제2정규형이 아니다. 따라서 이 릴레이션은 제1정규형이고, [학생(학번, 학과명)]을 떼어 내 부분 함수 종속을 없애면 제2정규형이 된다.`,
      {
        tables: [{ name: '수강', cols: ['학번 (PK)', '과목코드 (PK)', '성적', '학과명'], rows: [[1001, 'DB01', 'A', '컴퓨터'], [1001, 'OS02', 'B', '컴퓨터'], [1002, 'DB01', 'C', '전자']] }],
        pre: '함수 종속\n(학번, 과목코드) → 성적\n학번 → 학과명',
      }),
    term('dev', '동등 분할 테스트',
      `다음 설명에 해당하는 블랙박스 테스트 기법을 쓰시오.
입력값의 범위를 "같은 결과가 나올 것으로 기대되는" 유효한 값의 그룹과 무효한 값의 그룹으로 나누고, 그룹마다 대표값 하나씩만 골라 테스트 케이스를 만든다. 예: 점수 0~100 입력을 (-5), (50), (120) 세 값으로 시험한다.`,
      ['동등 분할', '동치 분할', '동등 분할 테스트', '동치 분할 테스트', 'Equivalence Partitioning', '동치 클래스 분할', '균등 분할'],
      `동등(동치) 분할은 그룹의 "대표값"을, 경계값 분석은 그룹의 "경계" 근처 값(-1, 0, 100, 101 등)을 고른다. 두 기법은 함께 자주 출제된다.
블랙박스 기법: 동등 분할, 경계값 분석, 원인-결과 그래프, 오류 예측, 비교 검사.`),
    term('sec', '해시 함수',
      `다음 설명에 해당하는 것을 쓰시오.
임의 길이의 데이터를 고정 길이의 값으로 바꾸는 일방향 함수이다. 결과값으로 원래 데이터를 되돌릴 수 없고, 입력이 1비트만 달라도 결과가 크게 달라진다. 파일을 내려받은 뒤 이 값을 계산해 배포자가 공개한 값과 비교하면 파일이 변조되지 않았는지(무결성) 확인할 수 있다. SHA-256, MD5 등이 있다.`,
      ['해시', '해시 함수', 'Hash', 'Hash Function', '해쉬', '해쉬 함수'],
      `해시(Hash) 함수는 일방향이라 암호화(복호화 가능)와 다르다. 무결성 검증, 비밀번호 저장(솔트와 함께), 전자서명에 쓰인다.`),
    term('net', 'OSPF',
      `다음 설명에 해당하는 라우팅 프로토콜을 영문 약어로 쓰시오.
· 링크 상태(Link State) 방식으로, 각 라우터가 네트워크 전체의 연결 상태를 알고 다익스트라(SPF) 알고리즘으로 최단 경로를 계산한다.
· 홉 수 제한이 없어 대규모 네트워크에 알맞고, 변화가 생기면 바뀐 정보만 빠르게 전파한다.
· 하나의 자율 시스템(AS) 안에서 쓰는 내부 라우팅 프로토콜(IGP)이다.`,
      ['OSPF', 'Open Shortest Path First'],
      `거리 벡터 방식의 RIP는 홉 수(최대 15)만 보고 주기적으로 전체 표를 교환한다. 링크 상태 방식의 OSPF는 대역폭 기반 비용과 다익스트라 알고리즘을 쓴다. AS 사이에는 BGP(EGP)를 쓴다.`),
    term('design', '내용 결합도',
      `다음 설명에 해당하는 결합도를 쓰시오.
한 모듈이 다른 모듈의 내부 변수를 직접 참조하거나 고치고, 심지어 다른 모듈의 코드 중간으로 바로 분기한다. 결합도 중 가장 강하다(가장 나쁘다).`,
      ['내용 결합도', 'Content Coupling', '내용 결합', '내용'],
      `결합도는 약한(좋은) 것부터: 자료 < 스탬프 < 제어 < 외부 < 공통 < 내용.
"자스제외공내"로 외운다. 다른 모듈의 내부를 직접 건드리는 내용 결합도가 가장 강하다.`),
    sqlOut('RIGHT OUTER JOIN과 NULL',
      '[신청], [강좌] 테이블에 다음 SQL을 실행한 결과를 쓰시오.',
      `CREATE TABLE 강좌(강좌코드 TEXT PRIMARY KEY, 강좌명 TEXT);
INSERT INTO 강좌 VALUES ('C1', '자료구조'), ('C2', '운영체제'), ('C3', '데이터베이스'), ('C4', '네트워크');
CREATE TABLE 신청(학번 INTEGER, 강좌코드 TEXT);
INSERT INTO 신청 VALUES (1, 'C1'), (2, 'C1'), (3, 'C3'), (4, 'C5');`,
      `SELECT COUNT(*) FROM 신청 s
  RIGHT OUTER JOIN 강좌 c ON s.강좌코드 = c.강좌코드
WHERE s.학번 IS NULL;`,
      '2',
      `RIGHT OUTER JOIN은 오른쪽 표([강좌])의 모든 행을 남긴다. 짝이 없는 강좌는 왼쪽 열이 NULL로 채워진다.
C1 ↔ 학번 1, 2 / C2 ↔ (없음 → NULL) / C3 ↔ 학번 3 / C4 ↔ (없음 → NULL)
학번이 NULL인 행은 C2, C4 두 개. 신청의 C5는 강좌에 없어서 결과에 나오지 않는다.`),
    out('python', '문자열 슬라이싱과 연결', `s = "INFORMATION"
a = s[2:6]
b = s[-4:]
c = s[::3]
print(a + b[1], c, s[-1] * 2)
`, 'FORMI IOAO NN',
      `s의 인덱스: I0 N1 F2 O3 R4 M5 A6 T7 I8 O9 N10
• s[2:6] → 2~5번 → "FORM" (끝 번호 6은 포함하지 않는다)
• s[-4:] → 뒤에서 4글자 "TION", 그 [1]은 "I"
• s[::3] → 0, 3, 6, 9번 → "IOAO"
• s[-1] * 2 → "NN"`),
    sqlOut('상관 서브쿼리와 평균',
      '[사원] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄)',
      `CREATE TABLE 사원(사번 INTEGER PRIMARY KEY, 이름 TEXT, 부서 TEXT, 급여 INTEGER);
INSERT INTO 사원 VALUES (1, '강민수', '영업', 300), (2, '남지현', '영업', 500), (3, '도윤호', '개발', 400),
  (4, '류하늘', '개발', 600), (5, '문서진', '개발', 500), (6, '박지훈', '인사', 350);`,
      `SELECT 이름 FROM 사원 a
WHERE 급여 > (SELECT AVG(급여) FROM 사원 b WHERE b.부서 = a.부서)
ORDER BY 사번;`,
      '남지현\n류하늘',
      `안쪽 쿼리가 바깥 행(a)의 부서를 쓰므로 바깥 행마다 다시 계산된다(상관 서브쿼리).
영업 평균 400 → 500인 남지현 / 개발 평균 500 → 600인 류하늘 / 인사는 박지훈 혼자라 평균 350과 같아서 "보다 큼"에 해당하지 않는다.`),
    blanks('sql', 'CREATE DOMAIN',
      '학년은 1~4만 허용하는 도메인을 정의하려고 한다. 빈칸에 알맞은 SQL 키워드를 쓰시오.',
      [['①', 'DOMAIN'], ['②', 'CHECK']],
      `CREATE DOMAIN은 여러 테이블에서 같이 쓸 "값의 범위"에 이름을 붙인다. CHECK 제약에서 VALUE는 검사할 값을 가리킨다.
(SQLite·MySQL에는 없고 표준 SQL과 PostgreSQL에 있다)`,
      { pre: `CREATE ( ① ) 학년_도메인 AS INTEGER
  DEFAULT 1
  CONSTRAINT 학년_범위 ( ② ) (VALUE BETWEEN 1 AND 4);` }),
    term('net', '서브넷 프리픽스 역산',
      '어떤 서브넷에서 호스트에 할당할 수 있는 주소가 192.168.10.65부터 192.168.10.126까지이다. 이 서브넷의 프리픽스 길이를 쓰시오. (예: /24)',
      ['/26', '26'],
      `호스트 주소 앞뒤로 네트워크 주소(.64)와 브로드캐스트 주소(.127)가 있다. .64 ~ .127은 64개 주소 = 2⁶ → 호스트 비트 6개.
32 - 6 = 26 → /26 (마스크 255.255.255.192)`),
    out('java', '재귀 호출의 출력 순서', `public class Main {
    static int f(int n) {
        if (n <= 0) return 0;
        System.out.print(n + " ");
        int r = n + f(n - 2);
        System.out.print(r + " ");
        return r;
    }

    public static void main(String[] args) {
        System.out.print(f(5));
    }
}
`, '5 3 1 1 4 9 9',
      `내려갈 때 n을, 돌아올 때 r을 출력한다.
f(5): "5" → f(3): "3" → f(1): "1" → f(-1)=0
f(1): r = 1 → "1" / f(3): r = 3 + 1 = 4 → "4" / f(5): r = 5 + 4 = 9 → "9"
마지막으로 main이 f(5)의 반환값 9를 한 번 더 출력한다.`),
    blanks('sql', 'LIKE와 내림차순 정렬',
      "[학생] 테이블에서 성이 '김'인 학생의 이름과 점수를, 점수가 높은 학생부터 조회하려고 한다. 빈칸에 알맞은 키워드를 쓰시오.",
      [['①', 'LIKE'], ['②', 'DESC', 'DESCENDING']],
      `LIKE의 % 는 "0글자 이상 아무 글자", _ 는 "정확히 한 글자"다. '김%'는 김으로 시작하는 모든 값.
ORDER BY의 기본은 오름차순(ASC)이라, 높은 점수부터 보려면 DESC를 쓴다.`,
      { pre: "SELECT 이름, 점수 FROM 학생\nWHERE 이름 ( ① ) '김%'\nORDER BY 점수 ( ② );" }),
    out('c', '구조체 포인터로 만든 트리 순회', `#include <stdio.h>

struct Node {
    char v;
    struct Node *l, *r;
};

void post(struct Node *n) {
    if (n == NULL) return;
    post(n->l);
    post(n->r);
    printf("%c", n->v);
}

int main(void) {
    struct Node t[6] = {{'A'}, {'B'}, {'C'}, {'D'}, {'E'}, {'F'}};
    t[0].l = &t[1]; t[0].r = &t[2];
    t[1].r = &t[3];
    t[2].l = &t[4]; t[2].r = &t[5];

    struct Node *tmp = t[2].l;
    t[2].l = t[2].r;
    t[2].r = tmp;

    post(&t[0]);
    return 0;
}
`, 'DBFECA',
      `초기화하지 않은 l, r은 NULL(0)이다. 트리: A의 왼쪽 B, 오른쪽 C / B의 오른쪽 D / C의 왼쪽 E, 오른쪽 F.
tmp로 C의 두 자식을 맞바꿔 C의 왼쪽이 F, 오른쪽이 E가 된다.
후위 순회(왼쪽 → 오른쪽 → 자신): D B F E C A`),
    out('java', '생성자 안의 오버라이딩 호출', `class Parent {
    int x = 10;
    Parent() {
        System.out.print("P");
        show();
    }
    void show() { System.out.print(x); }
}

class Child extends Parent {
    int x = 20;
    Child() {
        super();
        System.out.print("C");
        show();
    }
    @Override
    void show() { System.out.print(x); }
}

public class Main {
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.print(" " + p.x);
    }
}
`, 'P0C20 10',
      `① super()로 Parent 생성자가 먼저 돈다. "P"를 찍고 show()를 부르는데, 오버라이딩된 Child.show()가 실행된다.
   이때 Child의 필드 x는 아직 초기화 전이라 기본값 0 → "0"
② Child의 필드 x = 20 초기화 → "C" → show() → "20"
③ p.x: 필드는 오버라이딩되지 않고 변수 타입(Parent)을 따른다 → 10`),
    term('net', '할당 가능한 IP 고르기',
      '라우터의 한 인터페이스에 192.168.5.33/28이 설정되어 있다. 같은 서브넷의 PC에 할당할 수 있는 IP 주소를 〈보기〉에서 모두 골라 기호로 쓰시오.',
      ['ㄴ, ㄹ', 'ㄹ, ㄴ'],
      `/28은 마지막 옥텟을 16개씩 나눈다. 33이 속한 블록은 32 ~ 47.
• 32: 네트워크 주소 / 47: 브로드캐스트 주소 → 할당 불가
• 33: 라우터가 이미 쓰는 주소 → 할당 불가
• 48: 다음 서브넷
→ 40(ㄴ), 46(ㄹ)만 할당할 수 있다.`,
      { options: ['ㄱ. 192.168.5.32', 'ㄴ. 192.168.5.40', 'ㄷ. 192.168.5.47', 'ㄹ. 192.168.5.46', 'ㅁ. 192.168.5.48', 'ㅂ. 192.168.5.33'] }),
    out('python', '딕셔너리 삽입 순서', `d = {}
for w in "banana bandana cab".split():
    for ch in w:
        d[ch] = d.get(ch, 0) + 1

s = ""
for k, v in d.items():
    if v >= 3:
        s += k + str(v)
print(s, list(d)[-1])
`, 'b3a7n4 c',
      `딕셔너리는 처음 넣은 순서를 지킨다: b, a, n, d, c
개수: b 3, a 7, n 4, d 1, c 1 → 3 이상인 것만 순서대로 이으면 "b3a7n4"
list(d)는 키 목록이고 마지막 키는 "c"`),
    out('c', '값 전달과 주소 전달', `#include <stdio.h>

void f(int a, int *b, int c[]) {
    a += 10;
    *b += 10;
    c[1] += 10;
    c = c + 2;
    *c += 100;
}

int main(void) {
    int x = 1, y = 2;
    int arr[4] = {1, 2, 3, 4};
    f(x, &y, arr);
    printf("%d %d %d %d", x, y, arr[1], arr[2]);
    return 0;
}
`, '1 12 12 103',
      `• a는 x의 "복사본"이라 바꿔도 x는 1 그대로
• b는 y의 주소 → *b += 10으로 y가 12
• 배열 매개변수 c는 사실 포인터(arr의 시작 주소) → c[1]이 arr[1]이라 12
• c = c + 2는 지역 포인터만 옮긴다. 그 뒤 *c는 arr[2] → 3 + 100 = 103`),
    out('java', '추상 클래스와 오버라이딩', `abstract class Shape {
    abstract int area();
    int twice() { return area() * 2; }
}

class Rect extends Shape {
    int w, h;
    Rect(int w, int h) { this.w = w; this.h = h; }
    int area() { return w * h; }
}

class Square extends Rect {
    Square(int s) { super(s, s); }
    int area() { return super.area() + 1; }
}

public class Main {
    public static void main(String[] args) {
        Shape[] arr = { new Rect(2, 3), new Square(3) };
        int sum = 0;
        for (Shape s : arr) sum += s.twice();
        System.out.println(sum);
    }
}
`, '32',
      `twice()는 Shape에 있지만 안에서 부르는 area()는 실제 객체의 것이 실행된다(동적 바인딩).
Rect(2, 3): area 6 → twice 12
Square(3): area = super.area() + 1 = 9 + 1 = 10 → twice 20
합 32`),
  ]),

  round('2026-1', {
    pass: 18.14, level: 3,
    note: '프로그래밍 7문항은 예상보다 평이했지만 레이스 컨디션 같은 상식형 보안 용어와 비기능 요구사항 분류가 까다로웠던 회차. Python이 3문항 나왔다.',
  }, [
    blanks('sql', '외래키 제약 조건',
      '[수강] 테이블의 과목코드가 [과목] 테이블의 과목코드를 참조하고, 참조하는 과목이 삭제되면 수강 행도 함께 삭제되도록 하려고 한다. 빈칸에 알맞은 키워드를 쓰시오.',
      [['①', 'FOREIGN KEY'], ['②', 'REFERENCES'], ['③', 'CASCADE']],
      `FOREIGN KEY (열) REFERENCES 참조테이블(열)로 외래키를 정한다.
ON DELETE 옵션: CASCADE(함께 삭제), SET NULL(NULL로), RESTRICT·NO ACTION(삭제 거부), SET DEFAULT(기본값으로)`,
      { pre: `CREATE TABLE 수강 (
  학번 INT,
  과목코드 CHAR(4),
  PRIMARY KEY (학번, 과목코드),
  ( ① ) (과목코드) ( ② ) 과목(과목코드)
    ON DELETE ( ③ )
);` }),
    out('c', '구조체 안의 함수 포인터', `#include <stdio.h>

typedef struct {
    char name;
    int (*op)(int, int);
} Calc;

int add(int a, int b) { return a + b; }
int mul(int a, int b) { return a * b; }
int sh(int a, int b) { return a << b; }

int main(void) {
    Calc c[3] = {{'A', add}, {'M', mul}, {'S', sh}};
    int v = 3;
    for (int i = 0; i < 3; i++) {
        v = c[i].op(v, i + 2);
        printf("%c%x ", c[i].name, v);
    }
    return 0;
}
`, 'A5 Mf Sf0',
      `op에는 함수의 주소가 들어 있어 c[i].op(…)로 그 함수를 부른다. %x는 16진수(소문자)로 찍는다.
i=0: add(3, 2) = 5 → "A5"
i=1: mul(5, 3) = 15 → 16진수 f → "Mf"
i=2: sh(15, 4) = 15 << 4 = 240 → 16진수 f0 → "Sf0"`),
    term('sec', '레이스 컨디션',
      `다음 설명에 해당하는 공격(또는 취약점)의 이름을 쓰시오.
권한이 높은 프로그램이 임시 파일을 "확인"한 뒤 "사용"하기까지의 아주 짧은 틈에, 공격자가 그 파일 이름을 다른 중요한 파일(예: /etc/passwd)을 가리키는 심볼릭 링크로 바꿔치기한다. 두 실행 흐름이 같은 자원에 접근할 때 실행 순서(타이밍)에 따라 결과가 달라지는 점을 노린다.`,
      ['레이스 컨디션', 'Race Condition', '경쟁 조건', '경쟁 상태', '경쟁 상태 공격'],
      `확인 시점과 사용 시점이 달라서 생기는 문제라 TOCTOU(Time-Of-Check to Time-Of-Use)라고도 한다.
대응: 임시 파일을 예측하기 어려운 이름으로 원자적으로 만들고(mkstemp), 심볼릭 링크를 따라가지 않게 연다.`),
    out('java', '오버라이딩과 오버로딩', `class A {
    void f(int x) { System.out.print("A.int "); }
    void f(double x) { System.out.print("A.double "); }
}

class B extends A {
    @Override
    void f(int x) { System.out.print("B.int "); }
    void f(long x) { System.out.print("B.long "); }
}

public class Main {
    public static void main(String[] args) {
        A a = new B();
        B b = new B();
        a.f(1);
        a.f(1L);
        b.f(1L);
        b.f('c');
        a.f(2.5f);
    }
}
`, 'B.int A.double B.long B.int A.double',
      `어떤 f를 부를지(오버로딩)는 컴파일할 때 "변수 타입"으로, 그 f의 어느 클래스 것을 실행할지(오버라이딩)는 실행할 때 "객체"로 정한다.
• a.f(1): A 타입에서 f(int) 선택 → 객체가 B라 B.int
• a.f(1L): A에는 f(long)이 없다 → long은 double로 넓혀져 f(double) → B가 재정의하지 않았으니 A.double
• b.f(1L): B 타입에는 f(long)이 있다 → B.long
• b.f('c'): char는 int로 넓히는 것이 가장 가깝다 → B.int
• a.f(2.5f): float → double → A.double`),
    blanks('net', 'HDLC 프레임과 동작 모드',
      'HDLC에 대한 설명이다. 빈칸에 알맞은 말을 〈보기〉에서 골라 쓰시오.',
      [['①', '정보', 'I', 'Information', '정보 프레임', 'I 프레임'], ['②', '감독', 'S', 'Supervisory', '감독 프레임', 'S 프레임'],
        ['③', '비번호', 'U', 'Unnumbered', '비번호 프레임', 'U 프레임'], ['④', 'NRM', '정규 응답 모드', 'Normal Response Mode'],
        ['⑤', 'ABM', '비동기 균형 모드', 'Asynchronous Balanced Mode']],
      `HDLC 프레임 3종: 정보(I) 프레임은 데이터, 감독(S) 프레임은 확인 응답·흐름/오류 제어, 비번호(U) 프레임은 링크 설정·해제 같은 제어.
동작 모드: NRM(정규 응답, 주국 허락 필요), ARM(비동기 응답, 허락 없이 종국이 전송하지만 링크 관리는 주국), ABM(비동기 균형, 대등한 두 국).`,
      {
        pre: `( ① ) 프레임 : 사용자 데이터를 전송한다
( ② ) 프레임 : 확인 응답(RR, RNR, REJ)으로 흐름·오류를 제어한다
( ③ ) 프레임 : 링크 설정·해제 같은 제어에 쓴다
( ④ ) : 주국이 허락해야 종국이 전송할 수 있다
( ⑤ ) : 두 국이 대등하게, 허락 없이 전송할 수 있다`,
        options: ['정보', '감독', '비번호', 'NRM', 'ARM', 'ABM'],
      }),
    out('python', '얕은 복사', `a = [[1, 2], [3, 4, 5]]
b = a[:]
c = [row[:] for row in a]

b[0].append(9)
b.append([6])
c[1].pop()

print(len(a), sum(len(r) for r in a), sum(len(r) for r in b), sum(len(r) for r in c))
`, '2 6 7 4',
      `a[:]는 바깥 리스트만 새로 만드는 얕은 복사다. b[0]과 a[0]은 같은 리스트라 b[0].append(9)가 a에도 보인다.
b.append([6])는 b에만 붙는다. c는 줄마다 [:]로 복사해 a와 완전히 따로다.
a = [[1, 2, 9], [3, 4, 5]] → 2개, 원소 6개
b = [[1, 2, 9], [3, 4, 5], [6]] → 원소 7개
c = [[1, 2], [3, 4]] → 원소 4개`),
    term('sec', 'ISMS',
      `다음 설명에 해당하는 인증 제도를 영문 약어로 쓰시오.
기업이 정보 자산을 지키기 위해 세운 정보보호 관리체계(정책·조직·기술적 대책)가 인증 기준에 맞는지, 한국인터넷진흥원(KISA) 등이 심사해 인증한다. 일정 규모 이상의 정보통신서비스 제공자는 의무적으로 받아야 한다.`,
      ['ISMS', 'Information Security Management System'],
      `ISMS(정보보호 관리체계 인증). 개인정보 보호까지 함께 보는 통합 인증은 ISMS-P다.
비슷한 용어: PIMS(개인정보보호 관리체계, ISMS-P로 통합), ISO/IEC 27001(국제 표준).`),
    sqlOut('조인과 그룹 평균',
      '[학생], [학과] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄, 값은 공백으로 구분)',
      STUDENT,
      `SELECT d.학과명, AVG(s.점수)
FROM 학생 s JOIN 학과 d ON s.학과코드 = d.학과코드
GROUP BY d.학과명
HAVING AVG(s.점수) >= 80
ORDER BY d.학과명;`,
      '기계 88\n컴퓨터 80',
      `학과별 평균: 컴퓨터 (90 + 80 + 70) / 3 = 80, 전자 (70 + 84) / 2 = 77, 기계 88
HAVING으로 80 이상만 남기고 학과명 가나다순으로 정렬한다. 80은 "80 이상"에 들어간다.`),
    out('python', '문자열 뒤집기와 split', `s = "code-step is fun"
words = s.split()
r = [w[::-1] for w in words]
t = "".join(r).replace("e", "")
print(t, len(words[0].split("-")))
`, 'pts-docsinuf 2',
      `split()은 공백으로 나눈다 → ['code-step', 'is', 'fun']
[::-1]로 뒤집으면 'pets-edoc', 'si', 'nuf' → 이으면 'pets-edocsinuf'
replace("e", "")로 e를 모두 지우면 'pts-docsinuf'
'code-step'을 "-"로 나누면 2조각`),
    term('sec', '워터링 홀',
      `다음 설명에 해당하는 공격 기법을 쓰시오.
특정 집단(예: 어느 회사의 개발자들)이 자주 방문하는 웹사이트를 미리 알아내 감염시켜 두고, 그들이 접속하면 악성코드가 설치되도록 기다린다. 사자가 물웅덩이 근처에서 먹잇감을 기다리는 모습에서 이름이 왔다.`,
      ['워터링 홀', 'Watering Hole', '워터링홀'],
      `표적을 직접 공격하지 않고 "길목"을 감염시킨다는 점이 특징이다. 표적형 공격(APT)의 침투 단계에서 자주 쓰인다.
비슷한 말: 스피어 피싱(특정인에게 맞춤 메일), 드라이브 바이 다운로드(방문만으로 악성코드 설치).`),
    blanks('design', '브리지와 옵저버 패턴',
      '다음 설명에 해당하는 디자인 패턴을 쓰시오.',
      [['①', '브리지', 'Bridge', '브릿지'], ['②', '옵저버', 'Observer', '감시자']],
      `• 브리지(Bridge): 구조 패턴. "무엇을 하는가(기능)"와 "어떻게 하는가(구현)"를 다리로 연결해 따로 늘릴 수 있게 한다. 예: 리모컨 종류 × TV 제조사
• 옵저버(Observer): 행위 패턴. 구독·알림(발행-구독) 구조. 예: 버튼 클릭 리스너, 이벤트 알림`,
      { pre: `① 기능의 클래스 계층과 구현의 클래스 계층을 분리해, 둘을 서로 독립적으로 확장할 수 있게 하는 구조 패턴
② 한 객체의 상태가 바뀌면 그 객체에 의존하는 다른 객체들에게 자동으로 알림이 가는 일대다(1:N) 행위 패턴` }),
    out('java', '오버로딩과 자동 형 변환', `public class Main {
    static String f(int a, int b) { return "ii" + (a + b); }
    static String f(double a, double b) { return "dd" + (a + b); }
    static String f(String a, int b) { return "si" + a + b; }

    public static void main(String[] args) {
        System.out.println(f(1, 2) + " " + f(1, 2.0) + " " + f("1", 2) + " " + f('a', 1));
    }
}
`, 'ii3 dd3.0 si12 ii98',
      `• f(1, 2) → int 두 개 → "ii" + 3
• f(1, 2.0) → double이 섞여 f(double, double) → 1.0 + 2.0 = 3.0 → "dd3.0"
• f("1", 2) → "si" + "1" + 2 → 문자열 연결이라 "si12" (더하기가 아니다)
• f('a', 1) → char는 int로 넓혀진다 → 'a'(97) + 1 = 98 → "ii98"`),
    raw({
      kind: 'subnet', cat: 'net', title: 'CIDR과 서브넷 마스크',
      question: 'IP 주소가 10.20.30.40/27일 때 서브넷 마스크를 점으로 구분한 10진수로 쓰시오.',
      ip: '10.20.30.40', prefix: 27, ask: 'mask',
      explain: '/27은 앞의 27비트가 1인 마스크다. 앞 세 옥텟은 255, 마지막 옥텟은 1이 3개(11100000) → 128 + 64 + 32 = 224.',
    }),
    out('c', '배열 포인터와 평균', `#include <stdio.h>

double avg(int *p, int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) sum += *(p + i);
    return (double)sum / n;
}

int main(void) {
    int a[] = {4, 7, 1, 8, 5, 3};
    int n = sizeof(a) / sizeof(a[0]);
    printf("%.2f ", avg(a, n));
    printf("%.1f ", avg(a + 2, 3));
    printf("%d", (int)avg(&a[3], n - 3));
    return 0;
}
`, '4.67 4.7 5',
      `sizeof(a) / sizeof(a[0]) = 24 / 4 = 6 (원소 수)
• avg(a, 6) = 28 / 6 = 4.666… → %.2f → 4.67
• a + 2는 a[2]부터: 1, 8, 5 → 14 / 3 = 4.666… → %.1f → 4.7
• &a[3]부터 3개: 8, 5, 3 → 16 / 3 = 5.33… → (int)로 소수점 버림 → 5
(double)을 빼면 정수 나눗셈이 되어 결과가 달라진다.`),
    blanks('design', '비기능 요구사항 분류',
      '다음은 어느 시스템의 비기능 요구사항이다. 각 요구사항이 속하는 유형을 〈보기〉에서 골라 쓰시오.',
      [['①', '운영'], ['②', '성능'], ['③', '자원']],
      `• 운영 요구사항: 시스템을 운영·관리하는 방법 (모니터링, 백업, 로그, 배포)
• 성능 요구사항: 처리 속도·응답 시간·처리량
• 자원 요구사항: 쓸 수 있는 하드웨어·소프트웨어 자원의 한계
기능 요구사항은 "무엇을 하는가"(회원 가입, 검색)이고, 나머지는 "어떻게·얼마나 잘"에 해당하는 비기능 요구사항이다.`,
      {
        pre: `① 운영자는 관리 화면에서 서버 상태를 모니터링하고, 데이터는 매일 새벽 자동으로 백업한다
② 동시 접속자 1,000명일 때도 검색 응답 시간이 2초를 넘지 않아야 한다
③ 애플리케이션 서버는 메모리 4GB, CPU 2코어 안에서 동작해야 한다`,
        options: ['기능', '성능', '운영', '자원', '보안'],
      }),
    sqlOut('DISTINCT 결과 튜플 수',
      '[주문] 테이블에 다음 SQL을 실행했을 때 결과 행(튜플)의 개수를 쓰시오.',
      `CREATE TABLE 주문(주문번호 INTEGER PRIMARY KEY, 고객 TEXT, 상품 TEXT, 수량 INTEGER);
INSERT INTO 주문 VALUES (1, '김', '펜', 2), (2, '이', '펜', 1), (3, '김', '펜', 3), (4, '박', '책', 2),
  (5, '이', '책', 5), (6, '박', '책', 4), (7, '김', '컵', 2);`,
      `SELECT DISTINCT 고객, 상품 FROM 주문 WHERE 수량 >= 2;`,
      '4',
      `수량 2 이상: (김, 펜) (김, 펜) (박, 책) (이, 책) (박, 책) (김, 컵)
DISTINCT는 (고객, 상품) "조합"이 같은 행을 하나로 친다 → (김, 펜) (박, 책) (이, 책) (김, 컵) 4개`,
      { count: true }),
    out('python', '역순 슬라이싱', `a = list(range(1, 11))
print(a[::-3], a[8:2:-2], a[-2:-6:-1][1])
`, '[10, 7, 4, 1] [9, 7, 5] 8',
      `a = [1, 2, …, 10] (인덱스 0~9)
• a[::-3]: 끝(9번)에서 3칸씩 뒤로 → 9, 6, 3, 0번 → [10, 7, 4, 1]
• a[8:2:-2]: 8번부터 2번 "전까지" 2칸씩 뒤로 → 8, 6, 4번 → [9, 7, 5]
• a[-2:-6:-1]: -2(8번)부터 -6(4번) 전까지 → [9, 8, 7, 6] → [1]은 8`),
    term('db', '데이터베이스 설계 순서',
      '데이터베이스 설계 단계를 순서대로 기호로 쓰시오.',
      ['ㄴ → ㅁ → ㄷ → ㄱ → ㄹ'],
      `요구 조건 분석 → 개념적 설계(E-R 다이어그램, DBMS와 무관) → 논리적 설계(관계 스키마·정규화, DBMS 종류에 맞춤) → 물리적 설계(저장 구조·인덱스) → 구현
"개념 → 논리 → 물리"는 추상적인 것에서 구체적인 것으로 내려간다.`,
      { options: ['ㄱ. 물리적 설계', 'ㄴ. 요구 조건 분석', 'ㄷ. 논리적 설계', 'ㄹ. 구현', 'ㅁ. 개념적 설계'] }),
    blanks('dev', '테스트 스텁과 드라이버',
      '통합 테스트에 쓰는 임시 모듈에 대한 설명이다. 빈칸에 알맞은 용어를 쓰시오.',
      [['①', '스텁', 'Stub', '테스트 스텁'], ['②', '드라이버', 'Driver', '테스트 드라이버']],
      `• 스텁(Stub): 위에서부터 내려가는 하향식 통합에서, 아직 없는 "하위" 모듈 흉내
• 드라이버(Driver): 아래에서부터 올라가는 상향식 통합에서, 하위 모듈을 불러 주는 "상위" 모듈 흉내`,
      { pre: `( ① ): 하향식 통합 테스트에서 아직 만들지 않은 하위 모듈을 대신해, 정해진 값만 돌려주는 임시 모듈
( ② ): 상향식 통합 테스트에서 테스트할 하위 모듈을 호출하고 결과를 받아 주는 임시 상위(제어) 모듈` }),
    blanks('design', '응집도의 종류',
      '다음 설명에 해당하는 응집도를 쓰시오.',
      [['①', '기능적 응집도', '기능적', '기능 응집도', 'Functional Cohesion'],
        ['②', '순차적 응집도', '순차적', '순차 응집도', 'Sequential Cohesion'],
        ['③', '교환적 응집도', '교환적', '통신적 응집도', '통신적', 'Communicational Cohesion']],
      `응집도는 강한(좋은) 것부터: 기능적 > 순차적 > 교환(통신)적 > 절차적 > 시간적 > 논리적 > 우연적
"기순교절시논우"로 외운다. 결합도는 약할수록, 응집도는 강할수록 좋은 설계다.`,
      { pre: `① 모듈 안의 모든 요소가 하나의 기능을 수행하기 위해 함께 동작한다
② 한 요소의 출력 데이터가 다음 요소의 입력으로 쓰이는 순서로 묶여 있다
③ 같은 입력 또는 출력 데이터를 사용하는 서로 다른 기능들이 묶여 있다` }),
  ]),
];
