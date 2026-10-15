CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
INSERT INTO users(name, age) VALUES
  ('Kim', 25), ('Lee', 34), ('Park', 41), ('Choi', 29), ('Jung', 37);
CREATE TABLE orders(id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER);
INSERT INTO orders(user_id, amount) VALUES
  (2, 1200), (3, 800), (2, 450), (5, 3000);
CREATE INDEX idx_users_age ON users(age);
