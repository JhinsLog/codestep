# codestep

작성한 코드를 실제로 실행하면서, 한 줄씩의 실행 기록으로 변수와 자료구조의 변화를
2D·3D로 보여주는 CS 학습 도구. 디버거처럼 중단점과 단계 실행으로 따라간다.

- 언어: C, Python, Java
- SQL: 작성한 쿼리가 데이터를 행 단위로 어떻게 처리하는지 보여준다
- 추적은 AI 없이 결정론적 계측으로 한다

> codestep은 임시 이름이다.

## 구성

| 경로 | 내용 |
|---|---|
| `web/` | 화면 (Vite + TypeScript). 첫 화면(언어 선택), Java, SQL |
| `web/src/trace/types.ts` | **Trace 계약** — 언어별 실행기와 화면 사이의 유일한 약속 |
| `web/src/trace/session.ts` | 기록된 Trace 위의 디버거 (들어가기·넘어가기·나가기·계속·뒤로·줄 클릭) |
| `web/src/view/stage3d.ts` | 3D 무대 (three.js): 호출 스택 탑, 힙 객체, 참조 화살표, 값이 옮겨 가는 움직임 |
| `web/src/view/three/flow.ts` | 값의 출처 추정 — 방금 실행한 줄을 보고 "t = x[j]"면 x[j] 칸에서 t로 날린다 |
| `runners/java/` | Java 실행기: JDI로 줄 단위 추적, 격리 컨테이너 이미지 |
| `runners/python/` | Python 실행기: sys.settrace로 줄 단위 추적 |
| `runners/c/` | C 실행기: gcc로 컴파일, gdb로 모든 줄에 중단점을 걸어 추적. 포인터를 주소·배열 칸·변수로 풀고 malloc/free를 기록 |
| `web/src/exam/` | 정보처리기사 모드: 유형별 연습 문제, 2020~2026년 회차 모의고사(`rounds/`, 기출 개념을 새 지문·코드로 재구성), 채점(SQL 작성은 실제 실행으로 비교), 답안 임시 저장(`store.ts`, localStorage), 이론 시뮬레이터 |
| `tools/exam-check/` | 정보처리기사 코드·SQL 문제의 정답을 실제 실행 결과와 대조 (`check.mts r2024-`처럼 회차만 골라 돌릴 수 있다) |
| `spikes/sqlite-vdbe/` | 계측한 SQLite 엔진. 실행 루프(VDBE)의 opcode를 행 단위로 기록 (브라우저 WASM) |
| `server/static.mjs` | `web/dist` 서빙 + `/api/`를 실행 API로 전달 (127.0.0.1:5180) |
| `server/api.mjs` | 실행 API: 대기열·요청 제한·Access JWT 검증 뒤 컨테이너 실행 (127.0.0.1:5181) |
| `deploy/` | systemd 서비스 파일 |
| `tools/screenshot/` | 화면 확인: 공식 Playwright 컨테이너(네트워크 없음)에서 예제를 돌려 찍는다 |

## 실행 위치

| 언어 | 실행 위치 |
|---|---|
| SQL | 방문자 브라우저 (SQLite WASM) |
| Python | 서버의 격리 컨테이너 (sys.settrace) |
| Java, C | 서버의 격리 컨테이너 — 네트워크 차단, 읽기 전용 루트, 권한 제거, 비root, CPU·메모리·프로세스 수·시간 제한 |

C·Java 실행 API는 격리와 요청 제한을 검증하기 전까지 Cloudflare Access로 잠가 둔다.
`server/api.mjs`는 Access JWT를 직접 검증하고, 설정이 없으면 모든 실행을 거부한다.

## 빌드와 실행

```
cd web
npm ci
npm run engine     # SQLite 엔진 WASM 빌드 (emsdk 필요, spikes/sqlite-vdbe/build.sh)
npm run build      # 타입 검사 + web/dist 생성
docker build -t codestep-java:current ../runners/java
node ../server/static.mjs & node ../server/api.mjs
```

운영에서는 `deploy/codestep-web.service`·`codestep-api.service`로 띄우고, 서버 공용
Cloudflare 터널(`jhinslog-server`)의 경로가 `codestep.jhinslog.com` → `http://localhost:5180`으로
연결한다. 공개 서비스다(`/etc/codestep/api.env`의 `CODESTEP_API_OPEN=1`).

자원은 `deploy/codestep.slice`(CPU 2개·메모리 1G) 안에 묶인다. 웹·API 서비스는
`Slice=codestep.slice`로, 실행 컨테이너는 `CODESTEP_CGROUP_PARENT=codestep.slice`로 들어간다.
실행 하나는 다시 CPU 1개·메모리 256MB 컨테이너로 따로 묶이고, 동시에 2개·한 사람(IP)당 1개만 돈다.
