// 2025년 회차. 문항 개념은 공개된 회차 후기·복원 자료의 개념 목록을 참고했다 (지문·코드는 새로 씀).
import { blanks, fill, out, raw, round, sqlOut, term } from '../build';

export const Y2025 = [
  round('2025-3', {
    pass: 23.9, level: 3,
    note: '서브넷·페이지 교체·스케줄링 같은 계산 문제가 하나도 나오지 않고 SQL·관계대수가 늘었던 회차. 코드는 반복 계산보다 언어 기본 지식(빈칸, 열거형, 연산자 우선순위, unsigned)을 물었다.',
  }, [
    out('c', '구조체 포인터와 문자열 주소', `#include <stdio.h>

struct Book {
    char *title;
    int year;
};

int main(void) {
    struct Book b[3] = {{"Clean", 2008}, {"Refactor", 1999}, {"Pattern", 1994}};
    struct Book *p = b;
    printf("%s ", (p + 1)->title + 2);
    printf("%c ", *(p[2].title + 3));
    printf("%d", (++p)->year - b[2].year);
    return 0;
}
`, 'factor t 5',
      `• (p + 1)->title은 "Refactor"의 시작 주소, + 2 하면 세 번째 글자부터 → %s로 "factor"
• p[2].title + 3은 "Pattern"의 3번 글자 주소, *로 꺼내면 't' (P0 a1 t2 t3)
• ++p로 p가 b[1]을 가리킨다 → 1999 - 1994 = 5
%s는 주소부터 NUL 전까지, %c는 글자 하나를 찍는다.`),
    term('dev', '조건 커버리지',
      `다음 설명에 해당하는 화이트박스 테스트 커버리지를 쓰시오.
결정문(if 등) 안에 있는 "각각의 개별 조건식"이 참 한 번, 거짓 한 번 이상의 결과를 갖도록 테스트한다. 예: if (a > 0 && b > 0)에서 a > 0과 b > 0이 각각 참·거짓을 한 번씩 가져야 한다. 결정 전체의 결과는 따지지 않는다.`,
      ['조건 커버리지', 'Condition Coverage', '조건 검증 기준', '조건 커버리지 테스트'],
      `• 구문(문장) 커버리지: 모든 문장을 한 번 이상
• 결정(분기) 커버리지: 결정 "전체"가 참·거짓을 한 번 이상
• 조건 커버리지: 결정 안의 "개별 조건"이 참·거짓을 한 번 이상
• 조건/결정 커버리지: 둘 다 / 변경 조건·결정(MC/DC): 각 조건이 결정 결과에 독립적으로 영향을 주는지까지`),
    out('c', '문자열과 putchar', `#include <stdio.h>

int main(void) {
    char s[] = "KOREA2025";
    char *p = s + 5;
    while (*p) {
        putchar(*p - '0' + 'A');
        p++;
    }
    putchar('-');
    for (p = s; *p != '0'; p += 2) putchar(*p);
    return 0;
}
`, 'CACF-KRA',
      `s의 글자: K0 O1 R2 E3 A4 '2'5 '0'6 '2'7 '5'8
• s + 5부터 숫자 글자를 하나씩: *p - '0'은 숫자 값, + 'A'를 하면 0→A, 1→B, 2→C …
  '2' → C, '0' → A, '2' → C, '5' → F → "CACF"
• 두 번째 반복은 0, 2, 4번 글자(K, R, A)를 찍고 6번 '0'에서 멈춘다 → "KRA"`),
    term('design', 'UML 패키지 다이어그램',
      `다음 설명에 해당하는 UML 다이어그램을 쓰시오.
클래스나 유스케이스 같은 모델 요소들을 폴더처럼 묶은 그룹 사이의 의존 관계를 표현한다. 시스템이 어떤 덩어리로 나뉘어 있고 어느 덩어리가 어느 덩어리를 쓰는지 한눈에 볼 수 있는 구조 다이어그램이다.`,
      ['패키지 다이어그램', 'Package Diagram', '패키지'],
      `UML 구조(정적) 다이어그램: 클래스, 객체, 컴포넌트, 배치, 복합체 구조, 패키지
행위(동적) 다이어그램: 유스케이스, 시퀀스, 커뮤니케이션, 상태, 활동, 타이밍, 상호작용 개요
패키지 다이어그램은 의존 관계를 점선 화살표로, 패키지를 탭 달린 폴더 모양으로 그린다.`),
    out('c', 'unsigned와 비트 연산', `#include <stdio.h>

int main(void) {
    unsigned int a = 0xF0;
    unsigned int b = 0x3C;
    int c = -1;
    printf("%u ", a & b);
    printf("%u ", a ^ b);
    printf("%u ", (a | b) >> 2);
    printf("%u ", (unsigned int)c > a);
    printf("%u", ~a & 0xFF);
    return 0;
}
`, '48 204 63 1 15',
      `a = 1111 0000(240), b = 0011 1100(60)
• a & b = 0011 0000 = 48
• a ^ b = 1100 1100 = 204 (다른 비트만 1)
• a | b = 1111 1100 = 252, >> 2 → 63
• -1을 unsigned로 바꾸면 모든 비트가 1 = 4294967295 → 240보다 크다 → 1
• ~a는 위쪽 비트까지 모두 뒤집지만 & 0xFF로 아래 8비트만 남긴다 → 0000 1111 = 15`),
    blanks('os', '리눅스 기본 명령어',
      '리눅스 셸 명령어에 대한 설명이다. 빈칸에 알맞은 명령어를 쓰시오.',
      [['①', 'pwd'], ['②', 'ls'], ['③', 'cd'], ['④', 'cp']],
      `pwd(print working directory), ls(list), cd(change directory), cp(copy).
함께 나오는 것: mv(이동·이름 바꾸기), rm(삭제), mkdir(디렉터리 만들기), chmod(권한), chown(소유자), cat(내용 보기)`,
      { pre: `( ① ) : 지금 작업 중인 디렉터리의 절대 경로를 출력한다
( ② ) : 디렉터리 안의 파일 목록을 보여 준다 (-l: 자세히, -a: 숨김 파일 포함)
( ③ ) : 작업 디렉터리를 옮긴다 (예: ( ③ ) /var/log)
( ④ ) : 파일을 복사한다 (예: ( ④ ) a.txt b.txt)` }),
    fill('java', '인터페이스 구현 키워드',
      '다음 Java 코드의 빈칸 ①에 공통으로 들어갈 키워드를 쓰시오. 빈칸을 채우면 "원12.0 도형9.0"이 출력된다.',
      `interface Shape {
    double area();
    default String name() { return "도형"; }
}

class Circle ① Shape {
    double r;
    Circle(double r) { this.r = r; }
    public double area() { return 3 * r * r; }
    public String name() { return "원"; }
}

class Square ① Shape {
    double s;
    Square(double s) { this.s = s; }
    public double area() { return s * s; }
}

public class Main {
    public static void main(String[] args) {
        Shape[] arr = { new Circle(2), new Square(3) };
        for (Shape x : arr) System.out.print(x.name() + x.area() + " ");
    }
}
`, [['①', 'implements']], '원12.0 도형9.0',
      `클래스가 인터페이스를 구현할 때는 implements, 클래스를 상속할 때는 extends를 쓴다. (인터페이스끼리 상속할 때도 extends)
Square는 name()을 재정의하지 않아서 인터페이스의 default 메서드 "도형"이 쓰인다. double 값은 12.0처럼 소수점이 붙어 출력된다.`),
    blanks('net', '오류 제어 방식',
      '데이터 전송 오류 제어에 대한 설명이다. 빈칸에 알맞은 용어를 〈보기〉에서 골라 쓰시오.',
      [['①', 'FEC', '전진 오류 수정', 'Forward Error Correction'], ['②', 'BEC', '후진 오류 수정', 'Backward Error Correction'],
        ['③', '해밍 코드', 'Hamming Code', '해밍'], ['④', 'CRC', '순환 중복 검사', 'Cyclic Redundancy Check']],
      `• FEC: 재전송 없이 수신 측이 오류를 찾아 고친다 (해밍 코드, 상승 코드)
• BEC: 오류를 검출하면 재전송을 요청한다 (ARQ: Stop-and-Wait, Go-Back-N, Selective Repeat)
• 패리티는 1비트 오류 "검출"만, 해밍 코드는 1비트 오류 "정정"까지 한다
• CRC는 다항식 나눗셈의 나머지를 붙여 보내 연속된(버스트) 오류도 잘 잡는다`,
      {
        pre: `( ① ) : 수신 측이 재전송 요청 없이 오류를 스스로 검출하고 수정하는 방식
( ② ) : 오류를 검출하면 송신 측에 재전송을 요청하는 방식
( ③ ) : ( ① )의 대표 기법. 패리티 비트를 여러 개 넣어 1비트 오류의 위치까지 찾아 고친다
( ④ ) : 데이터를 생성 다항식으로 나눈 나머지를 덧붙여 보내 오류를 검출한다`,
        options: ['FEC', 'BEC', '패리티 검사', '해밍 코드', 'CRC', '체크섬'],
      }),
    out('python', 'enumerate와 sum·len', `scores = [70, 85, 90, 65, 100]
total = 0
cnt = 0
for i, s in enumerate(scores, 1):
    if i % 2 == 1 and s >= 70:
        total += s
        cnt += 1
print(total, cnt, sum(scores) // len(scores), len([s for s in scores if s > 80]))
`, '260 3 82 3',
      `enumerate(scores, 1)은 번호를 1부터 붙인다: (1, 70) (2, 85) (3, 90) (4, 65) (5, 100)
홀수 번째이면서 70 이상: 70, 90, 100 → 합 260, 3개
sum 410 // 5 = 82 (//는 몫), 80 초과: 85, 90, 100 → 3개`),
    sqlOut('CROSS JOIN과 나머지 연산',
      '[A], [B] 테이블에 다음 SQL을 실행한 결과를 쓰시오.',
      `CREATE TABLE A(x INTEGER);
INSERT INTO A VALUES (1), (2), (3), (4);
CREATE TABLE B(y INTEGER);
INSERT INTO B VALUES (1), (2), (3);`,
      'SELECT COUNT(*) FROM A CROSS JOIN B WHERE (x + y) % 2 = 0;',
      '6',
      `CROSS JOIN은 모든 조합(카티션 곱)을 만든다: 4 × 3 = 12행
그중 x + y가 짝수인 것: 홀수끼리 (1,1) (1,3) (3,1) (3,3) 4개 + 짝수끼리 (2,2) (4,2) 2개 = 6`),
    fill('java', 'super의 두 가지 쓰임',
      '다음 Java 코드의 빈칸 ①, ②에 알맞은 키워드를 쓰시오. 빈칸을 채우면 9500이 출력된다.',
      `class Account {
    protected int balance;
    Account(int balance) { this.balance = balance; }
    int fee() { return 1000; }
}

class Vip extends Account {
    Vip(int balance) { ①(balance * 2); }
    @Override
    int fee() { return ②.fee() / 2; }
}

public class Main {
    public static void main(String[] args) {
        Account a = new Vip(5000);
        System.out.println(a.balance - a.fee());
    }
}
`, [['①', 'super'], ['②', 'super']], '9500',
      `• super(…): 부모 생성자 호출. 생성자의 첫 줄에만 쓸 수 있다
• super.메서드(): 재정의하기 전의 부모 메서드 호출
balance = 5000 × 2 = 10000, fee = 1000 / 2 = 500 → 9500
this(…)는 같은 클래스의 다른 생성자를, this.x는 자기 필드를 가리킨다.`),
    term('sec', 'OTP',
      `다음 설명에 해당하는 것을 영문 약어 3글자로 쓰시오.
로그인할 때마다 새로 만들어지는, 한 번만 쓸 수 있는 비밀번호이다. 시간이나 횟수를 기준으로 토큰·앱이 값을 만들어 내므로, 비밀번호가 유출되어도 다음 로그인에는 쓸 수 없다. 2단계 인증에 많이 쓰인다.`,
      ['OTP', 'One Time Password', '일회용 비밀번호', 'One-Time Password'],
      `OTP(One Time Password). 시간 동기(TOTP)와 이벤트(횟수) 동기(HOTP) 방식이 있다.
"알고 있는 것(비밀번호) + 가지고 있는 것(OTP 기기)"을 함께 쓰면 다중 요소 인증(MFA)이 된다.`),
    out('c', '연산자 우선순위', `#include <stdio.h>

int main(void) {
    int a = 5, b = 3, c = 2;
    int r1 = a + b * c % 4;
    int r2 = a > b && b > c || a < c;
    int r3 = a & b << 1 | c;
    int r4 = (a++ + ++b) * c--;
    printf("%d %d %d %d %d", r1, r2, r3, r4, a + b + c);
    return 0;
}
`, '7 1 6 18 11',
      `• r1: *, %는 왼쪽부터 → 3 * 2 = 6, 6 % 4 = 2 → 5 + 2 = 7
• r2: 비교 → && → || 순서. (5 > 3 && 3 > 2)가 참 → 1
• r3: 시프트 > 비교 > & > ^ > | 순서. b << 1 = 6, 5 & 6 = 4, 4 | 2 = 6
• r4: a++는 5를 쓰고 6이 되고, ++b는 4가 된 뒤 쓴다 → (5 + 4) * c--(2를 쓰고 1이 됨) = 18
• 마지막: 6 + 4 + 1 = 11`),
    term('sec', 'OAuth',
      `다음 설명에 해당하는 표준 프로토콜을 쓰시오.
사용자가 비밀번호를 다른 서비스에 알려 주지 않고도, 그 서비스가 자신의 계정 정보(예: 구글 캘린더, 프로필)에 제한적으로 접근하도록 "권한을 위임"하는 개방형 표준이다. "구글로 로그인" 같은 기능에서 액세스 토큰을 발급해 쓴다.`,
      ['OAuth', 'OAuth 2.0', 'Open Authorization', 'OAuth2'],
      `OAuth는 인증보다 "인가(권한 위임)"를 위한 표준이다. 비밀번호 대신 범위(scope)와 유효 기간이 정해진 액세스 토큰을 넘긴다.
OAuth 위에 "누구인지(인증)"를 얹은 것이 OpenID Connect다.`),
    out('java', '열거형(enum)', `enum Level {
    LOW(1), MID(5), HIGH(10);

    private final int w;
    Level(int w) { this.w = w; }
    int weight() { return w * (ordinal() + 1); }
}

public class Main {
    public static void main(String[] args) {
        int sum = 0;
        for (Level l : Level.values()) sum += l.weight();
        Level m = Level.valueOf("MID");
        System.out.println(sum + " " + m.name().toLowerCase() + m.compareTo(Level.HIGH));
    }
}
`, '41 mid-1',
      `열거 상수는 선언 순서대로 ordinal() 0, 1, 2를 갖는다.
LOW 1 × 1 = 1, MID 5 × 2 = 10, HIGH 10 × 3 = 30 → 41
valueOf("MID")는 이름으로 상수를 찾는다. compareTo는 ordinal의 차이: 1 - 2 = -1
문자열 연결이라 "mid" 뒤에 -1이 그대로 붙는다.`),
    term('db', '관계 대수 나눗셈',
      '다음 두 릴레이션에 대해 [수강] ÷ [필수]의 결과를 쓰시오. (이름을 쉼표로 구분)',
      ['김, 박', '박, 김'],
      `R ÷ S는 "S의 값을 모두 가진" R의 나머지 속성 값이다. [필수]의 DB와 OS를 둘 다 수강한 학생을 찾는다.
김: DB, OS, NW → 둘 다 있음 / 이: DB, NW → OS 없음 / 박: DB, OS → 있음 / 최: OS → DB 없음
SQL로는 NOT EXISTS를 두 번 겹쳐(이중 부정) 표현한다.`,
      { tables: [
        { name: '수강', cols: ['이름', '과목'], rows: [['김', 'DB'], ['김', 'OS'], ['김', 'NW'], ['이', 'DB'], ['이', 'NW'], ['박', 'DB'], ['박', 'OS'], ['최', 'OS']] },
        { name: '필수', cols: ['과목'], rows: [['DB'], ['OS']] },
      ] }),
    blanks('db', '관계 데이터 모델 용어',
      '관계 데이터 모델에 대한 설명이다. 빈칸에 알맞은 용어를 〈보기〉에서 골라 쓰시오.',
      [['①', '튜플', 'Tuple', '행'], ['②', '릴레이션 인스턴스', 'Relation Instance', '인스턴스'], ['③', '카디널리티', 'Cardinality', '기수'], ['④', '차수', 'Degree', '디그리']],
      `• 튜플: 행(레코드) / 속성: 열(필드) / 도메인: 속성이 가질 수 있는 값의 집합
• 릴레이션 스키마는 "틀"(이름과 속성), 릴레이션 인스턴스는 어느 순간 들어 있는 "튜플들"
• 카디널리티 = 튜플(행) 수, 차수(디그리) = 속성(열) 수`,
      {
        pre: `( ① ) : 릴레이션을 구성하는 각각의 행
( ② ) : 어느 한 시점에 릴레이션에 실제로 들어 있는 ( ① )들의 집합
( ③ ) : 릴레이션에 들어 있는 ( ① )의 개수
( ④ ) : 릴레이션을 구성하는 속성의 개수`,
        options: ['튜플', '속성', '도메인', '릴레이션 스키마', '릴레이션 인스턴스', '카디널리티', '차수'],
      }),
    blanks('sec', '접근 통제 모델',
      '접근 통제 모델에 대한 설명이다. 빈칸에 알맞은 영문 약어를 쓰시오.',
      [['①', 'MAC', '강제적 접근 통제', 'Mandatory Access Control'], ['②', 'DAC', '임의적 접근 통제', 'Discretionary Access Control'], ['③', 'RBAC', '역할 기반 접근 통제', 'Role Based Access Control']],
      `• MAC(강제적): 시스템이 정한 보안 등급으로 통제 — 군·정부 기관
• DAC(임의적): 자원 소유자가 접근 권한을 정한다 — 유닉스 파일 권한, ACL
• RBAC(역할 기반): 사람이 아니라 역할(직무)에 권한을 주고, 사람에게 역할을 준다 — 기업`,
      { pre: `( ① ) : 주체와 객체의 보안 등급(비밀, 대외비 …)을 비교해 시스템이 강제로 접근을 허용하거나 막는다
( ② ) : 객체의 소유자가 다른 사용자에게 접근 권한을 마음대로 주거나 뺏을 수 있다
( ③ ) : 사용자에게 직접 권한을 주지 않고, 직무에 따른 역할에 권한을 묶어 역할을 부여한다` }),
    blanks('dev', '테스트 케이스 구성 요소',
      'IEEE 829 기준 테스트 케이스의 구성 요소에 대한 설명이다. 빈칸에 알맞은 말을 〈보기〉에서 골라 쓰시오.',
      [['①', '테스트 조건', '조건'], ['②', '테스트 데이터', '데이터'], ['③', '예상 결과', '기대 결과', '예상 결괏값']],
      `테스트 케이스 = 식별자 + 테스트 항목 + 테스트 조건 + 테스트 데이터 + 예상 결과(+ 실행 절차)
실제 결과를 예상 결과와 비교해 결함을 판단한다. 예상 결과를 정해 주는 근거를 "테스트 오라클"이라 한다.`,
      {
        pre: `( ① ) : 테스트를 실행하기 전에 갖춰야 할 환경이나 상태 (예: 로그인한 회원)
( ② ) : 테스트에 실제로 넣는 입력값 (예: 아이디 "guest", 비밀번호 "1234")
( ③ ) : 테스트를 실행했을 때 나와야 하는 결과 (예: "비밀번호가 틀렸습니다" 표시)`,
        options: ['테스트 조건', '테스트 데이터', '예상 결과', '테스트 오라클', '테스트 하네스'],
      }),
    sqlOut('COUNT와 NULL, IN과 OR',
      '[회원] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (값은 공백으로 구분)',
      `CREATE TABLE 회원(아이디 TEXT PRIMARY KEY, 등급 TEXT, 나이 INTEGER, 전화 TEXT);
INSERT INTO 회원 VALUES ('a1', 'A', 25, '010-1111'), ('a2', 'B', 45, NULL), ('a3', 'C', 50, '010-3333'),
  ('a4', 'A', 33, NULL), ('a5', 'C', 20, '010-5555'), ('a6', 'B', 29, '010-6666');`,
      `SELECT COUNT(*), COUNT(전화) FROM 회원
WHERE 등급 IN ('A', 'B') OR 나이 > 40;`,
      '5 3',
      `등급이 A·B이거나 40세 초과: a1, a2, a3(50세), a4, a6 → 5행 (a5는 C등급·20세라 빠진다)
COUNT(*)는 행 수 5, COUNT(전화)는 NULL을 세지 않는다 → a2, a4를 빼면 3`),
  ]),

  round('2025-2', {
    pass: 27.83, level: 3,
    note: '1회보다 쉬웠지만 프로그래밍은 여전히 높은 편이었던 회차. C 포인터·구조체 4문항이 연달아 나왔고, Java는 스코프·예외·static이 모였다. 이론은 기출과 겹치는 문항이 많았다.',
  }, [
    blanks('db', '파일 편성 방법',
      '레코드를 저장하고 찾아가는 파일 편성 방법에 대한 설명이다. 빈칸에 알맞은 용어를 쓰시오.',
      [['①', '순차', '순차 파일', 'Sequential', '순차 편성'], ['②', '인덱스', '색인', '인덱스 순차', '색인 순차', 'Indexed Sequential', '색인 순차 파일'], ['③', '해싱', '직접', '해시', 'Hashing', '직접 파일', 'Direct']],
      `• 순차 파일: 키 순서대로 저장, 처음부터 차례로 찾는다 (일괄 처리에 좋음)
• 색인(인덱스) 순차 파일: 순차 저장 + 색인으로 바로 찾기도 가능 (기본·색인·오버플로 구역)
• 직접(해싱) 파일: 해시 함수로 주소를 계산해 바로 접근 (충돌 처리 필요)`,
      { pre: `( ① ) 파일 : 레코드를 키 순서대로 저장하고, 찾을 때도 처음부터 차례로 읽는다
( ② ) 순차 파일 : 키와 레코드 위치를 담은 별도의 ( ② )를 두어, 순서대로도 읽고 바로 찾아가기도 한다
( ③ ) 파일 : 키를 ( ③ ) 함수에 넣어 계산한 주소에 레코드를 저장하고 바로 찾아간다` }),
    out('java', '변수의 범위(스코프)', `public class Main {
    static int x = 1;
    int y = 10;

    void run() {
        int x = 5;
        for (int i = 0; i < 3; i++) {
            int y = i * 2;
            x += y;
            this.y += Main.x;
        }
        Main.x += x;
        System.out.println(x + " " + y + " " + Main.x);
    }

    public static void main(String[] args) {
        new Main().run();
        System.out.println(x);
    }
}
`, '11 13 12\n12',
      `• run 안의 x는 지역 변수(5)라 static x(1)를 가린다. static 쪽은 Main.x로 부른다
• 반복문 안의 y는 블록 지역 변수(0, 2, 4)라 반복이 끝나면 사라지고, this.y는 필드다
• 지역 x: 5 + 0 + 2 + 4 = 11 / 필드 y: 10 + 1 + 1 + 1 = 13 / Main.x: 1 + 11 = 12
• 반복문 밖의 y는 필드 y(13)를 뜻한다. main의 x는 static x(12)`),
    term('db', '속성(Attribute)',
      '관계 데이터베이스에서 릴레이션의 열(column)을 이르는 말로, 파일 구조의 필드(field)에 해당하는 용어를 쓰시오.',
      ['속성', 'Attribute', '애트리뷰트', '어트리뷰트'],
      `관계 모델 ↔ 파일 ↔ 표: 릴레이션 ↔ 파일 ↔ 테이블 / 튜플 ↔ 레코드 ↔ 행 / 속성 ↔ 필드 ↔ 열
속성의 수를 차수(Degree), 튜플의 수를 카디널리티(Cardinality)라 한다.`),
    out('java', 'try-catch-finally의 흐름', `public class Main {
    static int calc(int[] a, int i) {
        try {
            System.out.print("T");
            return a[i] / (i - 1);
        } catch (ArithmeticException e) {
            System.out.print("A");
            return -1;
        } catch (RuntimeException e) {
            System.out.print("R");
            return -2;
        } finally {
            System.out.print("F");
        }
    }

    public static void main(String[] args) {
        int[] a = {4, 6, 8};
        int s = 0;
        for (int i = 0; i < 4; i++) s += calc(a, i);
        System.out.println(" " + s);
    }
}
`, 'TFTAFTFTRF 1',
      `finally는 return이 있어도 반드시 실행된다.
• i=0: 4 / -1 = -4 → "TF"
• i=1: 6 / 0 → ArithmeticException → "TAF", -1
• i=2: 8 / 1 = 8 → "TF"
• i=3: a[3] → ArrayIndexOutOfBoundsException. ArithmeticException이 아니므로 다음 catch(RuntimeException)로 → "TRF", -2
합: -4 - 1 + 8 - 2 = 1. catch는 위에서부터 맞는 것 하나만 실행된다.`),
    term('db', '프로젝트 연산 결과',
      '다음 [학생] 릴레이션에 관계 대수 π학과(학생)을 수행한 결과 릴레이션의 튜플 수를 쓰시오.',
      ['3'],
      `π(프로젝트)는 지정한 속성(열)만 뽑는다. 관계 대수의 결과는 "집합"이라 중복 튜플이 없어진다.
학과 값: 컴퓨터, 전자, 컴퓨터, 기계, 전자, 컴퓨터 → {컴퓨터, 전자, 기계} 3개
SQL의 SELECT 학과 FROM 학생은 중복을 남겨 6행이 나온다(DISTINCT를 써야 3행).`,
      { tables: [{ name: '학생', cols: ['학번', '이름', '학과', '학년'], rows: [[1, '가윤', '컴퓨터', 1], [2, '나래', '전자', 2], [3, '다온', '컴퓨터', 3], [4, '라희', '기계', 1], [5, '마루', '전자', 4], [6, '바다', '컴퓨터', 2]] }] }),
    out('c', '구조체 포인터로 만든 원형 큐', `#include <stdio.h>

#define N 4

typedef struct {
    int data[N];
    int front, rear;
} Queue;

void enq(Queue *q, int v) {
    q->data[q->rear] = v;
    q->rear = (q->rear + 1) % N;
}

int deq(Queue *q) {
    int v = q->data[q->front];
    q->front = (q->front + 1) % N;
    return v;
}

int main(void) {
    Queue q = {{0}, 0, 0};
    enq(&q, 1); enq(&q, 2); enq(&q, 3);
    int a = deq(&q);
    enq(&q, 4); enq(&q, 5);
    int b = deq(&q);
    b += deq(&q);
    printf("%d %d %d %d", a, b, q.front, q.rear);
    return 0;
}
`, '1 5 3 1',
      `% N으로 끝에 닿으면 0번 칸으로 돌아간다(원형 큐).
enq 1, 2, 3 → data[0..2], rear 3 / deq → 1, front 1
enq 4 → data[3], rear 0 / enq 5 → data[0], rear 1
deq 두 번 → 2 + 3 = 5, front 3
구조체를 포인터로 넘겼기 때문에(q->) 함수 안의 변경이 main의 q에 남는다.`),
    term('dev', 'AJAX',
      `다음 설명에 해당하는 웹 기술을 쓰시오.
웹 페이지 전체를 새로 고치지 않고, JavaScript로 서버와 비동기로 데이터를 주고받아 페이지의 "일부분만" 갱신하는 기법이다. 검색어 자동 완성, 무한 스크롤 등에 쓰인다.`,
      ['AJAX', 'Asynchronous JavaScript and XML', 'Ajax'],
      `AJAX(Asynchronous JavaScript And XML). 이름에 XML이 있지만 요즘은 주로 JSON을 주고받는다.
XMLHttpRequest나 fetch()로 요청을 보내고, 응답이 오면 화면 일부를 바꾼다.`),
    out('java', 'static 메서드는 재정의되지 않는다', `class Parent {
    static String who() { return "P"; }
    String me() { return "p"; }
    String call() { return who() + me(); }
}

class Child extends Parent {
    static String who() { return "C"; }
    @Override
    String me() { return "c"; }
}

public class Main {
    public static void main(String[] args) {
        Parent a = new Child();
        Child b = new Child();
        System.out.println(a.who() + b.who() + a.me() + a.call());
    }
}
`, 'PCcPc',
      `static 메서드는 객체가 아니라 "변수의 타입(클래스)"으로 정해진다. 자식의 같은 이름 static 메서드는 부모 것을 가릴(hiding) 뿐 재정의가 아니다.
• a.who(): a의 타입이 Parent → "P" / b.who() → "C"
• a.me(): 인스턴스 메서드는 실제 객체(Child) → "c"
• a.call(): Parent 안의 who()는 Parent.who → "P", me()는 Child → "c"`),
    term('dev', '분기 커버리지 최소 테스트 수',
      '다음 코드에서 분기(결정) 커버리지 100%를 만족하려면 최소 몇 개의 테스트 케이스가 필요한지 쓰시오.',
      ['3'],
      `분기 커버리지는 모든 결정(if)이 참과 거짓을 한 번씩 갖게 한다.
• 바깥 if: 참(a > 0)과 거짓(a ≤ 0)이 필요하다
• 안쪽 if는 바깥이 참일 때만 실행되므로, 참(b > 0)과 거짓(b ≤ 0)을 위해 바깥 참 경우가 두 번 필요하다
→ (a > 0, b > 0), (a > 0, b ≤ 0), (a ≤ 0) 세 개`,
      { pre: `if (a > 0) {
    if (b > 0)
        X();
    else
        Y();
} else {
    Z();
}` }),
    out('c', '이중 포인터로 결과 돌려받기', `#include <stdio.h>

typedef struct {
    char name[8];
    int score;
} Student;

void best(Student *arr, int n, Student **out) {
    *out = arr;
    for (int i = 1; i < n; i++)
        if (arr[i].score > (*out)->score) *out = &arr[i];
}

int main(void) {
    Student s[3] = {{"Kim", 80}, {"Lee", 95}, {"Park", 90}};
    Student *p = NULL;
    Student **pp = &p;
    best(s, 3, pp);
    (*pp)->score += 5;
    printf("%s %d %d", p->name, s[1].score, (int)(p - s));
    return 0;
}
`, 'Lee 100 1',
      `포인터 p 자체를 함수 안에서 바꾸려면 p의 주소(Student **)를 넘겨야 한다.
best가 *out = &arr[1]로 p가 Lee를 가리키게 한다. (*pp)->score는 p->score와 같아서 s[1].score가 100이 된다.
p - s는 두 포인터 사이의 "원소 개수" 차이 → 1`),
    term('design', '프록시 패턴',
      `다음 설명에 해당하는 GoF 디자인 패턴을 쓰시오.
실제 객체에 바로 접근하지 않고 "대리 객체"를 거치게 한다. 대리 객체는 실제 객체와 같은 인터페이스를 가지며, 실제 객체가 정말 필요할 때까지 생성을 미루거나(지연 로딩), 접근 권한을 검사하거나, 원격 객체를 로컬처럼 쓰게 해 준다.`,
      ['프록시', 'Proxy', '대리자'],
      `프록시(Proxy)는 구조 패턴이다. 구조 패턴 7가지: 어댑터, 브리지, 컴포지트, 데코레이터, 퍼사드, 플라이웨이트, 프록시
데코레이터도 감싸는 구조지만 "기능을 덧붙이는" 것이 목적이고, 프록시는 "접근을 통제"하는 것이 목적이다.`),
    out('python', '딕셔너리 컴프리헨션과 비트 AND', `nums = [3, 5, 6, 9, 12]
d = {n: n & 6 for n in nums}
r = {k: v for k, v in d.items() if v}
print(d[9], list(r.values()), sum(k for k in r if k & 1))
`, '0 [2, 4, 6, 4] 8',
      `6 = 0110. & 6은 두 비트(4와 2 자리)만 남긴다.
3(0011) → 2, 5(0101) → 4, 6(0110) → 6, 9(1001) → 0, 12(1100) → 4
r은 값이 0이 아닌 것만: {3: 2, 5: 4, 6: 6, 12: 4}
k & 1이 1이면 홀수 → 3 + 5 = 8`),
    blanks('net', '잘 알려진 포트 번호',
      '다음 서비스가 기본으로 쓰는 포트 번호를 쓰시오.',
      [['① SSH', '22'], ['② DNS', '53'], ['③ HTTPS', '443']],
      `0~1023번은 잘 알려진(well-known) 포트다.
FTP 20(데이터)/21(제어), SSH 22, Telnet 23, SMTP 25, DNS 53, HTTP 80, POP3 110, IMAP 143, SNMP 161, HTTPS 443`),
    out('c', '연결 리스트 노드 건너뛰기', `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int v;
    struct Node *next;
} Node;

Node *push(Node *head, int v) {
    Node *n = malloc(sizeof(Node));
    n->v = v;
    n->next = head;
    return n;
}

int main(void) {
    Node *head = NULL;
    for (int i = 1; i <= 5; i++) head = push(head, i * i);
    Node *p = head;
    while (p != NULL && p->next != NULL) {
        p->next = p->next->next;
        p = p->next;
    }
    for (p = head; p != NULL; p = p->next) printf("%d ", p->v);
    return 0;
}
`, '25 9 1',
      `push는 새 노드를 맨 앞에 붙인다 → 25 → 16 → 9 → 4 → 1
p->next = p->next->next는 다음 노드를 건너뛴다(16, 4가 빠짐).
25에서 16을 건너뛰고 9로, 9에서 4를 건너뛰고 1로, 1은 다음이 없어 멈춘다 → 25 9 1`),
    raw({
      kind: 'subnet', cat: 'net', title: '서브넷 마스크와 네트워크 주소',
      question: 'IP 주소가 192.168.100.200이고 서브넷 마스크가 255.255.255.224일 때, 이 호스트가 속한 네트워크 주소를 쓰시오.',
      ip: '192.168.100.200', prefix: 27, ask: 'network',
      explain: '255.255.255.224는 /27이다. 마지막 옥텟이 32씩 나뉜다(0, 32, 64, … 192, 224). 200은 192 ~ 223 구간 → 네트워크 주소 192.168.100.192. IP와 마스크를 비트 AND 해도 같다.',
    }),
    out('java', 'static 중첩 클래스', `public class Main {
    static class Counter {
        static int total = 0;
        int count = 0;
        void hit() { count++; total++; }
    }

    public static void main(String[] args) {
        Counter a = new Counter();
        Counter b = new Counter();
        a.hit(); a.hit(); b.hit();
        Main.Counter c = new Main.Counter();
        c.hit();
        System.out.println(a.count + " " + b.count + " " + c.count + " " + Counter.total);
    }
}
`, '2 1 1 4',
      `static 중첩 클래스는 바깥 클래스의 객체 없이 new Counter()로 만들 수 있다.
count는 객체마다 따로(2, 1, 1), static 필드 total은 모든 Counter 객체가 하나를 함께 쓴다 → 4`),
    raw({
      kind: 'sched', cat: 'os', title: '라운드 로빈 평균 대기 시간',
      question: '다음 프로세스를 RR(시간 할당량 3) 기법으로 스케줄링할 때 평균 대기 시간을 쓰시오.',
      procs: [{ name: 'P1', arrival: 0, burst: 5 }, { name: 'P2', arrival: 1, burst: 3 }, { name: 'P3', arrival: 2, burst: 8 }, { name: 'P4', arrival: 3, burst: 6 }],
      algo: 'RR', quantum: 3, ask: 'avgWait',
      explain: 'RR은 도착 순서대로 시간 할당량(3)만큼씩 돌아가며 실행한다. 할당량을 다 쓴 프로세스는 대기열 맨 뒤로 가는데, 같은 시각에 새로 도착한 프로세스가 먼저 줄을 선다. 대기 시간 = 종료 - 도착 - 실행 시간.',
    }),
    out('c', '포인터 증감과 문자 출력', `#include <stdio.h>

struct Data {
    char *s;
    int n;
};

int main(void) {
    char str[] = "ABCDEF";
    struct Data d = {str, 2};
    struct Data *p = &d;
    printf("%c", *p->s++);
    printf("%c", *++p->s);
    printf("%c", ++*p->s);
    printf("%c ", p->s[p->n]);
    printf("%s", str);
    return 0;
}
`, 'ACDE ABDDEF',
      `->가 ++, *보다 먼저 묶인다.
• *p->s++ = *(p->s)++ : 지금 글자 'A'를 쓰고 s를 한 칸 옮긴다 (s → B)
• *++p->s = *(++p->s) : s를 먼저 옮기고(→ C) 'C'
• ++*p->s = ++(*p->s) : 가리키는 글자 자체를 1 올린다 'C' → 'D' (str이 "ABDDEF"로 바뀜)
• p->s[p->n] : s가 str + 2이므로 str[4] = 'E'`),
    blanks('os', '선점·비선점 스케줄링',
      'CPU 스케줄링 기법에 대한 설명이다. 빈칸에 알맞은 기법을 〈보기〉에서 골라 쓰시오.',
      [['①', 'HRN', 'Highest Response ratio Next'], ['②', 'SRT', 'Shortest Remaining Time'], ['③', 'RR', '라운드 로빈', 'Round Robin']],
      `• 비선점: FCFS, SJF, HRN, 우선순위(비선점) — 한번 CPU를 잡으면 끝까지
• 선점: RR, SRT, MLQ, MLFQ, 우선순위(선점) — 더 급한 프로세스가 오면 빼앗는다
HRN의 우선순위 = (대기 시간 + 서비스 시간) / 서비스 시간 → SJF의 기아 현상을 줄인다.`,
      {
        pre: `( ① ) : 비선점. (대기 시간 + 서비스 시간) / 서비스 시간이 가장 큰 프로세스를 먼저 실행한다
( ② ) : 선점. 새 프로세스가 오면 남은 실행 시간을 비교해 더 짧은 쪽에 CPU를 넘긴다
( ③ ) : 선점. 정해진 시간 할당량만큼만 실행하고 대기열 맨 뒤로 보낸다`,
        options: ['FCFS', 'SJF', 'HRN', 'RR', 'SRT', 'MLQ'],
      }),
    term('sec', 'SYN 플러딩',
      `다음 설명에 해당하는 공격 기법을 쓰시오.
TCP의 3-way handshake에서, 공격자가 출발지를 위조한 SYN 패킷만 대량으로 보내고 마지막 ACK는 보내지 않는다. 서버는 응답(SYN+ACK)을 보낸 뒤 연결 대기 큐에 반쯤 열린 연결을 계속 쌓아 두다가, 큐가 가득 차 정상 사용자의 연결을 받지 못하게 된다.`,
      ['SYN 플러딩', 'SYN Flooding', 'SYN Flood', 'TCP SYN Flooding', 'SYN 플러드'],
      `서비스 거부(DoS) 공격의 하나다. 대응: SYN 쿠키, 대기 큐 늘리기, 반열림 연결의 타임아웃 줄이기.
비슷한 DoS: 스머프(ICMP 브로드캐스트 증폭), 랜드 어택(출발지 = 목적지), 티어드롭(조각 오프셋 조작), Ping of Death(큰 ICMP)`),
  ]),

  round('2025-1', {
    pass: 15.18, level: 5,
    note: '개편 뒤 두 번째로 합격률이 낮았던 회차. 코드가 짧은 코딩 테스트 수준이었다: 예외 흐름과 continue·finally, 2차원 동적 할당, 생성자 순서와 필드 은닉, 재귀 제너레이터, 비트 마스킹.',
  }, [
    blanks('sec', '세션 하이재킹',
      'TCP 연결을 가로채는 공격에 대한 설명이다. 빈칸에 알맞은 말을 쓰시오.',
      [['①', '세션 하이재킹', 'Session Hijacking', 'TCP 세션 하이재킹', 'TCP 하이재킹'], ['②', '시퀀스 번호', '순서 번호', 'Sequence Number', 'SEQ', '시퀀스']],
      `세션 하이재킹은 인증이 끝난 세션을 가로채 비밀번호 없이 그 사용자 행세를 한다.
TCP는 시퀀스 번호로 패킷 순서를 맞추므로, 공격자가 번호를 맞춰 끼어들면(그리고 원래 사용자를 끊으면) 서버는 구별하지 못한다.
대응: 암호화된 통신(SSH, TLS), 세션 ID를 주기적으로 바꾸기, 비정상 ACK 폭주(ACK Storm) 탐지.`,
      { pre: `( ① )은 사용자와 서버 사이에 이미 인증이 끝난 연결을 공격자가 가로채는 공격이다.
TCP는 주고받는 바이트마다 ( ② )를 붙여 순서를 맞추는데, 공격자는 이 ( ② )를 알아내거나 추측해
정상 사용자인 것처럼 패킷을 끼워 넣는다.` }),
    blanks('db', '무결성 제약 조건',
      '관계 데이터베이스의 무결성 제약 조건에 대한 설명이다. 빈칸에 알맞은 말을 쓰시오.',
      [['①', '개체 무결성', 'Entity Integrity', '개체'], ['②', '참조 무결성', 'Referential Integrity', '참조'], ['③', '도메인 무결성', 'Domain Integrity', '도메인']],
      `• 개체 무결성: 기본키는 NULL이 될 수 없고 중복될 수 없다
• 참조 무결성: 외래키는 참조하는 테이블의 기본키 값이거나 NULL이어야 한다
• 도메인 무결성: 속성 값은 그 속성의 도메인(타입·범위·형식)에 맞아야 한다
그 밖에 키 무결성(릴레이션에 같은 튜플 없음), NULL 무결성, 고유 무결성 등이 있다.`,
      { pre: `( ① ) : 기본키를 구성하는 속성은 NULL 값이나 중복 값을 가질 수 없다
( ② ) : 외래키 값은 NULL이거나, 참조하는 릴레이션의 기본키 값 중 하나여야 한다
( ③ ) : 각 속성 값은 그 속성에 정의된 값의 범위(타입·형식) 안에 있어야 한다` }),
    term('net', 'CRC',
      `다음 설명에 해당하는 오류 검출 방식을 영문 약어로 쓰시오.
보낼 데이터를 미리 정한 생성 다항식으로 나눈 "나머지"를 데이터 뒤에 붙여 보낸다. 받는 쪽은 같은 다항식으로 나눠 나머지가 0이 아니면 오류로 판단한다. 여러 비트가 연속으로 깨지는 집단(버스트) 오류도 잘 찾아내 이더넷 등에서 널리 쓴다.`,
      ['CRC', 'Cyclic Redundancy Check', '순환 중복 검사', '순환 중복 검사(CRC)'],
      `CRC(Cyclic Redundancy Check, 순환 중복 검사). 패리티는 홀수 개 비트 오류만, 체크섬은 합으로 검사한다.
CRC는 "검출"만 하고, 고치는 것은 재전송(ARQ)이나 해밍 코드 같은 FEC가 맡는다.`),
    blanks('sec', '악성 소프트웨어 유형',
      '악성 소프트웨어에 대한 설명이다. 빈칸에 알맞은 말을 〈보기〉에서 골라 쓰시오.',
      [['①', '스케어웨어', 'Scareware'], ['②', '랜섬웨어', 'Ransomware'], ['③', '웜', 'Worm']],
      `• 스케어웨어: 겁(scare)을 주는 가짜 경고로 결제·설치를 유도
• 랜섬웨어: 파일을 암호화하고 몸값(ransom)을 요구
• 웜: 숙주 파일 없이 스스로 복제해 네트워크로 퍼짐 (바이러스는 다른 파일에 기생)
• 애드웨어: 광고를 띄움 / 키로거: 키 입력을 훔침 / 루트킷: 침입 흔적을 숨기고 관리자 권한 유지`,
      {
        pre: `( ① ) : "PC가 바이러스 37개에 감염되었습니다!" 같은 가짜 경고 창으로 겁을 주어, 쓸모없는 프로그램을 사게 하거나 악성 프로그램을 설치하게 한다
( ② ) : 사용자의 파일을 암호화해 열지 못하게 하고, 풀어 주는 대가로 돈(주로 암호화폐)을 요구한다
( ③ ) : 다른 파일에 기생하지 않고 스스로를 복제해 네트워크를 통해 다른 컴퓨터로 퍼진다`,
        options: ['스케어웨어', '애드웨어', '랜섬웨어', '키로거', '루트킷', '웜'],
      }),
    out('java', '예외와 continue, finally', `public class Main {
    public static void main(String[] args) {
        int[] data = {10, 0, 5};
        String s = "";
        for (int i = 0; i <= data.length; i++) {
            try {
                int v = 100 / data[i];
                s += v;
                if (v > 15) throw new IllegalStateException();
            } catch (ArithmeticException e) {
                s += "A";
            } catch (ArrayIndexOutOfBoundsException | IllegalStateException e) {
                s += "X";
                continue;
            } finally {
                s += "F";
            }
            s += ",";
        }
        System.out.println(s);
    }
}
`, '10F,AF,20XFXF',
      `• i=0: 100 / 10 = 10 → "10", finally "F", 반복 끝의 "," → "10F,"
• i=1: 0으로 나눔 → "A", "F", "," → "AF,"
• i=2: 20 → "20", 15보다 커서 IllegalStateException → "X" 후 continue. continue해도 finally "F"는 실행되고 ","는 건너뛴다 → "20XF"
• i=3: data[3]은 범위 밖 → "X", continue, "F" → "XF"
i <= data.length라서 한 번 더 도는 것이 함정이다.`),
    blanks('net', 'ARP와 RARP',
      '주소 변환 프로토콜에 대한 설명이다. 빈칸에 알맞은 프로토콜을 영문 약어로 쓰시오.',
      [['①', 'ARP', 'Address Resolution Protocol'], ['②', 'RARP', 'Reverse Address Resolution Protocol']],
      `ARP: IP → MAC (같은 네트워크로 프레임을 보내려면 상대의 MAC 주소가 필요하다)
RARP: MAC → IP (디스크 없는 기기가 부팅할 때 자기 IP를 얻던 방식, 지금은 DHCP가 대신한다)
ARP 응답을 위조해 통신을 가로채는 공격이 ARP 스푸핑이다.`,
      { pre: `( ① ) : 상대의 IP 주소를 알 때, 같은 네트워크에 브로드캐스트로 물어 MAC(물리) 주소를 알아낸다
( ② ) : 자신의 MAC 주소만 알 때, 서버에 물어 자신의 IP 주소를 알아낸다` }),
    sqlOut('두 테이블 조건 조인',
      '[상품], [판매] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄, 값은 공백으로 구분)',
      `CREATE TABLE 상품(상품코드 TEXT PRIMARY KEY, 상품명 TEXT, 가격 INTEGER);
INSERT INTO 상품 VALUES ('P1', '펜', 1500), ('P2', '노트', 3000), ('P3', '가방', 25000), ('P4', '컵', 8000);
CREATE TABLE 판매(판매번호 INTEGER PRIMARY KEY, 상품코드 TEXT, 수량 INTEGER);
INSERT INTO 판매 VALUES (1, 'P1', 10), (2, 'P2', 3), (3, 'P1', 4), (4, 'P3', 1), (5, 'P4', 2), (6, 'P2', 5);`,
      `SELECT p.상품명, s.수량 * p.가격
FROM 상품 p, 판매 s
WHERE p.상품코드 = s.상품코드 AND s.수량 * p.가격 >= 15000
ORDER BY s.판매번호;`,
      '펜 15000\n가방 25000\n컵 16000\n노트 15000',
      `FROM에 테이블을 쉼표로 나열하고 WHERE에 연결 조건을 쓰면 내부 조인과 같다.
판매마다 금액: 1번 펜 15000 ✓ / 2번 노트 9000 / 3번 펜 6000 / 4번 가방 25000 ✓ / 5번 컵 16000 ✓ / 6번 노트 15000 ✓
15000 "이상"이라 15000도 포함된다. 판매번호 순서로 정렬한다.`),
    blanks('db', '관계형 모델 용어',
      '관계형 데이터 모델에 대한 설명이다. 빈칸에 알맞은 용어를 〈보기〉에서 골라 쓰시오.',
      [['①', '차수', 'Degree', '디그리'], ['②', '카디널리티', 'Cardinality', '기수'], ['③', '도메인', 'Domain'], ['④', '외래키', 'Foreign Key', 'FK', '외부키']],
      `• 차수(Degree): 속성(열)의 수 — 잘 바뀌지 않는다
• 카디널리티(Cardinality): 튜플(행)의 수 — 데이터를 넣고 지울 때마다 바뀐다
• 도메인: 한 속성이 가질 수 있는 원자값의 집합 (예: 성별 = {남, 여})
• 외래키: 다른 릴레이션의 기본키를 참조하는 속성 → 참조 무결성`,
      {
        pre: `( ① ) : 하나의 릴레이션을 구성하는 속성의 수
( ② ) : 하나의 릴레이션에 들어 있는 튜플의 수
( ③ ) : 하나의 속성이 가질 수 있는 같은 타입의 원자값들의 집합
( ④ ) : 다른 릴레이션의 기본키를 참조하는 속성(또는 속성들의 집합)`,
        options: ['차수', '카디널리티', '도메인', '스키마', '외래키', '후보키'],
      }),
    term('net', '같은 서브넷 고르기',
      'IP 주소가 192.168.20.77/27인 호스트와 같은 서브넷에 있으며 호스트에 할당할 수 있는 IP 주소를 〈보기〉에서 모두 골라 기호로 쓰시오.',
      ['ㄷ, ㅂ', 'ㅂ, ㄷ'],
      `/27은 마지막 옥텟을 32개씩 나눈다: 0~31, 32~63, 64~95, 96~127 …
77은 64~95 구간. 64는 네트워크 주소, 95는 브로드캐스트 주소라 호스트에 줄 수 없다.
→ 90(ㄷ), 70(ㅂ)만 해당한다. 63은 앞 서브넷, 96은 다음 서브넷이다.`,
      { options: ['ㄱ. 192.168.20.63', 'ㄴ. 192.168.20.64', 'ㄷ. 192.168.20.90', 'ㄹ. 192.168.20.95', 'ㅁ. 192.168.20.96', 'ㅂ. 192.168.20.70'] }),
    out('c', '정렬된 배열에 끼워 넣기', `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[10] = "BDFH";
    char c = 'E';
    int n = strlen(s);
    int i = n - 1;
    while (i >= 0 && s[i] > c) {
        s[i + 1] = s[i];
        i--;
    }
    s[i + 1] = c;
    s[n + 1] = '\\0';
    printf("%s %d %c", s, i + 1, s[n] - 2);
    return 0;
}
`, 'BDEFH 2 F',
      `삽입 정렬의 한 단계다. 뒤에서부터 c('E')보다 큰 글자를 한 칸씩 뒤로 민다.
H → s[4], F → s[3], D는 E보다 작아서 멈춤(i = 1) → s[2] = 'E' → "BDEFH"
글자 비교는 아스키 코드 값 비교다. s[4]는 'H', 'H' - 2 = 'F'`),
    out('c', '이중 포인터와 2차원 동적 할당', `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int r = 3, c = 4;
    int **m = malloc(sizeof(int *) * r);
    for (int i = 0; i < r; i++) {
        m[i] = malloc(sizeof(int) * c);
        for (int j = 0; j < c; j++) m[i][j] = i * c + j;
    }
    int sum = 0;
    for (int i = 0; i < r; i++)
        for (int j = 0; j < c; j++)
            sum += (i + j) % 2 == 0 ? m[i][j] : -m[i][j];
    printf("%d %d", sum, *(*(m + 2) + 1));
    for (int i = 0; i < r; i++) free(m[i]);
    free(m);
    return 0;
}
`, '-2 9',
      `m은 "행 포인터들의 배열"을 가리키고, 행마다 따로 malloc한다. 값은 0~11이 행 순서로 채워진다.
행0: +0 -1 +2 -3 = -2 / 행1: -4 +5 -6 +7 = 2 / 행2: +8 -9 +10 -11 = -2 → 합 -2
*(*(m + 2) + 1)은 m[2][1] = 9`),
    blanks('design', '결합도 종류',
      '모듈 결합도에 대한 설명이다. 빈칸에 알맞은 결합도를 쓰시오.',
      [['①', '내용 결합도', '내용', 'Content Coupling'], ['②', '스탬프 결합도', '스탬프', 'Stamp Coupling'], ['③', '공통 결합도', '공통', 'Common Coupling']],
      `결합도(약함 → 강함): 자료 < 스탬프 < 제어 < 외부 < 공통 < 내용
• 자료: 필요한 값만 넘김 / 스탬프: 자료 구조(배열·구조체)를 통째로 넘김
• 제어: 상대의 처리 흐름을 정하는 제어 신호(플래그)를 넘김
• 외부: 외부에서 선언한 데이터·통신 규약을 참조 / 공통: 전역 변수 공유 / 내용: 상대 내부를 직접 참조`,
      { pre: `( ① ) : 한 모듈이 다른 모듈의 내부 기능이나 내부 자료를 직접 참조하거나 수정한다
( ② ) : 모듈 사이에 배열이나 레코드 같은 자료 구조를 통째로 넘기지만, 받는 쪽은 그 일부만 쓴다
( ③ ) : 여러 모듈이 하나의 전역 변수(공유 데이터 영역)를 함께 참조하고 고친다` }),
    out('java', '생성자 순서와 필드 은닉', `class A {
    static int cnt = 0;
    int v = 1;
    A() { cnt++; v += add(); }
    int add() { return 10; }
}

class B extends A {
    int v = 2;
    B() { super(); cnt += 10; v += add(); }
    @Override
    int add() { return v * 100; }
}

public class Main {
    public static void main(String[] args) {
        A x = new B();
        B y = new B();
        System.out.println(x.v + " " + ((B) x).v + " " + y.v + " " + A.cnt);
    }
}
`, '1 202 202 22',
      `new B()의 순서: A의 필드 초기화 → A() → B의 필드 초기화 → B()의 나머지
• A()에서 add()는 오버라이딩된 B.add()가 불린다. 그런데 B의 v는 아직 0 → 0 × 100 = 0, A.v = 1
• B의 v = 2로 초기화된 뒤 v += add() → 2 + 200 = 202
• 필드는 오버라이딩되지 않는다: x.v는 A의 v(1), (B)x로 바꾸면 B의 v(202)
• cnt: 객체마다 +1, +10 → 두 번이면 22`),
    term('design', '어댑터 패턴',
      `다음 설명에 해당하는 GoF 디자인 패턴을 쓰시오.
이미 있는 클래스의 인터페이스가 쓰려는 쪽이 기대하는 인터페이스와 맞지 않을 때, 중간에서 인터페이스를 변환해 함께 쓸 수 있게 한다. 220V 플러그를 110V 콘센트에 꽂게 해 주는 돼지코와 같은 역할이다. 구조 패턴에 속한다.`,
      ['어댑터', 'Adapter', '아답터', 'Wrapper'],
      `어댑터(Adapter)는 "인터페이스를 맞추는" 패턴이다. 클래스 어댑터(상속)와 객체 어댑터(합성) 방식이 있다.
비교: 퍼사드는 복잡한 여러 인터페이스를 "단순한 창구 하나"로, 브리지는 기능과 구현을 "처음부터 분리"한다.`),
    blanks('dev', '문장 커버리지와 실행 경로',
      '다음 의사 코드에 대해 물음에 답하시오. ① x = 6, y = 4를 입력했을 때 실행되는 문장 번호를 순서대로 쓰시오. ② 문장 커버리지 100%를 만족하는 최소 테스트 케이스 수를 쓰시오.',
      [['①', '1 2 3 6 8', '1-2-3-6-8', '1→2→3→6→8'], ['②', '2']],
      `① 6 > 4라서 3번(x = 2)을 실행한다. 2 == 4가 아니므로 7번은 건너뛰고 8번 → 1 2 3 6 8
② 3번과 5번은 if와 else로 갈라져 한 번에 둘 다 실행할 수 없다 → 최소 2개.
   예: (4, 2)를 넣으면 x가 2가 되어 x == y → 1 2 3 6 7 8, (1, 3)을 넣으면 1 2 5 6 8 → 두 케이스로 모든 문장 실행`,
      { pre: `1  read(x, y)
2  if (x > y)
3      x = x - y
4  else
5      y = y - x
6  if (x == y)
7      print("same")
8  print(x, y)` }),
    out('java', '재귀 분할 정복', `public class Main {
    static int calls = 0;

    static int maxOf(int[] a, int lo, int hi) {
        calls++;
        if (lo == hi) return a[lo];
        int mid = (lo + hi) / 2;
        int l = maxOf(a, lo, mid);
        int r = maxOf(a, mid + 1, hi);
        return Math.max(l, r) + (hi - lo == 1 ? 1 : 0);
    }

    public static void main(String[] args) {
        int[] a = {3, 9, 4, 7, 2};
        System.out.println(maxOf(a, 0, a.length - 1) + " " + calls);
    }
}
`, '10 9',
      `배열을 반으로 나눠 양쪽의 최댓값을 구한다. 구간 길이가 2일 때만 1을 더하는 것이 함정이다.
(0,4) → (0,2), (3,4)
(0,2) → (0,1), (2,2) / (0,1) → 3과 9 → 9 + 1 = 10 / (2,2) → 4 → (0,2) = max(10, 4) = 10
(3,4) → 7과 2 → 7 + 1 = 8
(0,4) = max(10, 8) = 10. 호출: (0,4) (0,2) (0,1) (0,0) (1,1) (2,2) (3,4) (3,3) (4,4) → 9번`),
    out('python', '트리와 재귀 제너레이터', `class Node:
    def __init__(self, v, kids=None):
        self.v = v
        self.kids = kids or []


def walk(n, depth=0):
    yield n.v if depth % 2 == 0 else -n.v
    for k in n.kids:
        yield from walk(k, depth + 1)


root = Node(1, [Node(2, [Node(4), Node(5)]), Node(3, [Node(6, [Node(7)])])])
vals = list(walk(root))
print(sum(vals), vals[:4])
`, '4 [1, -2, 4, 5]',
      `walk는 자신 → 자식들 순서(전위 순회)로 값을 하나씩 내보낸다. 깊이가 홀수면 부호를 바꾼다.
1(깊이0) → 2(1) → 4(2) → 5(2) → 3(1) → 6(2) → 7(3)
vals = [1, -2, 4, 5, -3, 6, -7], 합 4
yield from은 안쪽 제너레이터가 내는 값을 그대로 이어서 내보낸다.`),
    out('c', '연결 리스트 노드 바꾸기', `#include <stdio.h>
#include <stdlib.h>

struct Node {
    char c;
    struct Node *next;
};

struct Node *add(struct Node *head, char c) {
    struct Node *n = malloc(sizeof(struct Node));
    n->c = c;
    n->next = head;
    return n;
}

int main(void) {
    struct Node *head = NULL;
    for (char *p = "CODE"; *p; p++) head = add(head, *p);
    struct Node *a = head, *b = head->next;
    a->next = b->next;
    b->next = a;
    head = b;
    for (struct Node *p = head; p; p = p->next) printf("%c", p->c);
    return 0;
}
`, 'DEOC',
      `맨 앞에 붙이므로 C, O, D, E 순서로 넣으면 리스트는 E → D → O → C
a = E, b = D. a->next = O (E가 D를 건너뜀), b->next = E, head = D
→ D → E → O → C. 앞의 두 노드를 맞바꾼 것이다.`),
    out('c', '비트 마스크로 권한 검사', `#include <stdio.h>

typedef struct {
    char id;
    unsigned char perm;
} User;

int count(User *u, int n, unsigned char mask) {
    int c = 0;
    for (int i = 0; i < n; i++)
        if ((u[i].perm & mask) == mask) c++;
    return c;
}

int main(void) {
    User users[4] = {{'a', 0x07}, {'b', 0x05}, {'c', 0x06}, {'d', 0x04}};
    printf("%d ", count(users, 4, 0x04));
    printf("%d ", count(users, 4, 0x05));
    printf("%d ", count(users + 1, 3, 0x02));
    for (int i = 0; i < 4; i++)
        if (!(users[i].perm & 0x01)) printf("%c", users[i].id);
    return 0;
}
`, '4 2 1 cd',
      `권한 비트: a 111, b 101, c 110, d 100
• mask 100: 모두 4번 비트가 있다 → 4
• mask 101: 두 비트를 "모두" 가진 a, b → 2
• users + 1은 b부터 3명: mask 010을 가진 것은 c → 1
• 1번 비트(001)가 없는 것: c, d`),
    out('java', '오버로딩과 재귀', `public class Main {
    static int f(int n) {
        if (n < 2) return n;
        return f(n - 1) + f(n - 2);
    }

    static String f(String s) {
        if (s.length() < 2) return s;
        return f(s.substring(1)) + s.charAt(0);
    }

    public static void main(String[] args) {
        System.out.println(f(7) + f("abc") + f(3) + f("" + 3));
    }
}
`, '13cba23',
      `인자 타입에 따라 다른 f가 불린다(오버로딩).
• f(7): 피보나치 0 1 1 2 3 5 8 13 → 13
• f("abc"): 첫 글자를 뒤로 보내며 재귀 → 뒤집기 "cba"
• f(3) = 2, f("3") = "3"
+는 왼쪽부터: 13 + "cba" = "13cba" (여기서 문자열이 됨) → "13cba2" → "13cba23"`),
  ]),
];
