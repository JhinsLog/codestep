// Python 학습 예제. 기초 → 자료구조 → 함수·재귀 → 클래스 순서.
import type { Sample } from '../java/samples';

export const PYTHON_SAMPLES: Sample[] = [
  {
    group: '기초', label: '변수와 동적 타입',
    code: `a = 7
b = 3
print(a / b, a // b, a % b)   # 나누기, 몫, 나머지

a = "seven"                    # 같은 이름에 다른 타입의 값을 넣을 수 있다
print(a * 2, len(a))
`,
  },
  {
    group: '자료구조', label: '리스트 — 버블 정렬',
    code: `data = [5, 2, 9, 1, 7]
for i in range(len(data) - 1):
    for j in range(len(data) - 1 - i):
        if data[j] > data[j + 1]:
            data[j], data[j + 1] = data[j + 1], data[j]   # 두 값을 한 번에 바꾼다
print(data)
`,
  },
  {
    group: '자료구조', label: '리스트는 참조다',
    code: `a = [1, 2, 3]
b = a          # 복사가 아니라 같은 리스트를 가리킨다
c = a[:]       # 슬라이싱은 새 리스트를 만든다
b.append(4)
c.append(99)
print(a, b, c)
print(a is b, a is c)
`,
  },
  {
    group: '자료구조', label: '딕셔너리 — 단어 세기',
    code: `words = "the cat and the hat and the bat".split()
count = {}
for w in words:
    count[w] = count.get(w, 0) + 1
best = max(count, key=count.get)
print(count)
print(best, count[best])
`,
  },
  {
    group: '자료구조', label: '스택과 큐 (deque)',
    code: `from collections import deque

stack = []
stack.append("A")
stack.append("B")
stack.append("C")
top = stack.pop()          # 마지막에 넣은 것이 먼저 나온다 (LIFO)

queue = deque()
queue.append("A")
queue.append("B")
queue.append("C")
first = queue.popleft()    # 먼저 넣은 것이 먼저 나온다 (FIFO)
print(top, first, stack, list(queue))
`,
  },
  {
    group: '함수', label: '재귀 — 팩토리얼',
    code: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)


result = factorial(4)
print("4! =", result)
`,
  },
  {
    group: '함수', label: '이진 탐색',
    code: `def search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1


nums = [1, 3, 4, 7, 9, 12, 15, 20]
print(search(nums, 12))
`,
  },
  {
    group: '클래스', label: '클래스와 객체 — 은행 계좌',
    code: `class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def withdraw(self, amount):
        if amount > self.balance:
            return False
        self.balance -= amount
        return True


kim = Account("Kim", 1000)
lee = Account("Lee", 500)
kim.withdraw(300)
ok = lee.withdraw(800)
print(kim.balance, lee.balance, ok)
`,
  },
  {
    group: '클래스', label: '연결 리스트 직접 만들기',
    code: `class Node:
    def __init__(self, value):
        self.value = value
        self.next = None


head = Node(10)
head.next = Node(20)
head.next.next = Node(30)

first = Node(5)            # 맨 앞에 새 노드 끼워 넣기
first.next = head
head = first

total = 0
cur = head
while cur is not None:
    total += cur.value
    cur = cur.next
print("합계", total)
`,
  },
];
