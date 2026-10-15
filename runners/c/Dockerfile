# codestep C 실행기: gcc로 컴파일하고 gdb로 한 줄씩 추적한다 (추적기는 tracer.py, gdb 내장 Python).
# 사용자 코드를 돌리는 컨테이너라서 server/api.mjs의 SANDBOX 옵션(네트워크 차단, 읽기 전용,
# 권한 제거, 비root, 자원 제한)으로만 실행한다. /work는 실행 파일을 만들므로 exec 가능한 tmpfs가 필요하다.
FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f
LABEL app=codestep
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libc6-dev gdb \
 && rm -rf /var/lib/apt/lists/*
COPY tracer.py unbuf.h run.sh limit.sh /opt/tracer/
ENV LANG=C.UTF-8
USER 65534:65534
WORKDIR /work
ENTRYPOINT ["/opt/tracer/run.sh"]
