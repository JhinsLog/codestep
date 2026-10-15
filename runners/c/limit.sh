#!/bin/sh
# gdb의 exec-wrapper: 추적할 프로그램만 메모리(주소 공간) 128MB로 묶는다. gdb 자신은 묶지 않는다.
ulimit -v 131072
exec "$@"
