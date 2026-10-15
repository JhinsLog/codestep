# codestep Python 실행기. 사용자 코드는 이 컨테이너 안에서만 실행한다.
# 실행 옵션(네트워크 차단, 읽기 전용 루트, 권한 제거, 자원 제한)은 server/api.mjs에 있다.
FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f
LABEL app=codestep
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 \
 && rm -rf /var/lib/apt/lists/*
COPY tracer.py /opt/tracer/tracer.py
USER 65534:65534
WORKDIR /work
# -I: 환경 변수·사용자 경로를 무시, -S: site 모듈을 불러오지 않음, -B: .pyc를 쓰지 않음
ENTRYPOINT ["python3", "-I", "-S", "-B", "/opt/tracer/tracer.py"]
