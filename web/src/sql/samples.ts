// SQL 예제. 같은 테이블로 처리 방식이 어떻게 달라지는지 비교할 수 있게 구성했다.
const BASE = `CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
INSERT INTO users(name, age) VALUES
  ('Kim', 25), ('Lee', 34), ('Park', 41), ('Choi', 29), ('Jung', 37);
CREATE TABLE orders(id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER);
INSERT INTO orders(user_id, amount) VALUES
  (2, 1200), (3, 800), (2, 450), (5, 3000);`;

export interface Sample { label: string; setup: string; query: string }

export const SAMPLES: Sample[] = [
  { label: 'WHERE — 전체 훑기', setup: BASE, query: 'SELECT name FROM users WHERE age > 30;' },
  {
    label: 'WHERE — 인덱스 사용',
    setup: `${BASE}\nCREATE INDEX idx_users_age ON users(age);`,
    query: 'SELECT name FROM users WHERE age > 30;',
  },
  { label: 'JOIN', setup: BASE, query: 'SELECT u.name, o.amount FROM users u JOIN orders o ON o.user_id = u.id;' },
  { label: 'ORDER BY', setup: BASE, query: 'SELECT name FROM users WHERE age > 30 ORDER BY age;' },
  { label: 'GROUP BY', setup: BASE, query: 'SELECT user_id, SUM(amount) FROM orders GROUP BY user_id;' },
];
