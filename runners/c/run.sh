#!/bin/sh
# 표준입력의 C 코드를 /work/main.c로 받아 gdb 추적기를 돌린다.
# 결과 JSON은 fd 3(원래 표준출력)으로, gdb 자체의 안내문은 버린다.
set -e
cat > /work/main.c
exec 3>&1 1>/dev/null 2>/dev/null
exec gdb -nx -q -batch -x /opt/tracer/tracer.py
