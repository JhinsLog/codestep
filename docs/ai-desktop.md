# codestep AI 질문 — 데스크탑 쪽 할 일

codestep 화면의 "🤖 이 화면에 대해 AI에게 질문하기"에 답하는 AI는 **데스크탑의 로컬 모델**이 맡는다.
홈서버(jhinslog)는 질문을 줄 세워 두기만 하고, 데스크탑의 연결 프로그램이 **밖으로 먼저 접속해** 질문을 가져간다.

```
브라우저 ──질문+화면 정보──▶ 홈서버 codestep (/api/ask, 대기열)
                                  ▲  │
             (데스크탑이 먼저 접속)  │  ▼ 질문 하나
데스크탑: tools/ai-worker/worker.mjs ──▶ 로컬 모델 서버 (OpenAI 호환, 127.0.0.1:8081)
                │                 ◀── 답을 조각조각 돌려줌
                └─ 모델이 내려가 있으면 ──▶ 나히다 앱 (127.0.0.1:8084) /api/warm 으로 깨움
```

이 문서는 **데스크탑에서 일하는 Claude Code**가 메뉴 순서대로 따라 하도록 쓴 것이다.
각 메뉴 끝의 "보고"를 홈서버 세션(이름 `codestep-0c`)에 보내면 된다.

## 지켜야 할 것

- **데스크탑에 들어오는 포트를 열지 않는다.** 방화벽·공유기·터널 설정을 바꾸지 않는다. 연결은 데스크탑 → 홈서버 방향뿐이다.
- **연결 토큰은 어디에도 붙여 넣지 않는다.** 채팅, 세션 간 메시지, 명령줄 인자, 저장소 커밋 모두 안 된다. 토큰 파일 하나에만 둔다(메뉴 3).
- **나히다의 코드는 고치지 않는다.** 나히다가 쓰는 모델 서버를 함께 쓰고, 모델이 내려가 있으면 나히다 앱의 기존 `/api/warm`으로 깨울 뿐이다.
- 연결 프로그램은 답만 만든다. 파일을 읽거나 명령을 실행하는 기능이 없다(그렇게 바꾸지도 않는다).
- 설치·설정 변경이 필요하면 하기 전에 사용자에게 무엇을 왜 하는지 말하고 승인을 받는다.

---

## 메뉴 1. 모델 서버 확인 (읽기 전용)

나히다가 쓰는 모델 서버가 어디서 어떤 형식으로 열려 있는지 확인한다. 아무것도 바꾸지 않는다.

1. 흔한 기본 주소 세 곳을 확인한다. 응답이 오는 곳이 모델 서버다.
   - Windows PowerShell
     ```
     curl.exe -s http://127.0.0.1:8080/v1/models
     curl.exe -s http://127.0.0.1:11434/v1/models
     curl.exe -s http://127.0.0.1:1234/v1/models
     ```
   - macOS·Linux: `curl.exe` 대신 `curl`
   - 8080 = llama.cpp `llama-server`, 11434 = Ollama, 1234 = LM Studio 기본값이다.
   - **확인된 값(2026-10-16): 나히다는 llama-server를 `http://127.0.0.1:8081/v1`(모델 id `nahida-smart`)에 띄운다.** 아래 예의 8080은 8081로 바꿔 쓴다.
   - 셋 다 응답이 없으면 나히다의 설정(모델 서버 주소·포트)을 **읽어서** 찾는다.
2. 찾은 주소로 짧은 질문을 보내 OpenAI 호환 채팅 형식이 되는지 본다 (`<주소>`를 바꿔서).
   ```
   curl.exe -s <주소>/v1/chat/completions -H "Content-Type: application/json" -d "{\"model\":\"x\",\"messages\":[{\"role\":\"user\",\"content\":\"1+1?\"}],\"max_tokens\":30}"
   ```
3. Node.js 버전을 확인한다: `node -v` (18 이상 필요)

**보고:** 모델 서버 프로그램 이름, 주소(예: `http://127.0.0.1:8080/v1`), `/v1/models`의 모델 id, 채팅 응답 성공 여부, Node.js 버전, 데스크탑 OS.
Node.js가 없거나 18 미만이면 설치하지 말고 그 사실만 보고한다.

## 메뉴 2. 연결 프로그램 받기

연결 프로그램은 파일 하나다: 저장소 `JhinsLog/codestep`의 `tools/ai-worker/worker.mjs`. 따로 설치할 패키지가 없다.

- 저장소가 이미 있으면 그 폴더에서 `git pull`
- 없으면 원하는 폴더에서 `git clone git@github.com:JhinsLog/codestep.git` (권한이 없으면 멈추고 보고)

받은 뒤 `tools/ai-worker/worker.mjs`를 열어 읽고, 홈서버 주소(`https://codestep.jhinslog.com`),
모델 서버 주소, 나히다 앱 주소(`127.0.0.1:8084`) 외에 다른 곳으로 연결하는 코드가 없는지 확인한다.

**보고:** 저장소 위치, 받은 커밋 해시(`git log -1 --oneline`), 코드 확인 결과.

## 메뉴 3. 연결 토큰 파일 만들기 (사용자가 직접)

토큰은 홈서버의 `/etc/codestep/api.env`에 `CODESTEP_AI_WORKER_TOKEN=…`로 들어 있다.
**Claude Code가 토큰 값을 보거나 옮기지 않는다.** 아래는 사용자가 직접 하도록 안내만 한다.

**데스크탑(Windows)의 AI 관련 파일은 `D:\AI` 폴더에서만 관리한다.** C 드라이브(사용자 폴더)에 두지 않는다.
토큰 파일은 `D:\AI\token\codestep_token.txt`이다.

1. 토큰을 담을 폴더를 만든다 (Claude Code가 해도 된다).
   - Windows: `New-Item -ItemType Directory -Force "D:\AI\token"`
   - macOS·Linux: `mkdir -p ~/.codestep-ai && chmod 700 ~/.codestep-ai`
2. **사용자**가 자기 터미널에서 홈서버에 접속해 토큰 값을 복사한다.
   ```
   ssh jhin@jhinslog
   sudo grep CODESTEP_AI_WORKER_TOKEN /etc/codestep/api.env
   ```
   `=` 뒤의 값만 복사한다.
3. **사용자**가 메모장 등으로 토큰 파일을 만들어 값만 붙여 넣고 저장한다.
   - Windows: `D:\AI\token\codestep_token.txt` (값 한 줄만. `=`·공백 없이)
   - macOS·Linux: `~/.codestep-ai/token`
4. 파일을 본인만 읽게 한다 (Claude Code가 해도 된다. 값은 출력하지 않는다).
   - Windows: 계정을 **이름이 아니라 SID로** 지정한다. 사용자 이름과 컴퓨터 이름이 같은 PC에서는 icacls가 이름을
     컴퓨터 SID로 풀어 본인이 파일을 못 읽게 된다(node: EPERM).
     ```
     $me=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; icacls "D:\AI\token\codestep_token.txt" /inheritance:r /grant:r "*${me}:(R,W)"
     ```
     확인: `icacls "D:\AI\token\codestep_token.txt"` → 본인 계정 읽기·쓰기 한 줄만 있어야 한다.
   - macOS·Linux: `chmod 600 ~/.codestep-ai/token`

**보고:** 토큰 파일 경로와 "파일 있음, 권한 제한함"만. 값은 절대 보고하지 않는다.

## 메뉴 4. 연결 확인

저장소 폴더에서, 메뉴 1에서 찾은 모델 서버 주소와 토큰 파일 위치를 넣어 실행한다.

- Windows PowerShell
  ```
  $env:MODEL_URL="http://127.0.0.1:8081/v1"; $env:CODESTEP_AI_TOKEN_FILE="D:\AI\token\codestep_token.txt"; node tools/ai-worker/worker.mjs --check
  ```
- macOS·Linux
  ```
  MODEL_URL=http://127.0.0.1:8080/v1 node tools/ai-worker/worker.mjs --check
  ```

정상이면 이렇게 나온다(마지막 줄은 25초쯤 걸린다).
```
모델: <모델 id>
모델 응답: "2"
홈서버 AI 설정: 켜짐
연결 토큰: 정상
```
- `홈서버 AI 설정: 꺼짐` → 홈서버 쪽 설정 전이다. 그대로 보고한다.
- `연결 토큰: 거부됨` → 토큰 파일 값이 다르다. 메뉴 3을 사용자와 다시 한다.

Qwen3 계열은 "생각(think)" 출력이 길어질 수 있어 기본으로 끈다(`NO_THINK=1`). 연결 프로그램이 `<think>` 부분도 걸러 낸다.

**보고:** `--check` 출력 전체 (토큰 값은 출력되지 않는다).

## 메뉴 5. 실행

```
$env:MODEL_URL="http://127.0.0.1:8081/v1"; $env:CODESTEP_AI_TOKEN_FILE="D:\AI\token\codestep_token.txt"; node tools/ai-worker/worker.mjs     # Windows
MODEL_URL=http://127.0.0.1:8080/v1 node tools/ai-worker/worker.mjs             # macOS·Linux
```

- **이 데스크탑에서는 `D:\AI\codestep\start-worker.vbs`를 더블클릭한다.** (2026-10-17 설정)
  `start-worker.vbs`가 창을 따로 띄워 `run-worker.ps1`(UTF-8 BOM)을 실행하고, 그 안에서 인코딩·환경 변수 두 개를 설정한 뒤
  위 명령을 돌린다. 출력은 `D:\AI\codestep\worker.log`에도 남는다.
- Windows 함정 (직접 띄울 때):
  - PowerShell 5.1 창에서는 한글이 깨진다 → 실행 전에 `[Console]::OutputEncoding=[Text.Encoding]::UTF8`.
    로그는 `Tee-Object`(5.1은 UTF-16으로 씀) 대신 `Add-Content -Encoding UTF8`.
  - Claude Code 도구에서 `Start-Process`로 띄운 창은 그 도구 세션이 정리될 때 같이 꺼진다 → `WScript.Shell.Run`(vbs)으로 분리해 띄운다.
- 창을 열어 둔 동안만 codestep 질문에 답한다. 끝낼 때는 Ctrl+C.
- 질문이 오면 `답변 <id>: <글자 수>자, <초>초` 줄이 찍힌다.
- 연결이 끊기면 스스로 1초 → 최대 60초 간격으로 다시 접속한다.
- 나히다와 GPU를 함께 쓰므로, 나히다가 긴 작업을 하는 동안에는 codestep 답이 늦어질 수 있다.
- **자동 깨우기 (기본 켜짐, 2026-10-17 사용자 결정 B안).** 나히다의 30분 유휴 내리기는 껐다(`NAHIDA_IDLE_UNLOAD=0`, 사용자가 직접 켜고 끈다).
  연결 프로그램은 질문을 받을 수 있는지 15초마다 판단한다.

  | 상태 | codestep 화면 | 질문이 오면 |
  |---|---|---|
  | 모델 서버(8081) 떠 있음 | 🟢 연결됨 | 바로 답한다 |
  | 모델만 내려감(나히다 화면의 "지금 내리기"), 나히다 앱은 켜짐, 콜롬비나 GPU 미사용 | 🟢 연결됨 | 나히다 `/api/warm`으로 모델을 올리고(약 6~10초, 최대 90초 대기) 답한다 |
  | 나히다 앱 자체가 꺼짐 | 🔴 꺼짐 | 받지 않는다 |
  | 콜롬비나가 GPU 사용 중(`other_llm=true`) | 🔴 꺼짐 | 받지 않는다. 나히다의 warm은 GPU를 빼앗아 오므로 콜롬비나 대화를 끊지 않기 위해서다 |

  - 끄고 싶으면 `$env:WAKE="0"` — 그러면 모델이 떠 있을 때만 답한다.
  - 나히다 앱 주소가 다르면 `$env:NAHIDA_URL="http://127.0.0.1:<포트>"`.

**보고:** 실행 시작 여부, 첫 질문 처리 로그 한 줄.

## 메뉴 6. (나중에) 자동 시작

테스트가 끝나고 사용자가 원할 때만 한다. Windows는 작업 스케줄러, Linux는 systemd 사용자 서비스로
로그인 때 `worker.mjs`를 띄운다. 설정 전에 사용자 승인을 받는다.

## 문제 해결

| 증상 | 원인 | 할 일 |
|---|---|---|
| `토큰 파일을 읽을 수 없습니다` | 메뉴 3 전, 경로가 다름 | 메뉴 3. 다른 경로면 `CODESTEP_AI_TOKEN_FILE`로 지정 |
| `연결 토큰이 거부되었습니다` | 토큰 값이 다름·공백 포함 | 파일에 값만 한 줄로 다시 저장 |
| `모델 서버 /models 응답 …` | 모델 서버가 꺼짐·주소 다름 | 나히다(모델 서버) 실행 확인, `MODEL_URL` 확인 |
| 답이 영어로 나오거나 이상함 | 모델·지시문 문제 | 그대로 보고 (홈서버 쪽 지시문을 고친다) |
| `연결 문제: … 초 뒤 다시` 반복 | 인터넷·홈서버 문제 | 그대로 보고 |
| 화면에 "AI 서버가 꺼져 있어…"·제목 옆 "꺼짐" | 연결 프로그램이 안 떠 있음, 나히다 앱이 꺼짐, 콜롬비나가 GPU 사용 중 | 연결 프로그램 창의 마지막 줄로 이유 확인 (메뉴 5) |
| `나히다 깨우기 실패`·`모델이 90초 안에 뜨지 않았습니다` | 나히다가 모델을 올리지 못함 | 나히다 화면에서 모델 상태 확인 |

## 홈서버 쪽 (참고)

- 중계: `server/ai.mjs` — `/api/ask`(브라우저, 접근 코드 필요), `/api/ai/next`·`/api/ai/answer/:id`(연결 프로그램, 토큰 필요)
- 설정: `/etc/codestep/api.env`의 `CODESTEP_AI_WORKER_TOKEN`, `CODESTEP_AI_USER_CODE`. 둘 중 하나라도 없으면 AI는 꺼진다
- 제한: 시간당 질문 30개(사람당), 대기열 5개, 질문 1,000자·화면 정보 24,000자·답변 16,000자
- AI에게 보내는 것: 지시문 + 화면 정보(코드, 단계, 호출 스택, 힙, 출력, 해설) + 질문. 대화 기록은 남기지 않는다
