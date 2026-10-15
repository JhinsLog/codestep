# codestep Java 실행기. 사용자 코드는 이 컨테이너 안에서만 컴파일·실행한다.
# 실행 옵션(네트워크 차단, 읽기 전용 루트, 권한 제거, 자원 제한)은 server/api.mjs에 있다.
FROM eclipse-temurin:25.0.4.1_1-jdk-noble@sha256:589ff4cc3f71aab462e7048a47a0d10edf57fbccde3fceea2281e610bf5880b4
LABEL app=codestep
COPY Tracer.java /opt/tracer/src/
RUN javac -encoding UTF-8 -d /opt/tracer /opt/tracer/src/Tracer.java && rm -rf /opt/tracer/src
USER 65534:65534
WORKDIR /work
ENTRYPOINT ["java", "-Xmx96m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-Dfile.encoding=UTF-8", "-cp", "/opt/tracer", "Tracer", "/work"]
