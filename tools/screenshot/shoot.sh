#!/bin/bash
# 화면 찍기. 서버에 브라우저·라이브러리를 깔지 않고 공식 Playwright 이미지 안에서 돌린다.
# 네트워크 없음(--network none), CPU 2·메모리 1.5G 제한. /api/run은 traces/의 기록으로 답한다.
#
#   npm ci                                          # 처음 한 번 (playwright 1.63.0, 이미지와 같은 버전)
#   node --experimental-strip-types traces.mts      # 예제 trace 기록 (codestep-java:current 필요)
#   ./shoot.sh                                      # plan.json대로 찍어 out/에 저장
set -euo pipefail
D=$(cd "$(dirname "$0")" && pwd)
WEB=$(cd "$D/../../web" && pwd)
mkdir -p "$D/out" && rm -f "$D/out/"*.png
exec docker run --rm --network none --label app=codestep --cpus 2 --memory 1536m --memory-swap 1536m --pids-limit 512 \
  --cap-drop ALL --security-opt no-new-privileges --ipc private --shm-size 512m \
  -v "$WEB/dist:/dist:ro,z" -v "$D:/shot:z" -w /shot --user "$(id -u):$(id -g)" -e HOME=/tmp \
  mcr.microsoft.com/playwright@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27 node /shot/run.mjs
