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
| `runners/java/` | Java 실행기: JDI로 줄 단위 추적, 격리 컨테이너 이미지 |
| `spikes/sqlite-vdbe/` | 계측한 SQLite 엔진. 실행 루프(VDBE)의 opcode를 행 단위로 기록 (브라우저 WASM) |
| `server/static.mjs` | `web/dist` 서빙 + `/api/`를 실행 API로 전달 (127.0.0.1:5180) |
| `server/api.mjs` | 실행 API: 대기열·요청 제한·Access JWT 검증 뒤 컨테이너 실행 (127.0.0.1:5181) |
| `deploy/` | systemd 서비스 파일 |

## 실행 위치

| 언어 | 실행 위치 |
|---|---|
| SQL | 방문자 브라우저 (SQLite WASM) |
| Python | 방문자 브라우저 (Pyodide, 예정) |
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

운영에서는 `deploy/codestep-web.service`로 띄우고, codestep 전용 Cloudflare 터널
(`deploy/codestep-tunnel.service`, Earth 터널과 별개)이
`codestep.jhinslog.com` → `http://localhost:5180`으로 연결한다 (Cloudflare Access 뒤).
