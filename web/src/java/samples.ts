// Java 학습 예제. 기초 문법 → 배열·알고리즘 → 객체 → 자료구조 순서.
export interface Sample { group: string; label: string; code: string }

export const JAVA_SAMPLES: Sample[] = [
  {
    group: '기초', label: '변수와 연산',
    code: `public class Main {
    public static void main(String[] args) {
        int a = 7;
        int b = 3;
        int sum = a + b;
        int quotient = a / b;     // 정수 나눗셈은 몫만 남는다
        int remainder = a % b;
        double avg = (a + b) / 2.0;
        String msg = "합계는 " + sum;
        System.out.println(msg);
        System.out.println(quotient + " ... " + remainder + ", 평균 " + avg);
    }
}
`,
  },
  {
    group: '기초', label: '조건문 — 학점 계산',
    code: `public class Main {
    public static void main(String[] args) {
        int[] scores = {95, 82, 67, 74};
        for (int score : scores) {
            char grade;
            if (score >= 90) {
                grade = 'A';
            } else if (score >= 80) {
                grade = 'B';
            } else if (score >= 70) {
                grade = 'C';
            } else {
                grade = 'F';
            }
            System.out.println(score + "점 → " + grade);
        }
    }
}
`,
  },
  {
    group: '기초', label: '반복문 — 1부터 n까지 합',
    code: `public class Main {
    public static void main(String[] args) {
        int n = 5;
        int sum = 0;
        for (int i = 1; i <= n; i++) {
            sum += i;
        }
        System.out.println("for 합계: " + sum);

        int k = n;
        int product = 1;
        while (k > 0) {
            product *= k;
            k--;
        }
        System.out.println("while 곱: " + product);
    }
}
`,
  },
  {
    group: '배열과 알고리즘', label: '배열 — 최댓값 찾기',
    code: `public class Main {
    public static void main(String[] args) {
        int[] data = {4, 9, 2, 11, 6};
        int max = data[0];
        int at = 0;
        for (int i = 1; i < data.length; i++) {
            if (data[i] > max) {
                max = data[i];
                at = i;
            }
        }
        System.out.println("최댓값 " + max + " (인덱스 " + at + ")");
    }
}
`,
  },
  {
    group: '배열과 알고리즘', label: '버블 정렬',
    code: `public class Main {
    public static void main(String[] args) {
        int[] data = {5, 2, 9, 1, 7};
        for (int i = 0; i < data.length - 1; i++) {
            for (int j = 0; j < data.length - 1 - i; j++) {
                if (data[j] > data[j + 1]) {
                    int tmp = data[j];
                    data[j] = data[j + 1];
                    data[j + 1] = tmp;
                }
            }
        }
        System.out.println(java.util.Arrays.toString(data));
    }
}
`,
  },
  {
    group: '배열과 알고리즘', label: '이진 탐색',
    code: `public class Main {
    static int search(int[] arr, int target) {
        int lo = 0;
        int hi = arr.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            if (arr[mid] == target) {
                return mid;
            } else if (arr[mid] < target) {
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] sorted = {1, 3, 4, 7, 9, 12, 15, 20};
        int idx = search(sorted, 12);
        System.out.println("12의 위치: " + idx);
    }
}
`,
  },
  {
    group: '메서드', label: '재귀 — 팩토리얼',
    code: `public class Main {
    static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int result = factorial(4);
        System.out.println("4! = " + result);
    }
}
`,
  },
  {
    group: '객체', label: '클래스와 객체 — 은행 계좌',
    code: `public class Main {
    static class Account {
        String owner;
        int balance;

        Account(String owner, int balance) {
            this.owner = owner;
            this.balance = balance;
        }

        void deposit(int amount) {
            balance += amount;
        }

        boolean withdraw(int amount) {
            if (amount > balance) {
                return false;
            }
            balance -= amount;
            return true;
        }
    }

    public static void main(String[] args) {
        Account kim = new Account("Kim", 1000);
        Account lee = new Account("Lee", 500);
        kim.deposit(300);
        boolean ok = lee.withdraw(800);
        System.out.println(kim.owner + ": " + kim.balance);
        System.out.println(lee.owner + " 출금 " + (ok ? "성공" : "실패") + ", 잔액 " + lee.balance);
    }
}
`,
  },
  {
    group: '자료구조', label: '스택과 큐',
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1);
        stack.push(2);
        stack.push(3);
        int top = stack.pop();       // 나중에 넣은 것이 먼저 나온다 (LIFO)

        Queue<String> queue = new LinkedList<>();
        queue.offer("A");
        queue.offer("B");
        queue.offer("C");
        String first = queue.poll(); // 먼저 넣은 것이 먼저 나온다 (FIFO)

        System.out.println("pop: " + top + ", poll: " + first);
    }
}
`,
  },
  {
    group: '자료구조', label: '연결 리스트 직접 만들기',
    code: `public class Main {
    static class Node {
        int value;
        Node next;

        Node(int value) {
            this.value = value;
        }
    }

    public static void main(String[] args) {
        Node head = new Node(10);
        head.next = new Node(20);
        head.next.next = new Node(30);

        // 맨 앞에 새 노드 끼워 넣기
        Node first = new Node(5);
        first.next = head;
        head = first;

        int sum = 0;
        for (Node cur = head; cur != null; cur = cur.next) {
            sum += cur.value;
        }
        System.out.println("합계 " + sum);
    }
}
`,
  },
  {
    group: '자료구조', label: 'HashMap — 단어 세기',
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        String[] words = {"apple", "banana", "apple", "cherry", "banana", "apple"};
        Map<String, Integer> count = new HashMap<>();
        for (String w : words) {
            count.put(w, count.getOrDefault(w, 0) + 1);
        }
        System.out.println(count);
    }
}
`,
  },
];
