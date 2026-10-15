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
| `spikes/sqlite-vdbe/` | 계측한 SQLite 엔진. 실행 루프(VDBE)의 opcode를 행 단위로 기록 (Node·브라우저 WASM 빌드) |
| `web/` | 화면 (Vite + TypeScript). 지금은 SQL 실행 추적 화면 하나 |
| `server/static.mjs` | `web/dist`를 127.0.0.1:5180에서 서빙하는 정적 서버 (외부 의존성 없음) |
| `deploy/` | systemd 서비스 파일 |

## 빌드와 실행

```
cd web
npm ci
npm run engine     # SQLite 엔진 WASM 빌드 (emsdk 필요, spikes/sqlite-vdbe/build.sh)
npm run build      # 타입 검사 + web/dist 생성
node ../server/static.mjs
```

운영에서는 `deploy/codestep-web.service`로 띄우고, codestep 전용 Cloudflare 터널
(`deploy/codestep-tunnel.service`, Earth 터널과 별개)이
`codestep.jhinslog.com` → `http://localhost:5180`으로 연결한다 (Cloudflare Access 뒤).
