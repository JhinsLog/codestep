// 정보처리기사 실기 대비 문제.
//
// 기출 원문은 싣지 않는다. 출제기관이 실기 문제를 공개하지 않고, 인터넷의 "복원 문제"는
// 각 학원·블로그의 저작물이기 때문이다. 대신 기출에 반복해서 나오는 유형(포인터 연산,
// 오버라이딩, 슬라이싱, GROUP BY, LRU, 라운드 로빈 …)을 그대로 재현한 자체 문제를 둔다.
//
// 코드 문제의 정답은 실제 실행 결과로 검증했다 (tools/exam-check). 이론 문제의 정답은
// 화면의 시뮬레이터가 계산한 값과 같다 (answer.ts).
//
// 여기 있는 것은 유형별 연습 문제다. 회차별 모의고사 문제는 rounds/에 있다.
import type { PageAlgo } from './sims/paging';
import type { Proc, SchedAlgo } from './sims/sched';
import type { Order } from './sims/tree';

export type Category = 'c' | 'java' | 'python' | 'sql' | 'db' | 'design' | 'dev' | 'os' | 'net' | 'sec' | 'ds';

export const CATEGORIES: { id: Category; name: string; desc: string }[] = [
  { id: 'c', name: 'C 언어', desc: '포인터·배열·구조체·재귀 — 실기에서 가장 많이 나온다' },
  { id: 'java', name: 'Java', desc: '상속·오버라이딩·static·생성자 순서·예외' },
  { id: 'python', name: 'Python', desc: '슬라이싱·딕셔너리·집합·클래스' },
  { id: 'sql', name: 'SQL', desc: 'GROUP BY·JOIN·서브쿼리 결과 쓰기와 SQL 작성' },
  { id: 'db', name: '데이터베이스', desc: '정규화·관계대수·트랜잭션·키·무결성' },
  { id: 'design', name: '소프트웨어 설계', desc: '디자인 패턴·결합도·응집도·UML·요구사항' },
  { id: 'dev', name: '개발·테스트', desc: '테스트 기법·커버리지·형상 관리·인터페이스' },
  { id: 'os', name: '운영체제', desc: '페이지 교체·CPU 스케줄링·리눅스 권한' },
  { id: 'net', name: '네트워크', desc: '서브넷 계산·프로토콜·라우팅·OSI' },
  { id: 'sec', name: '보안·신기술', desc: '공격 기법·암호 알고리즘·접근 통제·신기술 용어' },
  { id: 'ds', name: '자료구조', desc: '트리 순회·수식 표기 변환' },
];

/** 빈칸 하나: 화면 표시 이름(①, ② …)과 인정하는 답들 (첫 번째가 대표 답) */
export interface Blank { label: string; accept: string[] }

/** 문제에 딸린 표 (관계대수·정규화 문제 등) */
export interface Table { name?: string; cols: string[]; rows: (string | number)[][] }

interface Base {
  id: string;
  cat: Category;
  title: string;
  question: string;
  explain: string;   // 채점 뒤 보여 주는 해설
  round?: string;    // 회차 문제면 회차 id ('2024-2')
  no?: number;       // 회차 안의 문항 번호
  trend?: boolean;   // 그 회차의 문항 개념을 확인하지 못해 같은 시기 경향으로 채운 문항
}

export type Problem =
  | Base & { kind: 'code'; lang: 'c' | 'java' | 'python'; code: string; answer: string }
  // 코드 빈칸: code 안의 빈칸 표시(blanks[].label)를 대표 답으로 채우면 out이 출력된다
  | Base & { kind: 'code-blank'; lang: 'c' | 'java' | 'python'; code: string; blanks: Blank[]; out: string }
  // SQL 실행 결과 쓰기. count면 결과 행(튜플)의 개수를 묻는다
  | Base & { kind: 'sql'; setup: string; query: string; answer: string; count?: boolean }
  // SQL 작성: 쓴 SQL을 실제로 실행해 모범 답안과 결과를 비교한다. check는 실행 뒤 상태를 확인하는 조회문
  | Base & { kind: 'sql-write'; setup: string; answer: string; check?: string }
  // 용어·빈칸·보기 선택·계산 단답
  | Base & { kind: 'short'; blanks: Blank[]; options?: string[]; tables?: Table[]; pre?: string }
  | Base & { kind: 'paging'; refs: number[]; frames: number; algo: PageAlgo }
  | Base & { kind: 'sched'; procs: Proc[]; algo: SchedAlgo; quantum?: number; ask: 'avgWait' | 'avgTurn' }
  | Base & { kind: 'traverse'; level: string; order: Order }
  | Base & { kind: 'notation'; infix: string; to: 'post' | 'pre' }
  | Base & { kind: 'subnet'; ip: string; prefix: number; ask: 'network' | 'broadcast' | 'hosts' | 'mask' }
  | Base & { kind: 'subnet-div'; base: string; prefix: number; count: number; nth: number; ask: 'network' | 'broadcast' };

/** 회차 모의고사 */
export interface Round {
  id: string;          // '2024-2'
  label: string;       // '2024년 2회'
  pass?: number;       // 합격률(%)
  level: 1 | 2 | 3 | 4 | 5;   // 체감 난이도 (1 쉬움 … 5 매우 어려움)
  note: string;        // 이 회차의 특징
  problems: Problem[]; // 20문항
}

const OUT = '다음 프로그램의 실행 결과를 쓰시오.';

// SQL 문제에서 같이 쓰는 표
const STUDENTS = `CREATE TABLE 학생(학번 INTEGER PRIMARY KEY, 이름 TEXT, 학과 TEXT, 점수 INTEGER);
INSERT INTO 학생 VALUES
  (1, '김철수', '전기', 85), (2, '이영희', '컴퓨터', 92), (3, '박민수', '전기', 70),
  (4, '최지은', '컴퓨터', 88), (5, '정다은', '기계', 95), (6, '한상우', '컴퓨터', 64);`;
const DEPTS = `CREATE TABLE 학과(학과명 TEXT PRIMARY KEY, 건물 TEXT);
INSERT INTO 학과 VALUES ('전기', 'A동'), ('컴퓨터', 'B동'), ('기계', 'C동');`;

export const PROBLEMS: Problem[] = [
  // ── C ──────────────────────────────────────────────
  {
    id: 'c-ptr-arith', cat: 'c', kind: 'code', lang: 'c', title: '포인터 증감 연산',
    question: OUT,
    code: `#include <stdio.h>

int main(void) {
    int a[] = {10, 20, 30, 40, 50};
    int *p = a + 1;
    printf("%d ", *p++);
    printf("%d ", *++p);
    printf("%d", p[1] + *(p - 2));
    return 0;
}
`,
    answer: '20 40 70',
    explain: `p는 a[1]을 가리키며 시작한다.
• *p++ : 지금 값 20을 쓰고 p를 한 칸 옮긴다 → p는 a[2]
• *++p : 먼저 p를 옮기고(a[3]) 값을 쓴다 → 40
• p[1]은 a[4]=50, *(p-2)는 a[1]=20 → 70
후위 증가(p++)는 "쓰고 나서 이동", 전위 증가(++p)는 "이동하고 나서 쓰기"다.`,
  },
  {
    id: 'c-struct', cat: 'c', kind: 'code', lang: 'c', title: '구조체 배열과 화살표 연산자',
    question: OUT,
    code: `#include <stdio.h>

struct Item {
    char name[8];
    int price;
};

int main(void) {
    struct Item items[3] = {{"pen", 1200}, {"cup", 3500}, {"bag", 2800}};
    struct Item *p = items;
    int total = 0;
    for (int i = 0; i < 3; i++) {
        if ((p + i)->price > 2000) total += (p + i)->price;
    }
    printf("%d %s", total, (p + 2)->name);
    return 0;
}
`,
    answer: '6300 bag',
    explain: `(p + i)->price는 items[i].price와 같다. 2000보다 큰 3500과 2800만 더해 6300,
(p + 2)->name은 items[2].name인 "bag"이다.`,
  },
  {
    id: 'c-recursion', cat: 'c', kind: 'code', lang: 'c', title: '재귀 함수 값 추적',
    question: OUT,
    code: `#include <stdio.h>

int f(int n) {
    if (n <= 1) return 1;
    return f(n - 1) + f(n - 2) * 2;
}

int main(void) {
    printf("%d", f(5));
    return 0;
}
`,
    answer: '21',
    explain: `작은 값부터 채우면 쉽다. f(0)=1, f(1)=1
f(2)=f(1)+2·f(0)=3, f(3)=f(2)+2·f(1)=5, f(4)=f(3)+2·f(2)=11, f(5)=f(4)+2·f(3)=21`,
  },
  {
    id: 'c-string', cat: 'c', kind: 'code', lang: 'c', title: '문자열과 포인터',
    question: OUT,
    code: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "KOREA";
    char *p = s;
    int n = strlen(s);
    for (int i = n - 1; i >= 0; i -= 2) {
        printf("%c", *(p + i));
    }
    printf("%d", n);
    return 0;
}
`,
    answer: 'ARK5',
    explain: `strlen("KOREA")=5. i는 4, 2, 0 → s[4]='A', s[2]='R', s[0]='K'. 끝에 n=5를 붙여 ARK5.
*(p + i)는 p[i], 즉 s[i]와 같다.`,
  },
  {
    id: 'c-2d', cat: 'c', kind: 'code', lang: 'c', title: '2차원 배열의 대각선 합',
    question: OUT,
    code: `#include <stdio.h>

int main(void) {
    int m[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    int sum = 0;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (i == j || i + j == 2) sum += m[i][j];
        }
    }
    printf("%d", sum);
    return 0;
}
`,
    answer: '25',
    explain: `i == j는 주대각선(1, 5, 9), i + j == 2는 반대 대각선(3, 5, 7).
조건이 OR라서 가운데 5는 한 번만 더해진다 → 1+5+9+3+7 = 25`,
  },
  {
    id: 'c-static-switch', cat: 'c', kind: 'code', lang: 'c', title: 'static 변수와 switch 폴스루',
    question: OUT,
    code: `#include <stdio.h>

int count(void) {
    static int c = 0;
    c += 2;
    return c;
}

int main(void) {
    int x = 0;
    for (int i = 0; i < 3; i++) x += count();
    switch (x % 4) {
        case 0: x += 1;
        case 2: x += 10;
        default: x += 100;
    }
    printf("%d", x);
    return 0;
}
`,
    answer: '123',
    explain: `static 변수 c는 함수가 끝나도 값이 남는다 → count()는 2, 4, 6을 돌려주고 x=12.
12 % 4 = 0이라 case 0부터 시작하는데 break가 없어 아래 case까지 모두 실행된다(폴스루).
12 + 1 + 10 + 100 = 123`,
  },
  {
    id: 'c-swap', cat: 'c', kind: 'code', lang: 'c', title: '값에 의한 호출과 주소에 의한 호출',
    question: OUT,
    code: `#include <stdio.h>

void swap1(int a, int b) {
    int t = a; a = b; b = t;
}

void swap2(int *a, int *b) {
    int t = *a; *a = *b; *b = t;
}

int main(void) {
    int x = 3, y = 8;
    swap1(x, y);
    printf("%d %d ", x, y);
    swap2(&x, &y);
    printf("%d %d", x, y);
    return 0;
}
`,
    answer: '3 8 8 3',
    explain: `swap1은 값을 복사해 받으므로 main의 x, y는 그대로다(3 8).
swap2는 주소를 받아 그 주소의 값을 바꾸므로 x, y가 실제로 바뀐다(8 3).`,
  },
  {
    id: 'c-bit', cat: 'c', kind: 'code', lang: 'c', title: '비트 연산자',
    question: OUT,
    code: `#include <stdio.h>

int main(void) {
    int a = 12, b = 10;
    printf("%d %d %d %d", a & b, a | b, a ^ b, a << 2);
    return 0;
}
`,
    answer: '8 14 6 48',
    explain: `12 = 1100, 10 = 1010
• & (둘 다 1) 1000 = 8
• | (하나라도 1) 1110 = 14
• ^ (서로 다르면 1) 0110 = 6
• << 2 (왼쪽으로 두 칸 = ×4) 48`,
  },

  // ── Java ───────────────────────────────────────────
  {
    id: 'java-override', cat: 'java', kind: 'code', lang: 'java', title: '오버라이딩과 업캐스팅',
    question: OUT,
    code: `class Animal {
    String sound() { return "..."; }
    void speak() { System.out.print(sound() + " "); }
}

class Dog extends Animal {
    String sound() { return "멍"; }
}

class Puppy extends Dog {
    void speak() { System.out.print("[" + sound() + "] "); }
}

public class Main {
    public static void main(String[] args) {
        Animal[] arr = { new Animal(), new Dog(), new Puppy() };
        for (Animal a : arr) a.speak();
    }
}
`,
    answer: '... 멍 [멍]',
    explain: `변수 타입이 Animal이어도 실제 객체의 메서드가 불린다(동적 바인딩).
• Animal: speak() → sound()는 "..."
• Dog: speak()는 Animal 것, sound()는 Dog 것 → "멍"
• Puppy: speak()는 Puppy 것, sound()는 물려받은 Dog 것 → "[멍]"`,
  },
  {
    id: 'java-static', cat: 'java', kind: 'code', lang: 'java', title: 'static 필드와 인스턴스 필드',
    question: OUT,
    code: `class Counter {
    static int total = 0;
    int mine = 0;

    void hit() {
        total++;
        mine++;
    }
}

public class Main {
    public static void main(String[] args) {
        Counter a = new Counter();
        Counter b = new Counter();
        a.hit();
        a.hit();
        b.hit();
        System.out.println(a.mine + " " + b.mine + " " + Counter.total);
    }
}
`,
    answer: '2 1 3',
    explain: `mine은 객체마다 따로 있고(a는 2번, b는 1번), static인 total은 클래스에 하나라 모든 객체가 함께 쓴다(3).`,
  },
  {
    id: 'java-ctor', cat: 'java', kind: 'code', lang: 'java', title: '생성자 호출 순서와 super',
    question: OUT,
    code: `class Parent {
    Parent() { System.out.print("P"); }
    Parent(int x) { System.out.print("P" + x); }
}

class Child extends Parent {
    Child() { System.out.print("C"); }
    Child(int x) {
        super(x * 2);
        System.out.print("C" + x);
    }
}

public class Main {
    public static void main(String[] args) {
        new Child();
        System.out.print(" ");
        new Child(3);
    }
}
`,
    answer: 'PC P6C3',
    explain: `자식 생성자는 맨 먼저 부모 생성자를 부른다. super(...)를 안 쓰면 부모의 기본 생성자가 불린다.
• new Child() → Parent() "P" → "C"
• new Child(3) → super(6) "P6" → "C3"`,
  },
  {
    id: 'java-ref', cat: 'java', kind: 'code', lang: 'java', title: '배열 참조와 매개변수 전달',
    question: OUT,
    code: `public class Main {
    static void change(int[] arr, int n) {
        arr[0] = 100;
        n = 100;
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3};
        int[] b = a;
        int n = 5;
        b[1] = 20;
        change(a, n);
        System.out.println(a[0] + a[1] + a[2] + n);
    }
}
`,
    answer: '128',
    explain: `b = a는 배열을 복사하지 않고 같은 배열을 가리키게 한다 → b[1]=20은 a[1]도 바꾼다.
change()에는 배열의 참조가 넘어가 arr[0]=100이 원래 배열에 반영되지만, n은 값만 복사되어 main의 n은 5 그대로다.
100 + 20 + 3 + 5 = 128 (문자열이 없으므로 숫자 덧셈)`,
  },
  {
    id: 'java-string-eq', cat: 'java', kind: 'code', lang: 'java', title: '문자열 == 와 equals',
    question: OUT,
    code: `public class Main {
    public static void main(String[] args) {
        String a = "java";
        String b = "java";
        String c = new String("java");
        System.out.print((a == b) + " ");
        System.out.print((a == c) + " ");
        System.out.print(a.equals(c));
    }
}
`,
    answer: 'true false true',
    explain: `같은 문자열 리터럴은 상수 풀의 같은 객체를 쓴다 → a == b는 true.
new String()은 새 객체를 만든다 → a == c(같은 객체인가?)는 false, equals(내용이 같은가?)는 true.`,
  },
  {
    id: 'java-exception', cat: 'java', kind: 'code', lang: 'java', title: '예외 처리와 finally',
    question: OUT,
    code: `public class Main {
    public static void main(String[] args) {
        int[] a = {1, 2, 3};
        int sum = 0;
        try {
            for (int i = 0; i <= 3; i++) sum += a[i];
        } catch (ArrayIndexOutOfBoundsException e) {
            sum += 10;
        } finally {
            sum += 100;
        }
        System.out.println(sum);
    }
}
`,
    answer: '116',
    explain: `a[0]~a[2]를 더해 6, i = 3에서 배열 범위를 벗어나 catch로 간다(+10 → 16).
finally는 예외가 나든 안 나든 항상 실행된다(+100 → 116).`,
  },
  {
    id: 'java-selection', cat: 'java', kind: 'code', lang: 'java', title: '선택 정렬과 교환 횟수',
    question: OUT,
    code: `public class Main {
    public static void main(String[] args) {
        int[] a = {5, 3, 8, 1, 9, 2};
        int swaps = 0;
        for (int i = 0; i < a.length - 1; i++) {
            int min = i;
            for (int j = i + 1; j < a.length; j++) {
                if (a[j] < a[min]) min = j;
            }
            if (min != i) {
                int t = a[i];
                a[i] = a[min];
                a[min] = t;
                swaps++;
            }
        }
        System.out.println(a[0] + "" + a[5] + " " + swaps);
    }
}
`,
    answer: '19 4',
    explain: `회차마다 남은 부분의 최솟값을 앞으로 보낸다.
1회차 5↔1, 2회차 3↔2, 3회차 8↔3, 4회차 교환 없음(5가 이미 제자리), 5회차 9↔8 → 교환 4번.
정렬 결과 a[0]=1, a[5]=9이고, a[0] + "" 에서 문자열이 되어 "19"가 된다.`,
  },
  {
    id: 'java-recursion', cat: 'java', kind: 'code', lang: 'java', title: '재귀로 2진수 만들기',
    question: OUT,
    code: `public class Main {
    static String bin(int n) {
        if (n < 2) return String.valueOf(n);
        return bin(n / 2) + (n % 2);
    }

    public static void main(String[] args) {
        System.out.println(bin(13));
    }
}
`,
    answer: '1101',
    explain: `bin(13) = bin(6) + 1 = (bin(3) + 0) + 1 = ((bin(1) + 1) + 0) + 1 = "1101".
가장 안쪽 호출의 결과가 맨 앞에 온다.`,
  },

  // ── Python ─────────────────────────────────────────
  {
    id: 'py-slice', cat: 'python', kind: 'code', lang: 'python', title: '리스트 슬라이싱',
    question: OUT,
    code: `a = [10, 20, 30, 40, 50, 60]
b = a[1:5:2]
c = a[::-2]
print(b, c, sum(b + c))
`,
    answer: '[20, 40] [60, 40, 20] 180',
    explain: `a[1:5:2]는 1번부터 5번 앞까지 두 칸씩 → [20, 40]
a[::-2]는 끝에서부터 두 칸씩 거꾸로 → [60, 40, 20]
b + c는 두 리스트를 이어 붙이고, 합은 180`,
  },
  {
    id: 'py-dict', cat: 'python', kind: 'code', lang: 'python', title: '딕셔너리로 개수 세기',
    question: OUT,
    code: `words = ["a", "bb", "a", "ccc", "bb", "a"]
d = {}
for w in words:
    d[w] = d.get(w, 0) + 1
print(d["a"] * len(d), max(d, key=d.get))
`,
    answer: '9 a',
    explain: `d = {'a': 3, 'bb': 2, 'ccc': 1}. d["a"] * len(d) = 3 × 3 = 9
max(d, key=d.get)은 값이 가장 큰 키 → 'a' (print는 따옴표 없이 a)`,
  },
  {
    id: 'py-comprehension', cat: 'python', kind: 'code', lang: 'python', title: '리스트 컴프리헨션과 문자열',
    question: OUT,
    code: `s = "Information"
r = [c.upper() for c in s if c in "aeiou"]
print("".join(r), len(r), s[-4:])
`,
    answer: 'OAIO 4 tion',
    explain: `소문자 모음만 고른다(맨 앞 대문자 I는 "aeiou"에 없다) → o, a, i, o → 대문자로 OAIO, 4개.
s[-4:]는 뒤에서 4글자 "tion".`,
  },
  {
    id: 'py-class', cat: 'python', kind: 'code', lang: 'python', title: '상속과 super()',
    question: OUT,
    code: `class Shape:
    def __init__(self, w, h):
        self.w = w
        self.h = h

    def area(self):
        return self.w * self.h


class Tri(Shape):
    def area(self):
        return super().area() // 2


shapes = [Shape(3, 4), Tri(3, 4), Tri(5, 5)]
print(sum(s.area() for s in shapes))
`,
    answer: '30',
    explain: `Shape(3, 4) → 12, Tri(3, 4) → 12 // 2 = 6, Tri(5, 5) → 25 // 2 = 12 (//는 몫)
12 + 6 + 12 = 30`,
  },
  {
    id: 'py-set', cat: 'python', kind: 'code', lang: 'python', title: '집합 연산',
    question: OUT,
    code: `a = {1, 2, 3, 4, 5}
b = {4, 5, 6, 7}
print(len(a & b), sorted(a - b), sorted(a ^ b)[-1])
`,
    answer: '2 [1, 2, 3] 7',
    explain: `a & b(교집합) {4, 5} → 2개, a - b(차집합) [1, 2, 3]
a ^ b(대칭차집합, 한쪽에만 있는 것) {1, 2, 3, 6, 7} → 정렬한 마지막 값 7`,
  },

  // ── SQL ────────────────────────────────────────────
  {
    id: 'sql-having', cat: 'sql', kind: 'sql', title: 'GROUP BY와 HAVING',
    question: '[학생] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄, 값은 공백으로 구분)',
    setup: STUDENTS,
    query: 'SELECT 학과, COUNT(*) FROM 학생 GROUP BY 학과 HAVING COUNT(*) >= 2;',
    answer: '전기 2\n컴퓨터 3',
    explain: `학과별로 묶으면 기계 1명, 전기 2명, 컴퓨터 3명. HAVING은 묶은 뒤의 조건이라 2명 이상인 전기·컴퓨터만 남는다.
WHERE는 묶기 전 행을, HAVING은 묶은 뒤 그룹을 거른다.`,
  },
  {
    id: 'sql-agg', cat: 'sql', kind: 'sql', title: '조건과 집계 함수',
    question: '[학생] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (값은 공백으로 구분)',
    setup: STUDENTS,
    query: `SELECT COUNT(*), MAX(점수) FROM 학생 WHERE 학과 = '컴퓨터' AND 점수 >= 70;`,
    answer: '2 92',
    explain: `컴퓨터 학과 중 70점 이상은 이영희(92), 최지은(88) 2명이고 최고 점수는 92. 한상우(64)는 조건에서 빠진다.`,
  },
  {
    id: 'sql-join', cat: 'sql', kind: 'sql', title: '조인',
    question: '[학생], [학과] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄)',
    setup: `${STUDENTS}\n${DEPTS}`,
    query: `SELECT s.이름 FROM 학생 s JOIN 학과 d ON s.학과 = d.학과명 WHERE d.건물 = 'B동' AND s.점수 > 80 ORDER BY s.이름;`,
    answer: '이영희\n최지은',
    explain: `B동은 컴퓨터 학과. 컴퓨터 학과 중 80점 초과는 이영희(92), 최지은(88). 이름순으로 정렬한다.`,
  },
  {
    id: 'sql-subquery', cat: 'sql', kind: 'sql', title: '서브쿼리와 정렬',
    question: '[학생] 테이블에 다음 SQL을 실행한 결과를 쓰시오. (행마다 한 줄)',
    setup: STUDENTS,
    query: 'SELECT 이름 FROM 학생 WHERE 점수 > (SELECT AVG(점수) FROM 학생) ORDER BY 점수 DESC;',
    answer: '정다은\n이영희\n최지은\n김철수',
    explain: `평균 = (85+92+70+88+95+64) / 6 ≈ 82.3. 이보다 높은 95, 92, 88, 85를 점수 내림차순으로 쓴다.
괄호 안의 서브쿼리가 먼저 한 번 계산되고, 바깥 쿼리가 그 값과 비교한다.`,
  },
  {
    id: 'sql-distinct', cat: 'sql', kind: 'sql', title: 'DISTINCT와 COUNT',
    question: '[학생] 테이블에 다음 SQL을 실행한 결과를 쓰시오.',
    setup: STUDENTS,
    query: 'SELECT COUNT(DISTINCT 학과) FROM 학생 WHERE 점수 >= 70;',
    answer: '3',
    explain: `70점 이상인 학생의 학과는 전기, 컴퓨터, 컴퓨터, 전기, 기계 → 중복을 빼면 3개.`,
  },

  // ── 운영체제 ───────────────────────────────────────
  {
    id: 'os-lru', cat: 'os', kind: 'paging', title: 'LRU 페이지 부재 횟수',
    question: '페이지 프레임이 3개이고 처음에는 모두 비어 있다. 다음 순서로 페이지를 참조할 때 LRU 기법의 페이지 부재(Page Fault) 횟수를 쓰시오.',
    refs: [1, 2, 3, 1, 4, 5, 2, 1, 3, 4], frames: 3, algo: 'LRU',
    explain: 'LRU는 가장 오랫동안 사용하지 않은 페이지를 교체한다. 적중했을 때도 "마지막 사용 시각"이 갱신된다는 점이 FIFO와 다르다.',
  },
  {
    id: 'os-fifo', cat: 'os', kind: 'paging', title: 'FIFO 페이지 부재 횟수',
    question: '페이지 프레임이 3개이고 처음에는 모두 비어 있다. 다음 순서로 페이지를 참조할 때 FIFO 기법의 페이지 부재 횟수를 쓰시오.',
    refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], frames: 3, algo: 'FIFO',
    explain: 'FIFO는 가장 먼저 들어온 페이지를 교체한다. 적중해도 들어온 순서는 바뀌지 않는다.',
  },
  {
    id: 'os-opt', cat: 'os', kind: 'paging', title: 'OPT 페이지 부재 횟수',
    question: '페이지 프레임이 3개이고 처음에는 모두 비어 있다. 다음 순서로 페이지를 참조할 때 OPT(최적) 기법의 페이지 부재 횟수를 쓰시오.',
    refs: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], frames: 3, algo: 'OPT',
    explain: 'OPT는 앞으로 가장 오랫동안 쓰이지 않을 페이지를 교체한다. 부재가 가장 적지만 미래를 알아야 해서 실제로는 쓸 수 없는 기준 알고리즘이다.',
  },
  {
    id: 'os-sjf', cat: 'os', kind: 'sched', title: 'SJF 평균 대기 시간',
    question: '다음 프로세스를 SJF(비선점) 기법으로 스케줄링할 때 평균 대기 시간을 쓰시오.',
    procs: [{ name: 'P1', arrival: 0, burst: 6 }, { name: 'P2', arrival: 1, burst: 3 }, { name: 'P3', arrival: 2, burst: 8 }, { name: 'P4', arrival: 3, burst: 2 }],
    algo: 'SJF', ask: 'avgWait',
    explain: 'SJF는 도착한 프로세스 중 실행 시간이 가장 짧은 것을 먼저 실행하고, 한번 시작하면 끝까지 실행한다. 대기 시간 = 종료 시간 - 도착 시간 - 실행 시간.',
  },
  {
    id: 'os-rr', cat: 'os', kind: 'sched', title: '라운드 로빈 평균 반환 시간',
    question: '다음 프로세스를 RR(시간 할당량 2) 기법으로 스케줄링할 때 평균 반환 시간을 쓰시오.',
    procs: [{ name: 'P1', arrival: 0, burst: 5 }, { name: 'P2', arrival: 1, burst: 3 }, { name: 'P3', arrival: 2, burst: 1 }, { name: 'P4', arrival: 3, burst: 2 }],
    algo: 'RR', quantum: 2, ask: 'avgTurn',
    explain: 'RR은 대기열 순서대로 시간 할당량만큼씩 돌아가며 실행한다. 할당량이 끝난 프로세스는 대기열 맨 뒤로 가는데, 같은 시각에 새로 도착한 프로세스가 먼저 줄을 선다. 반환 시간 = 종료 시간 - 도착 시간.',
  },
  {
    id: 'os-hrn', cat: 'os', kind: 'sched', title: 'HRN 평균 대기 시간',
    question: '다음 프로세스를 HRN 기법으로 스케줄링할 때 평균 대기 시간을 쓰시오.',
    procs: [{ name: 'A', arrival: 0, burst: 3 }, { name: 'B', arrival: 1, burst: 6 }, { name: 'C', arrival: 2, burst: 2 }, { name: 'D', arrival: 3, burst: 4 }],
    algo: 'HRN', ask: 'avgWait',
    explain: 'HRN은 응답률 (대기 시간 + 실행 시간) / 실행 시간이 가장 큰 프로세스를 고른다. 오래 기다릴수록 응답률이 올라가서 긴 작업도 언젠가 실행된다(기아 방지).',
  },
  {
    id: 'os-srt', cat: 'os', kind: 'sched', title: 'SRT 평균 대기 시간',
    question: '다음 프로세스를 SRT(선점형 SJF) 기법으로 스케줄링할 때 평균 대기 시간을 쓰시오.',
    procs: [{ name: 'P1', arrival: 0, burst: 7 }, { name: 'P2', arrival: 2, burst: 4 }, { name: 'P3', arrival: 4, burst: 1 }, { name: 'P4', arrival: 5, burst: 4 }],
    algo: 'SRT', ask: 'avgWait',
    explain: 'SRT는 새 프로세스가 도착할 때마다 남은 실행 시간을 비교해, 더 짧은 프로세스가 있으면 지금 프로세스를 멈추고(선점) 그것을 실행한다.',
  },

  // ── 자료구조 ───────────────────────────────────────
  {
    id: 'ds-postorder', cat: 'ds', kind: 'traverse', title: '이진 트리 후위 순회',
    question: '다음 이진 트리를 후위 순회(Postorder)한 결과를 쓰시오.',
    level: 'A B C D E F G - - H', order: 'post',
    explain: '후위 순회는 왼쪽 서브트리 → 오른쪽 서브트리 → 루트 순서다. 루트 A가 가장 마지막에 온다.',
  },
  {
    id: 'ds-inorder', cat: 'ds', kind: 'traverse', title: '이진 트리 중위 순회',
    question: '다음 이진 트리를 중위 순회(Inorder)한 결과를 쓰시오.',
    level: '1 2 3 4 5 - 6 - 7 - - - - 8', order: 'in',
    explain: '중위 순회는 왼쪽 서브트리 → 루트 → 오른쪽 서브트리 순서다. 트리를 위에서 눌러 바닥에 그림자를 떨어뜨린 왼쪽→오른쪽 순서와 같다.',
  },
  {
    id: 'ds-postfix', cat: 'ds', kind: 'notation', title: '중위식을 후위식으로',
    question: '다음 중위 표기식을 후위 표기식으로 바꾸시오.',
    infix: '(A+B)*C-D/E', to: 'post',
    explain: '피연산자는 바로 쓰고, 연산자는 스택에 넣되 자기보다 우선순위가 같거나 높은 연산자를 먼저 꺼낸다. 괄호 안은 먼저 처리된다.',
  },
  {
    id: 'ds-prefix', cat: 'ds', kind: 'notation', title: '중위식을 전위식으로',
    question: '다음 중위 표기식을 전위 표기식으로 바꾸시오.',
    infix: 'A*(B-C)+D/E', to: 'pre',
    explain: '수식 트리를 만든 뒤 전위 순회(루트 → 왼쪽 → 오른쪽)하면 전위식이 된다. 연산자가 피연산자 앞에 온다.',
  },

  // ── 네트워크 ───────────────────────────────────────
  {
    id: 'net-network', cat: 'net', kind: 'subnet', title: '네트워크 주소',
    question: 'IP 주소가 192.168.10.77/26일 때 이 호스트가 속한 네트워크 주소를 쓰시오.',
    ip: '192.168.10.77', prefix: 26, ask: 'network',
    explain: 'IP 주소와 서브넷 마스크를 비트 AND 하면 네트워크 주소다. /26이면 앞의 26비트가 네트워크 부분이고, 마지막 옥텟은 64 단위로 나뉜다.',
  },
  {
    id: 'net-broadcast', cat: 'net', kind: 'subnet', title: '브로드캐스트 주소',
    question: 'IP 주소가 172.16.45.200/20일 때 브로드캐스트 주소를 쓰시오.',
    ip: '172.16.45.200', prefix: 20, ask: 'broadcast',
    explain: '호스트 부분(뒤의 12비트)을 모두 1로 채우면 브로드캐스트 주소다. /20이면 세 번째 옥텟이 16 단위로 나뉜다.',
  },
  {
    id: 'net-hosts', cat: 'net', kind: 'subnet', title: '사용 가능한 호스트 수',
    question: '서브넷 마스크가 255.255.255.240(/28)일 때 한 서브넷에서 호스트에 할당할 수 있는 IP 주소 수를 쓰시오.',
    ip: '10.0.0.0', prefix: 28, ask: 'hosts',
    explain: '호스트 비트가 4개라 주소는 2⁴ = 16개. 네트워크 주소와 브로드캐스트 주소를 빼면 14개.',
  },
  {
    id: 'net-flsm', cat: 'net', kind: 'subnet-div', title: 'FLSM 서브넷 나누기',
    question: '200.1.1.0/24 네트워크를 FLSM 방식으로 6개의 서브넷으로 나누었다. 세 번째 서브넷의 브로드캐스트 주소를 쓰시오. (서브넷 제로 사용)',
    base: '200.1.1.0', prefix: 24, count: 6, nth: 3, ask: 'broadcast',
    explain: '6개 이상으로 나누려면 서브넷 비트가 3개 필요하다(2³ = 8). /27이 되어 서브넷마다 32개 주소씩 .0, .32, .64 … 로 나뉜다. 세 번째는 200.1.1.64/27이고 브로드캐스트는 .95.',
  },
];

