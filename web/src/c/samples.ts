// C 학습 예제. 변수와 주소 → 포인터 → 배열·문자열 → 구조체 → 동적 메모리 순서.
import type { Sample } from '../java/samples';

export const C_SAMPLES: Sample[] = [
  {
    group: '포인터', label: '변수의 주소와 포인터',
    code: `#include <stdio.h>

int main(void) {
    int x = 10;
    int *p = &x;      // p에는 x의 주소가 들어간다
    *p = 20;          // p가 가리키는 곳(x)에 20을 쓴다
    printf("%d %d\\n", x, *p);
    return 0;
}
`,
  },
  {
    group: '포인터', label: '배열과 포인터 연산',
    code: `#include <stdio.h>

int main(void) {
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;           // 배열 이름은 첫 칸의 주소
    p = p + 2;            // int 두 칸(8바이트) 뒤로
    printf("%d ", *p);
    p++;
    printf("%d ", *p);
    printf("%d\\n", *(a + 1));
    return 0;
}
`,
  },
  {
    group: '포인터', label: '값 전달과 주소 전달 (swap)',
    code: `#include <stdio.h>

void swap_value(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

void swap_pointer(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main(void) {
    int x = 3, y = 8;
    swap_value(x, y);
    swap_pointer(&x, &y);
    printf("%d %d\\n", x, y);
    return 0;
}
`,
  },
  {
    group: '배열', label: '버블 정렬',
    code: `#include <stdio.h>

int main(void) {
    int data[5] = {5, 2, 9, 1, 7};
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4 - i; j++) {
            if (data[j] > data[j + 1]) {
                int tmp = data[j];
                data[j] = data[j + 1];
                data[j + 1] = tmp;
            }
        }
    }
    for (int i = 0; i < 5; i++) printf("%d ", data[i]);
    return 0;
}
`,
  },
  {
    group: '배열', label: '문자열은 char 배열',
    code: `#include <stdio.h>

int main(void) {
    char s[] = "CODE";      // 끝에 \\0 이 하나 더 붙는다
    int len = 0;
    while (s[len] != '\\0') {
        len++;
    }
    s[0] = 'M';
    printf("%s %d\\n", s, len);
    return 0;
}
`,
  },
  {
    group: '배열', label: '2차원 배열',
    code: `#include <stdio.h>

int main(void) {
    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int sum = 0;
    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 3; j++) {
            sum += m[i][j];
        }
    }
    printf("%d\\n", sum);
    return 0;
}
`,
  },
  {
    group: '구조체', label: '구조체와 포인터',
    code: `#include <stdio.h>

struct Point {
    int x;
    int y;
};

void move(struct Point *p, int dx) {
    p->x += dx;      // (*p).x 와 같다
}

int main(void) {
    struct Point a = {1, 2};
    struct Point b = a;   // 구조체는 통째로 복사된다
    move(&a, 10);
    printf("%d %d\\n", a.x, b.x);
    return 0;
}
`,
  },
  {
    group: '함수', label: '재귀 — 팩토리얼',
    code: `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int r = factorial(4);
    printf("%d\\n", r);
    return 0;
}
`,
  },
  {
    group: '동적 메모리', label: 'malloc과 free',
    code: `#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 4;
    int *arr = malloc(n * sizeof(int));   // 힙에 int 4칸
    for (int i = 0; i < n; i++) {
        arr[i] = (i + 1) * 10;
    }
    int *last = arr + n - 1;
    printf("%d\\n", *last);
    free(arr);                            // 해제한 뒤에는 쓰면 안 된다
    return 0;
}
`,
  },
  {
    group: '동적 메모리', label: '연결 리스트',
    code: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int value;
    struct Node *next;
};

struct Node *push(struct Node *head, int v) {
    struct Node *n = malloc(sizeof(struct Node));
    n->value = v;
    n->next = head;
    return n;
}

int main(void) {
    struct Node *head = NULL;
    head = push(head, 30);
    head = push(head, 20);
    head = push(head, 10);
    int sum = 0;
    for (struct Node *cur = head; cur != NULL; cur = cur->next) {
        sum += cur->value;
    }
    printf("%d\\n", sum);
    return 0;
}
`,
  },
];
