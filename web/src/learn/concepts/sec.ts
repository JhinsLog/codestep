// 보안·신기술 개념
import { board } from '../three/adapt';
import { ladder } from '../three/adapt';
import { seq } from '../three/adapt';
import { stack, tabs } from '../core';
import type { Concept } from './types';
import { ACCESS, CIA, MALWARE } from '../scenes/sec';

export const SEC: Concept[] = [
  {
    id: 'cia', name: '정보보안 3요소와 AAA', en: 'Confidentiality · Integrity · Availability', cat: 'sec',
    summary: '기밀성(인가된 사람만 본다), 무결성(인가된 방법으로만 고친다), 가용성(필요할 때 쓸 수 있다). AAA는 인증 → 인가 → 계정 관리.',
    match: ['CIA', '기밀성', '무결성', '가용성', 'AAA', 'Authentication', 'Authorization', 'Accounting', '인증', '인가', '3요소'],
    make: () => stack([
      board({ title: '정보보안 3요소 (CIA)', groups: [
        { scene: CIA.confidentiality, name: '기밀성', en: 'Confidentiality', hue: 210, desc: '인가된 사용자만 열람', items: [{ name: '위협: 스니핑, 도청', desc: '기밀성을 깨뜨리는 공격: 오가는 데이터를 몰래 엿본다' }, { name: '대책: 암호화, 접근 통제', desc: '허가받은 사람만 내용을 볼 수 있게 한다' }] },
        { scene: CIA.integrity, name: '무결성', en: 'Integrity', hue: 140, desc: '인가된 방법으로만 수정', items: [{ name: '위협: 위·변조', desc: '무결성을 깨뜨리는 공격: 데이터를 몰래 바꾸거나 가짜로 만든다' }, { name: '대책: 해시, 전자서명', desc: '내용이 바뀌면 해시값이 달라져 변조를 알아챈다' }] },
        { scene: CIA.availability, name: '가용성', en: 'Availability', hue: 30, desc: '필요할 때 언제든 사용', items: [{ name: '위협: DoS 공격', desc: '가용성을 깨뜨리는 공격: 서비스를 쓸 수 없게 만든다' }, { name: '대책: 이중화, 백업, 부하 분산', desc: '장애·공격이 있어도 서비스가 계속되게 한다' }] },
      ], quiz: false })(),
      ladder({ title: 'AAA — 접근의 세 단계', top: '먼저', bottom: '나중', shape: 'stairs', hue: [200, 30], items: [
        { name: '인증', en: 'Authentication', desc: '너는 누구냐? — 비밀번호, 지문, OTP로 신원 확인' },
        { name: '인가', en: 'Authorization', desc: '무엇을 할 수 있냐? — 확인된 사용자에게 권한 부여' },
        { name: '계정 관리', en: 'Accounting', desc: '무엇을 했냐? — 사용 기록을 남겨 감사·과금' },
      ], note: 'AAA 프로토콜: RADIUS, TACACS+, Diameter' })(),
    ]),
  },
  {
    id: 'access', name: '접근 통제 모델', en: 'MAC · DAC · RBAC', cat: 'sec',
    summary: 'MAC(보안 등급으로 시스템이 강제), DAC(소유자가 마음대로), RBAC(역할에 권한을 묶어 부여).',
    match: ['접근 통제', 'DAC', 'RBAC', '임의적', '강제적', '역할 기반', 'Access Control'],
    make: board({ title: '접근 통제 모델', en: '분류 연습으로 예를 나눠 보세요', groups: [
      { scene: ACCESS.mac, name: 'MAC 강제적', en: 'Mandatory Access Control', hue: 0, desc: '주체·객체의 보안 등급(레이블)을 비교해 시스템이 강제', items: [{ name: '군사·정부 기밀 문서', desc: '강제적 접근 통제(MAC)의 대표 예: 보안 등급과 비밀 취급 인가로 접근을 정한다' }, { name: '"비밀" 등급 사용자는 "1급 비밀" 문서를 못 연다', desc: 'MAC: 주체의 등급이 객체의 등급보다 낮으면 읽을 수 없다 (시스템이 강제)' }] },
      { scene: ACCESS.dac, name: 'DAC 임의적', en: 'Discretionary Access Control', hue: 140, desc: '객체 소유자가 권한을 마음대로 주고 뺏는다', items: [{ name: '유닉스 파일 권한 (chmod)', desc: '임의적 접근 통제(DAC): 파일 소유자가 직접 권한을 정한다' }, { name: '접근 제어 목록 (ACL)', desc: 'DAC: 객체마다 누가 무엇을 할 수 있는지 목록으로 관리한다' }] },
      { scene: ACCESS.rbac, name: 'RBAC 역할 기반', en: 'Role Based Access Control', hue: 210, desc: '역할(직무)에 권한을 묶고, 사람에게 역할을 준다', items: [{ name: '"회계 담당" 역할에 결재 권한', desc: '역할 기반 접근 통제(RBAC): 사람이 아니라 역할에 권한을 준다' }, { name: '인사이동 때 역할만 바꾼다', desc: 'RBAC의 장점: 권한을 사람마다 고칠 필요 없이 역할만 바꾸면 된다' }] },
    ] }),
  },
  {
    id: 'crypto', name: '암호 기술', en: 'Symmetric · Asymmetric · Hash', cat: 'sec',
    summary: '대칭키는 같은 키로 잠그고 연다(빠름, AES·DES). 공개키는 공개키로 잠그고 개인키로 연다(RSA·ECC). 해시는 되돌릴 수 없는 요약값(무결성).',
    match: ['암호', '대칭', '비대칭', '공개키', 'AES', 'DES', 'RSA', 'ECC', 'SEED', 'ARIA', 'IDEA', 'Skipjack', '해시', 'MD5', 'SHA', 'TKIP', 'WEP', 'WPA', '전자서명', '블록 암호'],
    make: () => tabs([
      { name: '키를 쓰는 방식', make: seq({ title: '대칭키와 공개키', actors: [{ name: '앨리스', sub: '보내는 쪽' }, { name: '인터넷', sub: '누구나 엿볼 수 있음' }, { name: '밥', sub: '받는 쪽' }],
        scenarios: [
          { name: '대칭키', desc: '같은 비밀키 하나로 암호화·복호화한다. 빠르지만, 그 키를 상대에게 안전하게 건네는 것이 문제다. n명이면 키가 n(n-1)/2개 필요.', steps: [
            { from: 0, to: 0, label: '🔑K로 잠금', note: '평문 "안녕"을 비밀키 K로 암호화' },
            { from: 0, to: 2, label: '암호문 x7#Q', note: '중간에서 엿봐도 K가 없으면 못 읽는다' },
            { from: 2, to: 2, label: '같은 🔑K로 열기', note: '밥도 같은 K를 가지고 있어야 한다 → 키 분배 문제' }] },
          { name: '공개키(비대칭)', desc: '밥이 공개키와 개인키 한 쌍을 만든다. 공개키는 모두에게 공개하고, 개인키는 혼자 가진다. n명이면 키 2n개.', steps: [
            { from: 2, to: 0, label: '밥의 공개키 🔓 배포', kind: 'reply', note: '공개키는 들켜도 괜찮다' },
            { from: 0, to: 0, label: '밥의 공개키로 잠금', note: '공개키로 잠근 것은 개인키로만 열린다' },
            { from: 0, to: 2, label: '암호문', note: '엿봐도 개인키가 없으면 못 연다' },
            { from: 2, to: 2, label: '밥의 개인키 🔑로 열기', note: '느리지만 키 분배 문제가 없다. 실제로는 공개키로 대칭키를 건네고 데이터는 대칭키로 (하이브리드)' }] },
          { name: '해시와 전자서명', desc: '해시는 임의 길이 데이터를 고정 길이 요약값으로 바꾸는 일방향 함수. 개인키로 해시값을 암호화하면 전자서명이 된다.', steps: [
            { from: 0, to: 0, label: 'SHA-256(문서) = 9f3a…', note: '1비트만 바뀌어도 해시값이 크게 달라진다. 되돌릴 수 없다' },
            { from: 0, to: 0, label: '앨리스 개인키로 해시 서명', note: '전자서명: 보낸 사람 인증 + 부인 방지' },
            { from: 0, to: 2, label: '문서 + 서명', note: '' },
            { from: 2, to: 2, label: '앨리스 공개키로 확인', note: '서명을 풀어 나온 해시와 직접 계산한 해시가 같으면 위·변조 없음(무결성)' }] },
        ] }) },
      { name: '알고리즘 분류', make: board({ title: '암호 알고리즘 분류', groups: [
        { name: '대칭키 블록', hue: 210, items: [{ name: 'DES', desc: '64비트 블록, 56비트 키 (취약)' }, { name: '3DES', desc: 'DES 세 번' }, { name: 'AES', desc: '128비트 블록, 128/192/256비트 키, DES 대체 표준' }, { name: 'SEED', desc: '국내 KISA, 128비트' }, { name: 'ARIA', desc: '국내 학·연·관' }, { name: 'IDEA', desc: '스위스, 128비트 키' }, { name: 'Skipjack', desc: 'NSA, 클리퍼 칩, 80비트 키' }] },
        { name: '대칭키 스트림', hue: 160, items: [{ name: 'RC4', desc: 'WEP에 쓰였다' }, { name: 'LFSR', desc: '선형 귀환 시프트 레지스터: 스트림 암호에서 키 스트림을 만드는 장치' }] },
        { name: '비대칭키 (공개키)', hue: 30, items: [{ name: 'RSA', desc: '큰 수의 소인수분해가 어렵다는 점 이용' }, { name: 'ECC', desc: '타원 곡선, 짧은 키로 같은 강도' }, { name: '디피-헬만', desc: '키 교환' }, { name: 'ElGamal', desc: '이산 대수 문제의 어려움을 이용한 공개키(비대칭) 암호' }, { name: 'DSA', desc: '전자서명' }] },
        { name: '해시', hue: 140, items: [{ name: 'MD5', desc: '128비트 (충돌 취약)' }, { name: 'SHA-1', desc: '160비트 (취약)' }, { name: 'SHA-256', desc: 'SHA-2 계열' }, { name: 'HAVAL', desc: '출력 길이를 128~256비트로 바꿀 수 있는 해시 함수' }] },
        { name: '무선 랜', hue: 280, items: [{ name: 'WEP', desc: '취약 (RC4)' }, { name: 'TKIP', desc: 'WPA, 패킷마다 키 변경' }, { name: 'CCMP', desc: 'WPA2, AES 기반' }] },
      ] }) },
    ]),
  },
  {
    id: 'dos', name: '서비스 거부 공격', en: 'DoS · DDoS', cat: 'sec',
    summary: '자원을 고갈시켜 정상 사용자가 못 쓰게 한다(가용성 공격): SYN 플러딩, 스머프, 랜드 어택, Ping of Death, 티어드롭 …',
    match: ['DoS', 'DDoS', '서비스 거부', 'SYN 플러딩', 'SYN Flood', '스머프', 'Smurf', '랜드', 'Land', 'Ping of Death', '티어드롭', '3-way handshake 취약점'],
    make: seq({ title: '서비스 거부(DoS) 공격', actors: [{ name: '공격자', bad: true }, { name: '네트워크', sub: '중간 호스트들' }, { name: '피해 서버' }],
      scenarios: [
        { name: 'SYN 플러딩', desc: '3-way handshake의 마지막 ACK를 보내지 않아 서버의 연결 대기 큐를 가득 채운다. 대응: SYN 쿠키, 대기 시간 줄이기.', steps: [
          { from: 0, to: 2, label: 'SYN (출발지 위조)', many: 6, kind: 'bad', note: '가짜 출발지로 연결 요청만 잔뜩 보낸다' },
          { from: 2, to: 1, label: 'SYN+ACK → 없는 주소', kind: 'reply', note: '서버는 응답하고 ACK를 기다리며 자원을 잡아 둔다' },
          { from: 2, to: 2, label: '대기 큐 가득 참', note: '반쯤 열린 연결이 쌓여 정상 사용자의 연결을 받지 못한다' }] },
        { name: '스머프', desc: 'ICMP Echo 요청의 출발지를 피해자로 위조해 브로드캐스트 주소로 보낸다. 네트워크의 모든 호스트가 피해자에게 응답한다(증폭).', steps: [
          { from: 0, to: 1, label: 'ping → 브로드캐스트 (출발지=피해자)', kind: 'bad', note: '한 번만 보내도' },
          { from: 1, to: 2, label: 'Echo Reply × 모든 호스트', many: 7, kind: 'reply', note: '수많은 응답이 피해자에게 쏟아진다. 대응: 외부 브로드캐스트 ping 차단' }] },
        { name: '랜드 어택', desc: '출발지와 목적지 IP를 모두 피해자 주소로 같게 만든 패킷을 보낸다. 피해자는 자기 자신에게 계속 응답한다.', steps: [
          { from: 0, to: 2, label: '출발지 = 목적지 = 피해자', kind: 'bad', note: '' },
          { from: 2, to: 2, label: '자기 자신에게 응답 무한 반복', note: '대응: 출발지와 목적지가 같은 패킷은 버린다' }] },
        { name: 'Ping of Death', desc: 'ICMP 패킷을 허용 크기(65,535바이트)보다 크게 만들어 보낸다. 잘게 쪼개진 조각을 다시 합치느라 과부하가 걸린다.', steps: [
          { from: 0, to: 2, label: '거대한 ping 조각들', many: 5, kind: 'bad', note: '' },
          { from: 2, to: 2, label: '재조립 과부하', note: '비슷한 것: 티어드롭(조각의 오프셋을 겹치게 조작)' }] },
      ] }),
  },
  {
    id: 'attacks', name: '공격 기법', en: 'Sniffing · Spoofing · Hijacking · Injection', cat: 'sec',
    summary: '엿보기(스니핑), 속이기(스푸핑), 가로채기(세션 하이재킹), 끼워 넣기(SQL 인젝션), 기다리기(워터링 홀), 틈 노리기(레이스 컨디션).',
    match: ['스니핑', '스푸핑', '하이재킹', '중간자', 'SQL 인젝션', 'SQL Injection', '워터링 홀', '레이스 컨디션', '사회공학', '타이포스쿼팅', '피싱', 'APT', 'Sniffing', 'Spoofing', 'Hijacking', 'Watering Hole', 'Race Condition'],
    make: seq({ title: '공격 기법의 흐름', actors: [{ name: '사용자' }, { name: '공격자', bad: true }, { name: '서버 / 사이트' }],
      scenarios: [
        { name: 'ARP 스푸핑 (중간자)', desc: '위조 ARP 응답으로 "게이트웨이 MAC = 공격자 MAC"이라고 속여, 오가는 통신을 공격자가 가운데서 엿보고 고친다.', steps: [
          { from: 1, to: 0, label: '가짜 ARP: 게이트웨이는 나야', kind: 'bad', note: 'ARP는 인증이 없어 받은 응답을 그대로 캐시에 넣는다' },
          { from: 0, to: 1, label: '로그인 정보', note: '사용자는 게이트웨이로 보낸다고 믿는다' },
          { from: 1, to: 2, label: '엿본 뒤 그대로 전달', kind: 'bad', note: '사용자는 눈치채지 못한다. 대응: 정적 ARP, 암호화(HTTPS)' }] },
        { name: '세션 하이재킹', desc: '인증이 끝난 세션(세션 ID, TCP 순서 번호)을 가로채 비밀번호 없이 사용자 행세를 한다.', steps: [
          { from: 0, to: 2, label: '로그인 성공 → 세션 ID abc', note: '' },
          { from: 1, to: 1, label: '세션 ID 탈취 (스니핑·XSS)', note: '' },
          { from: 1, to: 2, label: '세션 ID abc로 요청', kind: 'bad', note: '서버는 진짜 사용자로 믿는다. 대응: HTTPS, 세션 ID 재발급, HttpOnly 쿠키' }] },
        { name: 'SQL 인젝션', desc: "입력 칸에 SQL 조각을 넣어 쿼리를 바꾼다: admin' OR '1'='1' -- → WHERE가 항상 참이 된다.", steps: [
          { from: 1, to: 2, label: "아이디: admin' OR '1'='1' --", kind: 'bad', note: '입력값을 문자열로 그대로 이어 붙이는 코드가 문제' },
          { from: 2, to: 2, label: "WHERE id='admin' OR '1'='1' --' AND pw=…", note: '조건이 항상 참, 비밀번호 검사는 주석이 된다' },
          { from: 2, to: 1, label: '로그인 성공!', kind: 'reply', note: '대응: PreparedStatement(바인딩), 입력 검증, 최소 권한' }] },
        { name: '워터링 홀', desc: '표적이 자주 가는 사이트를 미리 감염시켜 두고 기다린다(사자가 물웅덩이에서 기다리듯).', steps: [
          { from: 1, to: 2, label: '자주 가는 사이트 감염', kind: 'bad', note: '' },
          { from: 0, to: 2, label: '평소처럼 방문', note: '' },
          { from: 2, to: 0, label: '악성코드 설치', kind: 'bad', note: 'APT(지능형 지속 위협)의 침투 단계에 쓰인다' }] },
        { name: '레이스 컨디션', desc: '권한 있는 프로그램이 임시 파일을 확인한 뒤 사용하기 전의 틈에, 공격자가 그 파일을 중요한 파일(/etc/passwd)로 가는 심볼릭 링크로 바꿔치기한다(TOCTOU).', steps: [
          { from: 2, to: 2, label: '① /tmp/x 있는지 확인', note: '' },
          { from: 1, to: 2, label: '② /tmp/x → /etc/passwd 링크로 바꿈', kind: 'bad', note: '아주 짧은 틈을 노린다' },
          { from: 2, to: 2, label: '③ /tmp/x에 쓰기 → 실제로는 passwd 수정', note: '대응: 예측 불가능한 이름으로 원자적 생성(mkstemp), 링크 따라가지 않기' }] },
      ] }),
  },
  {
    id: 'malware', name: '악성 소프트웨어', en: 'Malware', cat: 'sec',
    summary: '바이러스(기생), 웜(스스로 전파), 트로이 목마(위장), 랜섬웨어(몸값), 스케어웨어(겁주기), 루트킷(숨기기), 백도어(뒷문) …',
    match: ['악성', '웜', '랜섬웨어', '스케어웨어', '루트킷', '백도어', '트로이', '키로거', '스파이웨어', '애드웨어', '바이러스', 'Malware'],
    make: board({ title: '악성 소프트웨어', en: '분류 연습으로 특징을 맞혀 보세요', groups: [
      { name: '퍼지는 방식', hue: 0, items: [{ scene: MALWARE.virus, name: '바이러스', en: 'Virus', desc: '다른 파일에 기생해 퍼진다' }, { scene: MALWARE.worm, name: '웜', en: 'Worm', desc: '숙주 없이 스스로 복제해 네트워크로 퍼진다' }, { scene: MALWARE.trojan, name: '트로이 목마', en: 'Trojan Horse', desc: '정상 프로그램으로 위장. 스스로 복제하지 않는다' }] },
      { name: '돈을 노림', hue: 40, items: [{ scene: MALWARE.ransomware, name: '랜섬웨어', en: 'Ransomware', desc: '파일을 암호화하고 몸값 요구' }, { scene: MALWARE.scareware, name: '스케어웨어', en: 'Scareware', desc: '가짜 경고로 겁줘서 결제·설치 유도' }, { scene: MALWARE.adware, name: '애드웨어', en: 'Adware', desc: '광고를 띄운다' }] },
      { name: '숨어서 훔침', hue: 270, items: [{ scene: MALWARE.rootkit, name: '루트킷', en: 'Rootkit', desc: '관리자 권한을 얻고 침입 흔적을 숨긴다' }, { scene: MALWARE.backdoor, name: '백도어', en: 'Backdoor', desc: '인증을 거치지 않는 뒷문' }, { scene: MALWARE.keylogger, name: '키로거', en: 'Keylogger', desc: '키 입력을 몰래 기록' }, { scene: MALWARE.spyware, name: '스파이웨어', en: 'Spyware', desc: '정보를 몰래 빼낸다' }] },
    ] }),
  },
  {
    id: 'sectech', name: '보안 기술과 인증 제도', en: 'OTP · SSO · OAuth · ISMS · SIEM', cat: 'sec',
    summary: '인증(OTP, SSO, OAuth), 관리 체계(ISMS, SIEM), 보호 기술(템퍼 프루핑, 트러스트존, 제로 트러스트).',
    match: ['ISMS', 'SIEM', 'ESM', 'SSO', 'OTP', 'OAuth', '템퍼', '트러스트존', '제로 트러스트', 'Zero Trust', '난독화', 'DRM', '인증 제도', '관리체계'],
    make: board({ title: '보안 기술과 제도', groups: [
      { name: '인증', hue: 210, items: [
        { name: 'OTP', en: 'One Time Password', desc: '한 번만 쓰는 비밀번호 (시간·이벤트 동기)' }, { name: 'SSO', en: 'Single Sign-On', desc: '한 번 로그인으로 여러 서비스' },
        { name: 'OAuth', desc: '비밀번호 없이 권한(토큰)만 위임 — "구글로 로그인"' }, { name: '다중 요소 인증', en: 'MFA', desc: '아는 것 + 가진 것 + 몸(생체)' }] },
      { name: '관리 체계·관제', hue: 30, items: [
        { name: 'ISMS', en: 'Information Security Management System', desc: '정보보호 관리체계 인증 (개인정보 포함은 ISMS-P)' },
        { name: 'SIEM', en: 'Security Information and Event Management', desc: '여러 장비의 로그를 모아 상관 분석' }, { name: 'ESM', desc: '보안 장비 통합 관리' }] },
      { name: '보호 기술', hue: 140, items: [
        { name: '템퍼 프루핑', en: 'Tamper Proofing', desc: '위·변조를 스스로 검사해 막는다' }, { name: '코드 난독화', en: 'Obfuscation', desc: '분석하기 어렵게 코드를 뒤섞는다' },
        { name: '트러스트존', en: 'TrustZone', desc: '프로세서 안에 하드웨어로 분리된 보안 영역' }, { name: '제로 트러스트', en: 'Zero Trust', desc: '아무도 믿지 않고 매번 검증' }, { name: 'DRM', desc: '디지털 저작권 관리' }] },
    ] }),
  },
];
