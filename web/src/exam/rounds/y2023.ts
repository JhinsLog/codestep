// 2023년 회차. 문항 개념은 공개된 복원 자료의 개념 목록을 참고했다 (지문·코드는 새로 씀).
// 개념을 확인하지 못한 문항은 trend 표시를 하고 같은 시기 출제 경향으로 채웠다.
import { blanks, fill, out, round, sqlOut, sqlWrite, term } from '../build';

const STUDENTS = `CREATE TABLE 학생(학번 INTEGER PRIMARY KEY, 이름 TEXT, 학과 TEXT, 학년 INTEGER);
INSERT INTO 학생 VALUES (1, '김하늘', '컴퓨터', 3), (2, '이도윤', '전자', 2), (3, '박서준', '컴퓨터', 1),
  (4, '최유나', '기계', 4), (5, '정민호', '전자', 3);`;

export const Y2023 = [
  round('2023-3', {
    pass: 17.67, level: 5,
    note: '개편 뒤 손꼽히게 어려웠던 회차. 코드 문제가 많고 함정이 많았다: %s와 %c 구분, 재귀 안의 오버라이딩, 완전수 구하기, chmod 751, 동치 분할을 영문으로 쓰기.',
  }, [
    term('net', 'NAT',
      `다음 설명에 해당하는 기술을 영문 약어로 쓰시오.
내부망에서 쓰는 사설 IP 주소를 외부 인터넷에 나갈 때 공인 IP 주소로 바꿔 주고, 돌아오는 응답은 다시 사설 IP로 바꿔 준다. 공인 IP 하나로 여러 기기가 인터넷을 쓸 수 있어 IPv4 주소 부족을 덜고, 내부 주소를 숨기는 보안 효과도 있다.`,
      ['NAT', 'Network Address Translation', '네트워크 주소 변환'],
      `NAT(Network Address Translation). 포트 번호까지 바꿔 공인 IP 하나를 여럿이 나눠 쓰는 방식을 PAT(NAPT)라 한다.
사설 IP 대역: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16`),
    term('java', '컴파일 오류가 나는 줄',
      '다음 Java 코드에서 컴파일 오류가 나는 줄의 번호를 쓰시오.',
      ['13'],
      `변수 a의 타입은 Animal이다. 컴파일러는 "변수 타입"에 그 메서드가 있는지만 본다.
• 12줄 a.eat(): Animal에 eat()이 있다 → 통과 (실행할 때는 Cat의 eat()이 불린다)
• 13줄 a.meow(): Animal에는 meow()가 없다 → 컴파일 오류
• 14~15줄: Cat으로 형 변환(다운캐스팅)하면 meow()를 부를 수 있다`,
      { pre: ` 1  class Animal {
 2      void eat() { System.out.println("eat"); }
 3  }
 4  class Cat extends Animal {
 5      @Override
 6      void eat() { System.out.println("cat eat"); }
 7      void meow() { System.out.println("meow"); }
 8  }
 9  public class Main {
10      public static void main(String[] args) {
11          Animal a = new Cat();
12          a.eat();
13          a.meow();
14          Cat c = (Cat) a;
15          c.meow();
16      }
17  }` }),
    fill('python', 'map과 split',
      '다음 Python 코드의 빈칸에 알맞은 함수(메서드) 이름을 쓰시오. 빈칸을 채우면 "49 23"이 출력된다.',
      `line = "12 7 30"
a, b, c = map(①, line.②())
print(a + b + c, max(a, b, c) - min(a, b, c))
`, [['①', 'int'], ['②', 'split']], '49 23',
      `split()은 공백으로 나눠 ['12', '7', '30'] 문자열 리스트를 만들고, map(int, …)이 각각을 정수로 바꾼다.
12 + 7 + 30 = 49, 30 - 7 = 23. int 대신 str을 쓰면 + 가 문자열 연결이 되어 "12730"이 된다.
input().split()과 함께 입력을 받을 때 자주 쓰는 형태다.`),
    blanks('design', 'UML 구조 다이어그램',
      'UML 구조 다이어그램에 대한 설명이다. 빈칸에 알맞은 다이어그램을 쓰시오.',
      [['①', '패키지 다이어그램', '패키지', 'Package Diagram'], ['②', '컴포넌트 다이어그램', '컴포넌트', 'Component Diagram'], ['③', '배치 다이어그램', '배치', 'Deployment Diagram']],
      `• 패키지: 모델 요소를 그룹으로 묶고 그룹 사이의 의존 관계
• 컴포넌트: 실제 구현 모듈(라이브러리, 실행 파일)과 인터페이스
• 배치: 물리적 노드(서버, 기기)와 그 위에 놓이는 소프트웨어`,
      { pre: `( ① ) : 클래스 같은 모델 요소들을 그룹으로 묶고, 그룹 사이의 의존 관계를 표현한다
( ② ) : 시스템을 구성하는 실제 소프트웨어 구성 요소(모듈)와 그 인터페이스, 의존 관계를 표현한다
( ③ ) : 서버·기기 같은 물리적 노드와, 그 위에 어떤 소프트웨어가 배치되는지 표현한다` }),
    term('dev', '동치 분할 (영문)',
      '입력 자료를 같은 결과가 기대되는 유효·무효 그룹으로 나누고 그룹마다 대표값을 골라 테스트하는 블랙박스 기법을 쓰시오. (실제 시험에서는 영문 Full Name으로 쓰라고 했다)',
      ['Equivalence Partitioning', 'Equivalence Class Partitioning', 'Equivalence Partitioning Testing', '동치 분할', '동등 분할'],
      `Equivalence Partitioning(동치/동등 분할). 영문으로 쓰라는 문제는 철자까지 정확해야 한다.
짝 개념: Boundary Value Analysis(경계값 분석), Cause-Effect Graph(원인-결과 그래프), Error Guessing(오류 예측)`),
    blanks('net', '클라우드 서비스 모델',
      '클라우드 서비스 모델에 대한 설명이다. 빈칸에 알맞은 모델을 영문 약어로 쓰시오.',
      [['①', 'IaaS', 'Infrastructure as a Service'], ['②', 'PaaS', 'Platform as a Service'], ['③', 'SaaS', 'Software as a Service']],
      `아래에서 위로: IaaS(서버·저장소·네트워크) → PaaS(+ 운영체제·런타임·개발 도구) → SaaS(+ 완성된 응용 프로그램)
예: AWS EC2(IaaS), Heroku·Google App Engine(PaaS), Gmail·Microsoft 365(SaaS)`,
      { pre: `( ① ) : 서버, 저장 장치, 네트워크 같은 컴퓨팅 인프라를 빌려 준다. 운영체제부터는 사용자가 설치·관리한다
( ② ) : 응용 프로그램을 개발·실행할 수 있는 플랫폼(운영체제, 런타임, DB)까지 제공한다
( ③ ) : 완성된 소프트웨어를 인터넷으로 바로 쓰게 한다. 사용자는 설치·관리할 것이 없다` }),
    out('c', '%s와 %c의 차이', `#include <stdio.h>

int main(void) {
    char *s = "PROGRAM";
    char *p = s + 3;
    printf("%s ", p);
    printf("%c ", *p + 1);
    printf("%c ", *(s + 6) - 1);
    printf("%s", s + (p - s) * 2);
    return 0;
}
`, 'GRAM H L M',
      `%s는 주소를 받아 NUL까지 찍고, %c는 글자(값) 하나를 찍는다.
• p는 s + 3 → "GRAM"
• *p는 'G', + 1 → 'H'
• *(s + 6)은 'M', - 1 → 'L'
• p - s = 3, × 2 = 6 → s + 6부터 → "M"`),
    out('java', '재귀 안의 오버라이딩', `class Calc {
    int f(int n) {
        if (n <= 1) return 1;
        return n + f(n - 1);
    }
}

class Fact extends Calc {
    @Override
    int f(int n) {
        if (n <= 1) return 1;
        return n * super.f(n - 1);
    }
}

public class Main {
    public static void main(String[] args) {
        Calc c = new Fact();
        System.out.println(c.f(4) + " " + new Calc().f(4));
    }
}
`, '20 10',
      `함정: super.f() 안에서 다시 부르는 f()도 객체가 Fact라서 Fact.f()가 불린다.
• Fact.f(4) = 4 × Calc.f(3)
• Calc.f(3) = 3 + f(2) → Fact.f(2) = 2 × Calc.f(1) = 2 × 1 = 2 → Calc.f(3) = 5
• Fact.f(4) = 4 × 5 = 20
new Calc().f(4)는 순수한 Calc 객체라 4 + 3 + 2 + 1 = 10`),
    out('c', '완전수 구하기', `#include <stdio.h>

int main(void) {
    int sum = 0, cnt = 0;
    for (int n = 2; n <= 100; n++) {
        int s = 0;
        for (int d = 1; d <= n / 2; d++)
            if (n % d == 0) s += d;
        if (s == n) { sum += n; cnt++; }
    }
    printf("%d %d", sum, cnt);
    return 0;
}
`, '34 2',
      `완전수: 자기 자신을 뺀 약수의 합이 자신과 같은 수. 약수는 n / 2를 넘지 않으므로 거기까지만 본다.
100 이하에는 6(1+2+3), 28(1+2+4+7+14) 두 개 → 합 34`),
    blanks('os', 'chmod 권한 설정',
      '파일 a.txt에 소유자는 읽기·쓰기·실행, 그룹은 읽기·실행, 기타 사용자는 실행만 할 수 있도록 권한을 주는 명령어를 완성하시오.',
      [['①', 'chmod'], ['②', '751']],
      `권한 숫자: 읽기 r = 4, 쓰기 w = 2, 실행 x = 1을 더한다.
소유자 rwx = 7, 그룹 r-x = 5, 기타 --x = 1 → 751
기호로 쓰면 chmod u=rwx,g=rx,o=x a.txt. 소유자를 바꾸는 명령은 chown이다.`,
      { pre: '( ① ) ( ② ) a.txt' }),
    sqlOut('GROUP BY와 HAVING',
      '[성적] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄, 값은 공백으로 구분)',
      `CREATE TABLE 성적(학번 INTEGER, 과목 TEXT, 점수 INTEGER);
INSERT INTO 성적 VALUES (1, 'DB', 90), (2, 'DB', 55), (3, 'DB', 70), (1, 'OS', 80), (2, 'OS', 65), (3, 'NW', 95), (1, 'NW', 40);`,
      `SELECT 과목, COUNT(*), MAX(점수) - MIN(점수)
FROM 성적
WHERE 점수 >= 60
GROUP BY 과목
HAVING COUNT(*) >= 2
ORDER BY 과목;`,
      'DB 2 20\nOS 2 15',
      `처리 순서: FROM → WHERE(행 거르기) → GROUP BY → HAVING(그룹 거르기) → SELECT → ORDER BY
60점 미만(55, 40)을 먼저 빼고 묶는다: DB {90, 70}, OS {80, 65}, NW {95}
NW는 1개라 HAVING에서 빠진다. DB 90 - 70 = 20, OS 80 - 65 = 15`,
      { trend: true }),
    term('net', '거리 벡터 라우팅',
      'RIP가 쓰는 라우팅 방식으로, 이웃 라우터와 "목적지까지의 거리(홉 수)와 방향" 정보만 주기적으로 교환해 경로를 정하는 방식을 쓰시오. (벨만-포드 알고리즘을 쓴다)',
      ['거리 벡터', 'Distance Vector', '거리 벡터 방식', '거리벡터'],
      `• 거리 벡터(RIP, IGRP): 이웃에게서 들은 거리만으로 판단, 전체 표를 주기적으로 교환, 수렴이 느림
• 링크 상태(OSPF, IS-IS): 전체 연결 지도를 알고 다익스트라로 계산, 변화만 즉시 전파`),
    term('db', '관계 대수 식의 결과',
      '다음 [학생] 릴레이션에 관계 대수 π이름(σ학년=2(학생))을 수행한 결과를 쓰시오. (이름을 쉼표로 구분)',
      ['김, 박', '박, 김'],
      `안쪽부터: σ학년=2는 학년이 2인 튜플(김, 박)만 고르고, π이름은 그중 이름 열만 뽑는다.
SQL로는 SELECT 이름 FROM 학생 WHERE 학년 = 2`,
      { tables: [{ name: '학생', cols: ['학번', '이름', '학년'], rows: [[1, '김', 2], [2, '이', 3], [3, '박', 2], [4, '최', 1]] }] }),
    term('db', '참조 무결성',
      '외래키의 값은 NULL이거나, 참조하는 릴레이션의 기본키 값 중 하나여야 한다는 제약 조건을 쓰시오.',
      ['참조 무결성', 'Referential Integrity', '참조 무결성 제약 조건', '참조'],
      `참조 무결성 덕분에 "존재하지 않는 학과에 소속된 학생" 같은 데이터가 생기지 않는다.
참조되는 쪽 행을 지우거나 바꿀 때의 처리: CASCADE, SET NULL, SET DEFAULT, RESTRICT(NO ACTION)`),
    term('sec', '가용성',
      '정보보안의 3요소(CIA) 중, 인가된 사용자가 필요할 때 언제든 정보와 시스템을 사용할 수 있어야 한다는 요소를 쓰시오.',
      ['가용성', 'Availability'],
      `CIA: 기밀성(Confidentiality, 인가된 사람만 열람), 무결성(Integrity, 인가된 방법으로만 수정), 가용성(Availability, 필요할 때 사용)
서비스 거부(DoS) 공격은 가용성을 해친다. 대책: 이중화, 백업, 부하 분산`),
    out('python', '컴프리헨션과 딕셔너리 키', `a = [1, 2, 3, 4, 5, 6]
b = [x * x for x in a if x % 2]
c = {x % 3: x for x in a}
print(b, c, sum(c.values()))
`, '[1, 9, 25] {1: 4, 2: 5, 0: 6} 15',
      `• x % 2가 1(참)인 홀수만 제곱 → [1, 9, 25]
• 키가 같으면 나중 값이 덮어쓴다. 키 순서는 처음 들어온 순서(1, 2, 0)를 지킨다
  1→1, 2→2, 0→3, 1→4, 2→5, 0→6 → {1: 4, 2: 5, 0: 6}
• 값의 합 4 + 5 + 6 = 15`,
      { trend: true }),
    out('c', '구조체 값 전달과 포인터', `#include <stdio.h>

struct Point { int x, y; };

struct Point mid(struct Point a, struct Point b) {
    struct Point m = {(a.x + b.x) / 2, (a.y + b.y) / 2};
    a.x = 0;
    return m;
}

int main(void) {
    struct Point p[3] = {{2, 8}, {6, 4}, {9, 1}};
    struct Point m = mid(p[0], p[2]);
    struct Point *q = &p[1];
    q->x += m.x;
    printf("%d %d %d %d", m.x, m.y, p[0].x, p[1].x);
    return 0;
}
`, '5 4 2 11',
      `구조체를 그대로 넘기면 "복사본"이 넘어간다. mid 안의 a.x = 0은 p[0]에 영향이 없다.
m = ((2 + 9) / 2, (8 + 1) / 2) = (5, 4) (정수 나눗셈)
q는 p[1]의 주소라 q->x += 5로 p[1].x가 11이 된다.`,
      { trend: true }),
    out('java', 'StringBuilder', `public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("ENGINEER");
        sb.reverse();
        sb.insert(2, "-");
        sb.deleteCharAt(sb.length() - 1);
        String s = sb.toString();
        System.out.println(s + " " + s.indexOf('E') + " " + s.replace("E", "").length());
    }
}
`, 'RE-ENIGN 1 6',
      `StringBuilder는 내용을 직접 바꾼다(String은 바꿀 수 없어 새 객체를 만든다).
"ENGINEER" → reverse "REENIGNE" → 2번 자리에 "-" "RE-ENIGNE" → 마지막 글자 삭제 "RE-ENIGN"
indexOf('E') = 1, E를 모두 지우면 "R-NIGN" → 6글자`,
      { trend: true }),
    term('net', 'SDN',
      `다음 설명에 해당하는 기술을 영문 약어로 쓰시오.
라우터·스위치 같은 네트워크 장비에서 경로를 결정하는 제어 기능(Control Plane)을 데이터 전달 기능(Data Plane)과 분리해, 중앙의 소프트웨어 컨트롤러가 네트워크 전체를 프로그래밍하듯 관리하게 한다.`,
      ['SDN', 'Software Defined Network', 'Software Defined Networking', '소프트웨어 정의 네트워크'],
      `SDN(Software Defined Networking). 컨트롤러와 장비 사이 표준 프로토콜로 OpenFlow가 있다.
비슷한 말: NFV(네트워크 기능 가상화 — 방화벽 등을 전용 장비 대신 소프트웨어로)`,
      { trend: true }),
    term('dev', '샘플링 오라클',
      '테스트 오라클 중, 전체 입력이 아니라 특정한 몇 개의 입력값에 대해서만 기대하는 결과를 제공하는 오라클을 쓰시오.',
      ['샘플링 오라클', 'Sampling Oracle', '샘플링'],
      `테스트 오라클: 테스트 결과가 맞는지 판단하는 기준.
• 참(True) 오라클: 모든 입력에 대해 기대 결과 제공
• 샘플링 오라클: 특정 입력들에 대해서만
• 추정(휴리스틱) 오라클: 특정 입력은 정확히, 나머지는 추정
• 일관성 검사 오라클: 변경 전후 결과가 같은지`,
      { trend: true }),
  ]),

  round('2023-2', {
    pass: 17.92, level: 4,
    note: '1회보다 체감 난이도가 높았던 회차. 코드 빈칸(순환 인덱스, 거스름돈, 정렬 연산자)과 SQL INSERT 작성, String과 new String의 차이가 나왔고, 템퍼 프루핑·HDLC·오류 검출 같은 이론이 나왔다.',
  }, [
    fill('c', '순환 인덱스',
      '다음 C 코드의 빈칸 ①에 알맞은 연산자를 쓰시오. 빈칸을 채우면 "40 50 10 20 30"이 출력된다.',
      `#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    int n = 5, start = 3;
    for (int i = 0; i < n; i++)
        printf("%d ", a[(start + i) ① n]);
    return 0;
}
`, [['①', '%']], '40 50 10 20 30',
      `start + i는 3, 4, 5, 6, 7이 된다. 배열 크기 5로 나눈 나머지(%)를 쓰면 3, 4, 0, 1, 2로 돌아온다.
원형 큐, 회전 배열에서 자주 쓰는 방법이다.`),
    fill('java', '거스름돈 동전 개수',
      '4780원을 가장 적은 개수의 화폐로 주려고 한다. 빈칸 ①, ②에 알맞은 연산자를 쓰시오. 빈칸을 채우면 "11 0"이 출력된다.',
      `public class Main {
    public static void main(String[] args) {
        int money = 4780;
        int[] coins = {1000, 500, 100, 50, 10};
        int count = 0;
        for (int c : coins) {
            count += money ① c;
            money ② c;
        }
        System.out.println(count + " " + money);
    }
}
`, [['①', '/'], ['②', '%=']], '11 0',
      `큰 단위부터 몫(/)만큼 쓰고, 남은 돈은 나머지(%=)로 줄인다(그리디 알고리즘).
1000×4 (780 남음) → 500×1 (280) → 100×2 (80) → 50×1 (30) → 10×3 (0) → 4 + 1 + 2 + 1 + 3 = 11개`),
    out('c', '문자열과 포인터', `#include <stdio.h>
#include <string.h>

int main(void) {
    char str[] = "information";
    char *p = str;
    int n = 0;
    while (*p) {
        if (strchr("aeiou", *p)) n++;
        p++;
    }
    p = str + strlen(str) - 4;
    printf("%d %s %c", n, p, *(p - 2) - 32);
    return 0;
}
`, '5 tion M',
      `strchr(문자열, c)는 c가 있으면 그 위치를, 없으면 NULL을 돌려준다 → 모음이면 참.
"information"의 모음: i, o, a, i, o → 5개
strlen 11 - 4 = 7 → str + 7부터 "tion"
*(p - 2)는 str[5] = 'm', - 32 하면 대문자 'M' (아스키 코드에서 대소문자는 32 차이)`),
    sqlWrite('INSERT 작성',
      '[학생] 테이블에 학번 6, 이름 \'한지민\', 학과 \'디자인\', 학년 2인 학생을 추가하는 SQL을 쓰시오.',
      STUDENTS,
      "INSERT INTO 학생 VALUES (6, '한지민', '디자인', 2);",
      `INSERT INTO 테이블 VALUES (값, …)는 열 순서대로 모든 값을 넣는다.
열을 지정하면 순서를 바꾸거나 일부만 넣을 수 있다: INSERT INTO 학생(학번, 이름, 학과, 학년) VALUES (6, '한지민', '디자인', 2);
문자열은 작은따옴표로 감싼다. 이 문제는 쓴 SQL을 실제로 실행해 테이블 결과가 같으면 정답이다.`,
      { check: 'SELECT * FROM 학생 ORDER BY 학번;' }),
    out('c', '카이사르 암호', `#include <stdio.h>

void shift(char *s, int k) {
    for (; *s; s++)
        *s = (*s - 'A' + k) % 26 + 'A';
}

int main(void) {
    char a[] = "ZAB";
    char b[] = "XYZ";
    shift(a, 2);
    shift(b, 29);
    printf("%s %s", a, b);
    return 0;
}
`, 'BCD ABC',
      `*s - 'A'로 글자를 0~25 번호로 바꾸고, k만큼 민 뒤 % 26으로 알파벳 안에서 돌린다.
"ZAB" + 2: Z(25) → 27 % 26 = 1 → B, A → C, B → D → "BCD"
"XYZ" + 29: 29는 26 + 3이라 3칸 민 것과 같다 → "ABC"`,
      { trend: true }),
    term('dev', '조건 커버리지와 결정 커버리지',
      '조건식이 if (x > 0 || y > 0)일 때, 조건 커버리지는 만족하지만 결정 커버리지는 만족하지 못하는 테스트 세트를 〈보기〉에서 고르시오.',
      ['ㄴ'],
      `• 조건 커버리지: x > 0과 y > 0이 "각각" 참·거짓을 한 번씩
• 결정 커버리지: 결정 전체(||의 결과)가 참·거짓을 한 번씩
ㄱ: 조건 각각 T/F ✓, 결정 T와 F ✓ → 둘 다 만족
ㄴ: x는 T, F / y는 F, T ✓ → 그러나 결정은 둘 다 참 → 결정 커버리지 불만족
ㄷ: 케이스 하나라 둘 다 불만족`,
      { options: ['ㄱ. (x=1, y=1), (x=-1, y=-1)', 'ㄴ. (x=1, y=-1), (x=-1, y=1)', 'ㄷ. (x=1, y=1)'] }),
    out('c', '반복문과 조건 누적', `#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 100; i++) {
        if (i % 5 == 0 && i % 10 != 0) sum += i;
        if (i % 25 == 0) sum -= i / 25;
    }
    printf("%d", sum);
    return 0;
}
`, '490',
      `5의 배수이지만 10의 배수가 아닌 수: 5, 15, 25, …, 95 (10개) → 합 (5 + 95) × 10 / 2 = 500
25의 배수 25, 50, 75, 100에서 각각 1, 2, 3, 4를 뺀다 → 10
500 - 10 = 490`,
      { trend: true }),
    term('sec', '템퍼 프루핑',
      `다음 설명에 해당하는 소프트웨어 보호 기술을 쓰시오.
소프트웨어가 무단으로 위·변조되었는지 실행 중에 스스로 검사하고, 변조가 감지되면 실행을 막거나 오작동하게 해 악의적인 분석과 수정을 어렵게 한다. 해시 값 비교, 코드 서명 확인 등을 쓴다.`,
      ['템퍼 프루핑', 'Tamper Proofing', '탬퍼 프루핑', '템퍼프루핑', 'Tamper-Proofing', '변조 방지'],
      `템퍼 프루핑(Tamper Proofing)은 "변조 방지" 기술이다. 함께 쓰는 것: 코드 난독화(Obfuscation), 워터마킹, DRM.`),
    out('c', '재귀로 자릿수 합', `#include <stdio.h>

int g(int n) {
    if (n < 10) return n;
    return g(n / 10) + n % 10;
}

int main(void) {
    int x = 98765;
    int r = g(x);
    while (r >= 10) r = g(r);
    printf("%d %d", g(x), r);
    return 0;
}
`, '35 8',
      `n / 10은 마지막 자리를 떼고, n % 10은 마지막 자리 숫자다. g는 모든 자릿수의 합.
9 + 8 + 7 + 6 + 5 = 35 → 한 자리가 될 때까지 다시: 3 + 5 = 8`,
      { trend: true }),
    blanks('db', '데이터베이스 설계 단계',
      '데이터베이스 설계 단계에 대한 설명이다. 빈칸에 알맞은 단계를 쓰시오.',
      [['①', '개념적 설계', '개념적', '개념 설계'], ['②', '논리적 설계', '논리적', '논리 설계'], ['③', '물리적 설계', '물리적', '물리 설계']],
      `요구 조건 분석 → 개념적 설계 → 논리적 설계 → 물리적 설계 → 구현
개념적은 "무엇을"(DBMS와 무관한 E-R 모델), 논리적은 "어떤 모델로"(관계형 스키마, 정규화), 물리적은 "어떻게 저장"(인덱스, 파일 구조, 접근 경로)`,
      { pre: `( ① ) : 요구 사항을 바탕으로 DBMS와 상관없이 E-R 다이어그램을 그린다
( ② ) : 특정 DBMS의 데이터 모델(관계형 등)에 맞게 스키마를 만들고 정규화한다
( ③ ) : 저장 구조, 인덱스, 레코드 배치, 접근 경로 등 실제 저장 방법을 정한다` }),
    blanks('design', '싱글톤과 방문자 패턴',
      '다음 설명에 해당하는 디자인 패턴을 쓰시오.',
      [['①', '싱글톤', 'Singleton', '싱글턴'], ['②', '방문자', 'Visitor', '비지터']],
      `• 싱글톤(생성 패턴): 생성자를 private으로 막고 static 메서드로 하나뿐인 객체를 돌려준다. 예: 설정, 로그, DB 연결 풀
• 방문자(행위 패턴): 자료 구조와 그 위에서 할 일을 분리해, 원소 클래스를 고치지 않고 새 기능을 추가한다. 예: 컴파일러의 구문 트리 처리`,
      { pre: `① 클래스의 객체가 오직 하나만 만들어지도록 보장하고, 어디서든 그 객체에 접근할 수 있게 한다
② 자료 구조의 원소 클래스를 바꾸지 않고, 원소들에 수행할 새로운 연산을 별도의 클래스로 분리해 추가한다` }),
    blanks('net', 'ARQ 방식',
      '오류가 생긴 프레임을 재전송하는 ARQ 방식에 대한 설명이다. 빈칸에 알맞은 방식을 쓰시오.',
      [['①', 'Stop-and-Wait', '정지-대기', '정지 대기', 'Stop and Wait', '정지-대기 ARQ'], ['②', 'Go-Back-N', 'Go Back N', 'Go-Back-N ARQ', '고백엔'], ['③', 'Selective Repeat', '선택적 재전송', 'Selective-Repeat', '선택적 재전송 ARQ']],
      `• 정지-대기: 1개 보내고 ACK를 기다림 (단순, 느림)
• Go-Back-N: 연속으로 보내다 오류(NAK)가 나면 그 프레임부터 뒤의 것을 모두 다시 보냄
• 선택적 재전송: 오류 난 프레임만 다시 보냄 (수신 측에 버퍼·재정렬 필요)
• 적응적 ARQ: 회선 상태에 따라 프레임 길이를 바꿈`,
      { pre: `( ① ) : 프레임을 하나 보낸 뒤 확인 응답(ACK)이 올 때까지 기다린다
( ② ) : 여러 프레임을 연속으로 보내다가 오류가 나면, 오류 난 프레임부터 그 뒤의 프레임을 모두 다시 보낸다
( ③ ) : 오류가 난 프레임만 골라서 다시 보낸다` }),
    blanks('net', 'HDLC 동작 모드',
      'HDLC의 데이터 전송 모드에 대한 설명이다. 빈칸에 알맞은 모드를 영문 약어로 쓰시오.',
      [['①', 'NRM', '정규 응답 모드', 'Normal Response Mode'], ['②', 'ARM', '비동기 응답 모드', 'Asynchronous Response Mode'], ['③', 'ABM', '비동기 균형 모드', 'Asynchronous Balanced Mode']],
      `• NRM: 주국 허가 필요 (포인트 투 멀티포인트)
• ARM: 허가 없이 종국이 전송, 링크 관리는 주국
• ABM: 모든 국이 대등 (포인트 투 포인트, 가장 많이 쓴다)
HDLC 프레임: 플래그(01111110) + 주소 + 제어 + 정보 + FCS + 플래그`,
      { pre: `( ① ) : 종국은 주국의 허가(폴링)가 있어야만 전송할 수 있다
( ② ) : 종국이 주국의 허가 없이 전송할 수 있지만, 링크 설정·오류 복구 같은 제어는 주국이 맡는다
( ③ ) : 두 국이 대등한 관계로, 허가 없이 언제든 전송할 수 있다` }),
    out('java', 'String과 new String', `public class Main {
    public static void main(String[] args) {
        String a = "Java";
        String b = new String("Java");
        String c = "JAVA".toLowerCase();
        String d = "ja" + "va";
        int score = 0;
        if (a == b) score += 1;
        if (a.equals(b)) score += 2;
        if (c == "java") score += 4;
        if (c.equals(d)) score += 8;
        if (a.equalsIgnoreCase(c)) score += 16;
        System.out.println(score);
    }
}
`, '26',
      `• a == b: new String은 새 객체 → 거짓
• a.equals(b): 내용 같음 → +2
• c == "java": toLowerCase()는 실행 중에 새 String을 만든다 → 상수 풀의 "java"와 다른 객체 → 거짓
• c.equals(d): "java"와 "java" → +8
• equalsIgnoreCase: 대소문자 무시 "Java"와 "java" → +16
합 26`),
    blanks('sec', '대칭키와 비대칭키 암호',
      '다음 암호 알고리즘이 대칭키 방식인지 비대칭키(공개키) 방식인지 쓰시오.',
      [['① RSA', '비대칭', '비대칭키', '공개키', 'Asymmetric'], ['② AES', '대칭', '대칭키', '비밀키', 'Symmetric'], ['③ ECC', '비대칭', '비대칭키', '공개키', 'Asymmetric'], ['④ SEED', '대칭', '대칭키', '비밀키', 'Symmetric']],
      `• 대칭키(비밀키): 암호화·복호화 키가 같다. 빠르다. DES, 3DES, AES, SEED, ARIA, IDEA, RC4
• 비대칭키(공개키): 공개키로 암호화, 개인키로 복호화. 키 분배가 쉽다. RSA(소인수분해), ECC(타원곡선), ElGamal, DSA
n명이 서로 통신할 때 필요한 키 수: 대칭키 n(n-1)/2, 비대칭키 2n`),
    blanks('ds', '해시',
      '해시에 대한 설명이다. 빈칸에 알맞은 용어를 쓰시오.',
      [['①', '해시 함수', 'Hash Function', '해시함수', '해싱 함수'], ['②', '충돌', 'Collision', '해시 충돌'], ['③', '체이닝', 'Chaining', '체인법', '분리 체이닝']],
      `해시 테이블은 키로 주소를 바로 계산해 평균 O(1)에 찾는다.
충돌 해결: 체이닝(같은 주소끼리 연결 리스트), 개방 주소법(선형 조사, 이차 조사, 이중 해싱으로 빈 칸 찾기)
같은 주소를 갖는 키들을 동의어(Synonym)라 한다.`,
      { pre: `키 값을 ( ① )에 넣어 저장할 주소(버킷)를 계산한다.
서로 다른 키가 같은 주소로 계산되는 현상을 ( ② )이라 한다.
( ② )을 해결하는 방법 중, 같은 주소를 갖는 키들을 연결 리스트로 이어 저장하는 방법을 ( ③ )이라 한다.` }),
    blanks('sql', 'DROP VIEW와 CASCADE',
      '[우수학생] 뷰를 삭제하면서, 이 뷰를 참조하는 다른 뷰도 함께 삭제하려고 한다. 빈칸에 알맞은 키워드를 쓰시오.',
      [['①', 'DROP'], ['②', 'CASCADE']],
      `DROP VIEW 뷰이름 [CASCADE | RESTRICT]
• CASCADE: 이 뷰를 참조하는 객체까지 연쇄 삭제
• RESTRICT: 참조하는 객체가 있으면 삭제를 거부
뷰는 ALTER로 바꿀 수 없어서, 고치려면 지우고 다시 만든다(CREATE OR REPLACE VIEW도 쓴다).`,
      { pre: '( ① ) VIEW 우수학생 ( ② );' }),
    fill('c', '선택 정렬',
      '다음 C 코드는 선택 정렬로 배열을 내림차순 정렬한다. 빈칸 ①에 알맞은 연산자를 쓰시오.',
      `#include <stdio.h>

int main(void) {
    int a[] = {29, 10, 14, 37, 13};
    int n = 5;
    for (int i = 0; i < n - 1; i++) {
        int m = i;
        for (int j = i + 1; j < n; j++)
            if (a[j] ① a[m]) m = j;
        int t = a[i]; a[i] = a[m]; a[m] = t;
    }
    for (int i = 0; i < n; i++) printf("%d ", a[i]);
    return 0;
}
`, [['①', '>', '>=']], '37 29 14 13 10',
      `선택 정렬은 남은 부분에서 가장 큰(내림차순) 값의 위치 m을 찾아 i번 자리와 바꾼다.
더 큰 값을 찾아야 하므로 a[j] > a[m]. < 를 쓰면 오름차순이 된다.
비교 횟수는 항상 n(n-1)/2 = 10번이다.`),
    out('python', '문자열 메서드', `s = "Hello World Python"
words = s.lower().split()
r = [w[0].upper() + w[1:] for w in words[::-1]]
print(" ".join(r), len(s.replace(" ", "")), s.find("o"), s.rfind("o"))
`, 'Python World Hello 16 4 16',
      `• 소문자로 바꿔 나누고 순서를 뒤집은 뒤 첫 글자만 대문자로 → "Python World Hello"
• 공백 2개를 지우면 18 - 2 = 16글자
• find는 처음 나온 위치(Hell"o" → 4), rfind는 마지막 위치(Pyth"o"n → 16)`,
      { trend: true }),
    blanks('dev', '통합 테스트 방식과 임시 모듈',
      '통합 테스트에 대한 설명이다. 빈칸에 알맞은 말을 쓰시오.',
      [['①', '상향식', 'Bottom-up', '상향식 통합'], ['②', '드라이버', 'Driver', '테스트 드라이버'], ['③', '하향식', 'Top-down', '하향식 통합'], ['④', '스텁', 'Stub', '테스트 스텁']],
      `• 상향식: 아래(하위 모듈)부터 → 위를 흉내 내는 드라이버 필요. 클러스터 단위로 묶어 시험
• 하향식: 위(메인)부터 → 아래를 흉내 내는 스텁 필요. 깊이 우선·너비 우선
• 빅뱅: 한꺼번에 / 샌드위치: 상향식 + 하향식`,
      { pre: `하위 모듈부터 결합하며 테스트하는 ( ① ) 통합 테스트에서는, 하위 모듈을 호출해 줄 임시 상위 모듈인 ( ② )가 필요하다.
상위 모듈부터 결합하며 테스트하는 ( ③ ) 통합 테스트에서는, 아직 없는 하위 모듈을 대신할 ( ④ )이 필요하다.` }),
  ]),

  round('2023-1', {
    pass: 27.47, level: 2,
    note: '대체로 쉬웠다는 평가를 받은 회차. 가상 회선·ICMP·커버리지 순서·튜플 삭제·과목별 평균 같은 기출 재출제가 많았고, static 변수와 문자열 포인터 같은 기본 코드가 나왔다.',
  }, [
    out('java', 'static 변수와 인스턴스 변수', `class Member {
    static int total = 0;
    int id;
    int visits = 0;
    Member() { id = ++total; }
    void visit() { visits++; total += 10; }
}

public class Main {
    public static void main(String[] args) {
        Member a = new Member();
        Member b = new Member();
        a.visit();
        b.visit();
        b.visit();
        Member c = new Member();
        System.out.println(a.id + " " + b.visits + " " + c.id + " " + Member.total);
    }
}
`, '1 2 33 33',
      `total은 static이라 모든 객체가 하나를 함께 쓰고, id·visits는 객체마다 따로다.
a 생성: total 1, a.id 1 / b 생성: total 2, b.id 2
visit 3번: total 2 + 30 = 32, b.visits 2
c 생성: ++total → 33, c.id 33`),
    out('c', '배열과 포인터 문자열', `#include <stdio.h>

int main(void) {
    char a[] = "SPRING";
    char *p = a;
    char *q = "SUMMER";
    printf("%c%c ", *(p + 1), q[2]);
    printf("%s ", p + 3);
    p[3] = '\\0';
    printf("%s %d", a, (int)sizeof(a));
    return 0;
}
`, 'PM ING SPR 7',
      `• *(p + 1) = 'P', q[2] = 'M' → "PM"
• p + 3부터 NUL까지 → "ING"
• p[3]에 NUL을 넣으면 a는 "SPR"에서 끝난다 (p와 a는 같은 배열)
• sizeof(a)는 배열 전체 크기: 6글자 + NUL = 7 (문자열이 짧아져도 배열 크기는 그대로)`),
    out('c', '문자열에서 패턴 찾기', `#include <stdio.h>

int main(void) {
    char s[] = "banana";
    char t[] = "an";
    int cnt = 0;
    for (int i = 0; s[i]; i++) {
        int j = 0;
        while (t[j] && s[i + j] == t[j]) j++;
        if (t[j] == '\\0') cnt++;
    }
    int same = 0;
    for (int i = 0; s[i]; i++)
        for (int j = i + 1; s[j]; j++)
            if (s[i] == s[j]) same++;
    printf("%d %d", cnt, same);
    return 0;
}
`, '2 4',
      `• 각 위치에서 t를 끝까지(NUL) 맞추면 1개: "an"은 1번, 3번에서 시작 → 2
• 같은 글자 쌍(i < j): a가 3개 → 3쌍, n이 2개 → 1쌍, b는 1개 → 0 → 4`),
    term('dev', 'JSON',
      `다음 설명에 해당하는 데이터 형식을 쓰시오.
"이름": 값 쌍과 배열로 데이터를 표현하는 가볍고 사람이 읽기 쉬운 텍스트 형식이다. JavaScript 객체 문법에서 나왔지만 언어와 관계없이 쓰이며, AJAX·REST API에서 XML 대신 가장 많이 쓴다. 예: {"name": "kim", "age": 20}`,
      ['JSON', 'JavaScript Object Notation'],
      `JSON(JavaScript Object Notation). XML보다 짧고 파싱이 빠르다.
비슷한 형식: XML(태그), YAML(들여쓰기), CSV(쉼표로 구분한 표)`),
    blanks('net', 'TCP와 UDP',
      '전송 계층 프로토콜에 대한 설명이다. 빈칸에 알맞은 프로토콜을 쓰시오.',
      [['①', 'TCP', 'Transmission Control Protocol'], ['②', 'UDP', 'User Datagram Protocol']],
      `• TCP: 연결형(3-way handshake), 순서 보장, 재전송, 흐름·혼잡 제어 → 웹, 메일, 파일 전송
• UDP: 비연결형, 헤더가 작고 빠름, 신뢰성 없음 → 실시간 영상·음성, DNS 조회, 게임`,
      { pre: `( ① ) : 연결을 먼저 맺은 뒤 데이터를 보내고, 순서 보장·재전송·흐름 제어로 신뢰성을 제공한다
( ② ) : 연결 설정 없이 바로 보내며 신뢰성은 없지만 빠르다. 실시간 스트리밍에 알맞다` }),
    term('net', 'ICMP',
      `다음 설명에 해당하는 프로토콜을 영문 약어로 쓰시오.
IP 패킷을 전달하다 생긴 오류(목적지에 도달할 수 없음, 시간 초과 등)를 출발지에 알려 주는 네트워크 계층 프로토콜이다. ping과 traceroute가 이 프로토콜의 메시지를 쓴다.`,
      ['ICMP', 'Internet Control Message Protocol'],
      `ICMP(Internet Control Message Protocol). IP는 오류를 스스로 알리지 못해서 ICMP가 그 역할을 한다.
ICMP를 악용한 공격: 스머프(브로드캐스트 증폭), Ping of Death(아주 큰 패킷)`),
    term('dev', '커버리지 강도 순서',
      '화이트박스 테스트 커버리지를 약한 것부터 강한 것 순서로 〈보기〉의 기호를 나열하시오.',
      ['ㄷ ㄱ ㅁ ㄹ ㄴ'],
      `구문 < 결정 < 조건/결정 < 변경 조건/결정(MC/DC) < 다중 조건
다중 조건 커버리지는 결정 안 조건들의 "모든 조합"을 시험해서 가장 강하다(조건이 n개면 2ⁿ개).`,
      { options: ['ㄱ. 결정 커버리지', 'ㄴ. 다중 조건 커버리지', 'ㄷ. 구문 커버리지', 'ㄹ. 변경 조건/결정 커버리지', 'ㅁ. 조건/결정 커버리지'] }),
    sqlWrite('튜플 삭제',
      '[수강] 테이블에서 점수가 60점 미만인 튜플을 모두 삭제하는 SQL을 쓰시오.',
      `CREATE TABLE 수강(학번 INTEGER, 과목 TEXT, 점수 INTEGER);
INSERT INTO 수강 VALUES (1, 'DB', 85), (1, 'OS', 55), (2, 'DB', 40), (2, 'NW', 72), (3, 'OS', 60), (3, 'NW', 59);`,
      'DELETE FROM 수강 WHERE 점수 < 60;',
      `DELETE FROM 테이블 WHERE 조건. WHERE를 빼면 모든 행이 지워진다.
60점 "미만"이라 60점인 (3, OS)는 남는다. 지워지는 행: 55, 40, 59
비교: DROP TABLE은 테이블 자체를, TRUNCATE는 모든 행을 (되돌릴 수 없게) 지운다.
이 문제는 쓴 SQL을 실제로 실행해 남은 행이 같으면 정답이다.`,
      { check: 'SELECT * FROM 수강 ORDER BY 학번, 과목;' }),
    sqlWrite('과목별 평균 조건 검색',
      "[성적] 테이블에서 과목별 평균 점수가 80점 이상인 과목의 과목명과 평균 점수를 조회하는 SQL을 쓰시오. (평균 점수 열의 이름은 '평균'으로 한다)",
      `CREATE TABLE 성적(학번 INTEGER, 과목 TEXT, 점수 INTEGER);
INSERT INTO 성적 VALUES (1, '국어', 90), (2, '국어', 80), (3, '국어', 70), (1, '영어', 85), (2, '영어', 95), (1, '수학', 60), (2, '수학', 70);`,
      'SELECT 과목, AVG(점수) AS 평균 FROM 성적 GROUP BY 과목 HAVING AVG(점수) >= 80;',
      `과목별로 묶고(GROUP BY), 묶은 뒤의 조건은 WHERE가 아니라 HAVING에 쓴다.
국어 (90 + 80 + 70) / 3 = 80, 영어 90, 수학 65 → 국어 80, 영어 90
WHERE AVG(점수) >= 80처럼 쓰면 오류다: WHERE는 묶기 전의 "행"을 거르므로 집계 함수를 쓸 수 없다.`),
    out('java', '상속과 super', `class Point {
    int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    int dist() { return Math.abs(x) + Math.abs(y); }
    public String toString() { return "(" + x + "," + y + ")"; }
}

class Point3 extends Point {
    int z;
    Point3(int x, int y, int z) { super(x, y); this.z = z; }
    @Override
    int dist() { return super.dist() + Math.abs(z); }
}

public class Main {
    public static void main(String[] args) {
        Point[] ps = { new Point(3, -4), new Point3(1, 2, -3) };
        int sum = 0;
        for (Point p : ps) sum += p.dist();
        System.out.println(ps[1] + " " + sum);
    }
}
`, '(1,2) 13',
      `• Point(3, -4).dist() = 3 + 4 = 7
• Point3(1, 2, -3).dist() = super.dist()(1 + 2) + 3 = 6 → 합 13
• 객체를 문자열과 + 하면 toString()이 불린다. Point3는 toString을 재정의하지 않아 Point 것이 쓰여 z 없이 "(1,2)"`),
    out('python', '집합 연산 메서드', `s = {"서울", "부산"}
s.add("대구")
s.update(["부산", "광주", "울산"])
s.discard("서울")
s.remove("울산")
lst = sorted(s)
print(len(s), lst[0], "대구" in s)
`, '3 광주 True',
      `집합은 중복을 허용하지 않는다: update로 넣은 "부산"은 이미 있어 하나로 남는다.
add(원소 하나), update(여러 개), discard(없어도 오류 없음), remove(없으면 KeyError)
남은 것: {부산, 대구, 광주} → 3개, 가나다순 정렬하면 광주가 처음`),
    term('net', '엣지 컴퓨팅',
      `다음 설명에 해당하는 기술을 쓰시오.
데이터를 멀리 있는 중앙 클라우드 데이터센터로 모두 보내지 않고, 데이터가 생기는 기기나 그 가까이(네트워크 가장자리)에서 바로 처리한다. 지연 시간과 전송량을 줄여 자율주행차, 공장 IoT처럼 즉시 반응해야 하는 곳에 쓴다.`,
      ['엣지 컴퓨팅', 'Edge Computing', '에지 컴퓨팅'],
      `엣지(Edge) 컴퓨팅. 비슷한 말: 포그(Fog) 컴퓨팅(엣지와 클라우드 사이 계층).
클라우드는 "모아서 크게", 엣지는 "가까이서 빠르게" 처리한다.`,
      { trend: true }),
    term('db', '뷰(View)',
      '하나 이상의 기본 테이블에서 유도되어 만들어지는 가상 테이블로, 데이터를 물리적으로 저장하지 않으며 보안과 사용 편의를 위해 쓰는 것을 쓰시오.',
      ['뷰', 'View'],
      `뷰(View)의 특징: 필요한 열만 보여 줘 보안에 좋고, 복잡한 조인을 숨긴다. 뷰 위에 또 뷰를 만들 수 있다.
한계: 독립적인 인덱스가 없고, ALTER로 정의를 바꿀 수 없으며, 조인·집계가 들어간 뷰는 수정(INSERT·UPDATE)이 제한된다.`,
      { trend: true }),
    term('design', 'MVC 패턴',
      `다음 설명에 해당하는 아키텍처 패턴을 영문 약어로 쓰시오.
응용 프로그램을 데이터와 비즈니스 로직을 담당하는 부분, 사용자에게 보이는 화면을 담당하는 부분, 사용자 입력을 받아 둘을 연결하는 부분의 세 가지로 나눈다. 화면을 바꿔도 로직을 고칠 필요가 없어 유지보수가 쉽다.`,
      ['MVC', 'Model-View-Controller', 'Model View Controller', '모델 뷰 컨트롤러'],
      `MVC(Model-View-Controller): 모델(데이터·로직), 뷰(화면), 컨트롤러(입력 처리·연결)
다른 아키텍처 패턴: 계층(레이어), 클라이언트-서버, 파이프-필터, 브로커, 피어 투 피어, 이벤트 버스, 마스터-슬레이브`,
      { trend: true }),
    term('dev', '형상 통제',
      '형상 관리 절차(식별 → 통제 → 감사 → 기록) 중, 변경 요청을 검토하고 승인해 현재의 기준선(베이스라인)에 반영되도록 조정하는 활동을 쓰시오.',
      ['형상 통제', 'Configuration Control', '변경 통제', '형상통제'],
      `형상 관리: 소프트웨어의 변경을 추적·통제하는 활동. 도구: Git, SVN, CVS
• 형상 식별: 관리 대상에 이름·번호 붙이기 / 형상 통제: 변경 요청 검토·승인(형상 통제 위원회, CCB)
• 형상 감사: 기준선 변경이 제대로 되었는지 검증 / 형상 기록(상태 보고): 결과를 기록·보고`,
      { trend: true }),
    blanks('os', '프로세스 상태 전이',
      '프로세스 상태 전이에 대한 설명이다. 빈칸에 알맞은 상태를 〈보기〉에서 골라 쓰시오.',
      [['①', '준비', 'Ready', '준비 상태'], ['②', '실행', 'Running', 'Run', '실행 상태'], ['③', '대기', 'Waiting', 'Blocked', 'Block', '대기 상태', '보류']],
      `• 디스패치: 준비 → 실행 (스케줄러가 CPU를 줌)
• 타임아웃(할당 시간 끝): 실행 → 준비
• 입출력 요청(Block): 실행 → 대기
• 입출력 완료(Wake up): 대기 → 준비 (바로 실행으로 가지 않는다!)`,
      {
        pre: `생성된 프로세스는 ( ① ) 상태로 들어가 CPU를 기다린다.
CPU를 할당받으면(디스패치) ( ② ) 상태가 된다.
할당 시간이 끝나면 ( ② ) → ( ① )로, 입출력을 요청하면 ( ② ) → ( ③ )로 간다.
입출력이 끝나면 ( ③ ) → ( ① )로 간다.`,
        options: ['생성', '준비', '실행', '대기', '종료'],
        trend: true,
      }),
    out('c', '구조체 배열과 함수', `#include <stdio.h>

typedef struct { char name[8]; int price; int qty; } Item;

int total(Item *it, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += it[i].price * it[i].qty;
    return s;
}

void sale(Item *it, int n, int pct) {
    for (int i = 0; i < n; i++)
        if (it[i].qty >= 3) it[i].price -= it[i].price * pct / 100;
}

int main(void) {
    Item cart[3] = {{"pen", 1000, 3}, {"cup", 4500, 1}, {"note", 2000, 5}};
    int before = total(cart, 3);
    sale(cart, 3, 10);
    printf("%d %d %d", before, total(cart, 3), cart[2].price);
    return 0;
}
`, '17500 16200 1800',
      `before: 1000×3 + 4500×1 + 2000×5 = 17500
sale: 수량 3 이상(pen, note)만 10% 할인 → pen 900, note 1800 (배열은 주소로 넘어가 원본이 바뀐다)
after: 900×3 + 4500×1 + 1800×5 = 16200`,
      { trend: true }),
    out('java', '가변 길이 2차원 배열', `public class Main {
    public static void main(String[] args) {
        int[][] m = new int[3][];
        for (int i = 0; i < 3; i++) {
            m[i] = new int[i + 2];
            for (int j = 0; j < m[i].length; j++) m[i][j] = i + j;
        }
        int sum = 0;
        for (int[] row : m) sum += row[row.length - 1];
        System.out.println(m.length + " " + m[2].length + " " + sum);
    }
}
`, '3 4 9',
      `new int[3][]는 행 3개만 만들고, 각 행의 길이는 따로 정한다(2, 3, 4).
m = [[0, 1], [1, 2, 3], [2, 3, 4, 5]]
각 행의 마지막 값 1 + 3 + 5 = 9. m.length는 행 수 3, m[2].length는 4`,
      { trend: true }),
    out('python', '날짜 문자열 다루기', `s = "2023-04-22"
y, m, d = s.split("-")
print(int(m) + int(d), y[::-1].lstrip("3"), s.count("2"), "-".join([d, m, y[2:]]))
`, '26 202 4 22-04-23',
      `• 나누면 "2023", "04", "22" (문자열) → 정수로 바꿔 4 + 22 = 26
• "2023"을 뒤집으면 "3202", lstrip("3")은 왼쪽의 3들을 지운다 → "202"
• "2"는 2023에 2개, 22에 2개 → 4
• y[2:]는 "23" → "22-04-23"`,
      { trend: true }),
    term('sec', 'SQL 인젝션',
      '웹 입력 창에 SQL 문의 일부(예: \' OR \'1\'=\'1)를 넣어, 서버가 의도하지 않은 SQL을 실행하게 만들어 인증을 우회하거나 데이터를 빼내는 공격을 쓰시오.',
      ['SQL 인젝션', 'SQL Injection', 'SQL 삽입', 'SQL 주입'],
      `원인: 입력값을 SQL 문자열에 그대로 이어 붙이기.
대응: 준비된 문장(PreparedStatement, 매개변수 바인딩), 입력값 검증, 최소 권한 DB 계정, 오류 메시지 숨기기.`,
      { trend: true }),
  ]),
];
