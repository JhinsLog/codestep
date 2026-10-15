#!/usr/bin/env bash
# SQLite 원본에 계측 훅 호출을 넣고 Emscripten으로 빌드한다.
set -euo pipefail
cd "$(dirname "$0")"

# Emscripten 6.x는 Python 3.10 이상이 필요하다. emsdk_env.sh가 EMSDK_PYTHON을
# 지우므로 source 뒤에 다시 지정한다.
if ! command -v emcc >/dev/null; then
  export EMSDK_PYTHON=${EMSDK_PYTHON:-/usr/bin/python3.12}
  py=$EMSDK_PYTHON
  source "${EMSDK:-$HOME/.local/opt/emsdk}/emsdk_env.sh" >/dev/null 2>&1
  export EMSDK_PYTHON=$py
fi

SQLITE_ZIP=sqlite-amalgamation-3540000.zip
SQLITE_URL=https://sqlite.org/2026/$SQLITE_ZIP
SQLITE_SHA3=7b670a62fdfbd672b75fef004cb703c8a3e87d3a5cc7d675b4a08337004a2d93
SRC=vendor/sqlite-amalgamation-3540000/sqlite3.c
OUT=build
mkdir -p "$OUT" vendor

# SQLite 공식 배포본을 받아 sqlite.org에 게시된 SHA3-256과 대조한다
if [ ! -f "$SRC" ]; then
  curl -sSfL -o "vendor/$SQLITE_ZIP" "$SQLITE_URL"
  got=$(openssl dgst -sha3-256 "vendor/$SQLITE_ZIP" | awk '{print $NF}')
  [ "$got" = "$SQLITE_SHA3" ] || { echo "SHA3 불일치: $got" >&2; exit 1; }
  (cd vendor && unzip -q "$SQLITE_ZIP")
fi

# 1) 훅 선언: sqlite3VdbeExec 정의 바로 앞
# 2) 훅 호출: 실행 루프의 nVmStep++ 바로 뒤
# 패치 지점이 정확히 하나씩 있는지 확인해서, SQLite 버전이 바뀌어 위치가
# 달라지면 조용히 넘어가지 않고 실패하게 한다.
[ "$(grep -c '^SQLITE_PRIVATE int sqlite3VdbeExec($' "$SRC")" = 1 ]
[ "$(grep -c '^    nVmStep++;$' "$SRC")" = 1 ]
sed -e 's/^SQLITE_PRIVATE int sqlite3VdbeExec($/static void codestep_vdbe_hook(Vdbe*, Op*);\n&/' \
    -e 's/^    nVmStep++;$/&\n    codestep_vdbe_hook(p, pOp);/' \
    "$SRC" > "$OUT/sqlite3.c"
cp vendor/sqlite-amalgamation-3540000/sqlite3.h "$OUT/"

FLAGS=(-O2 -I"$OUT" -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_THREADSAFE=0
       -sALLOW_MEMORY_GROWTH=1)

# 브라우저용: ES 모듈, codestep_run(setup, query)만 내보낸다
mkdir -p "$OUT/web"
emcc "${FLAGS[@]}" \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web \
  -sEXPORTED_FUNCTIONS=_codestep_run -sEXPORTED_RUNTIME_METHODS=ccall \
  src/hook.c src/main.c -o "$OUT/web/sqltrace.mjs"
echo "built $OUT/web/sqltrace.mjs"
