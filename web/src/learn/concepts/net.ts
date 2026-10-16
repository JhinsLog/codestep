// 네트워크 개념
import { board } from '../three/adapt';
import { fields } from '../three/adapt';
import { graph } from '../three/adapt';
import { seq } from '../three/adapt';
import { stack, tabs } from '../core';
import { osiViz } from '../custom/osi';
import { subnetLab } from '../three/netLabs';
import { cloudLab } from '../three/devLabs';
import type { Concept } from './types';

export const NET: Concept[] = [
  {
    id: 'osi', name: 'OSI 7계층', en: 'OSI 7 Layer', cat: 'net',
    summary: '통신을 7단계로 나눈 표준 모델. 보낼 때는 위에서 아래로 헤더를 붙이고(캡슐화), 받을 때는 아래에서 위로 떼어 낸다.',
    match: ['OSI', '7계층', '물리 계층', '데이터 링크', '네트워크 계층', '전송 계층', '세션 계층', '표현 계층', '응용 계층', '캡슐화', 'PDU', '허브', '리피터', '브리지', 'Physical Layer', 'Data Link'],
    make: osiViz,
  },
  {
    id: 'tcp', name: 'TCP와 UDP', en: 'Transmission Control / User Datagram Protocol', cat: 'net',
    summary: 'TCP는 연결을 맺고(3-way handshake) 순서·재전송으로 신뢰성을 보장하고, UDP는 연결 없이 빠르게 보낸다.',
    match: ['TCP', 'UDP', '3-way', 'handshake', 'SYN', '연결 지향', '세그먼트'],
    make: () => stack([
      seq({
        title: 'TCP 연결과 해제', en: '3-way handshake · 4-way handshake',
        actors: [{ name: '클라이언트', sub: '브라우저' }, { name: '서버', sub: '웹 서버' }],
        scenarios: [
          { name: '3-way handshake (연결)', desc: '데이터를 보내기 전에 세 번 주고받아 연결을 맺는다. 서로의 시작 순서 번호(seq)를 확인하는 과정이다.', steps: [
            { from: 0, to: 1, label: 'SYN (seq=100)', note: '"연결하고 싶어요. 내 순서 번호는 100부터"' },
            { from: 1, to: 0, label: 'SYN + ACK (seq=300, ack=101)', kind: 'reply', note: '"좋아요. 101번부터 받을게요. 내 순서 번호는 300부터"' },
            { from: 0, to: 1, label: 'ACK (ack=301)', note: '"301번부터 받을게요" → 연결 완료(ESTABLISHED)' },
            { from: 0, to: 1, label: '데이터 전송', kind: 'info', note: '이제 데이터를 주고받는다. 받을 때마다 ACK로 확인하고, 빠진 것은 다시 보낸다.' },
          ] },
          { name: '4-way handshake (해제)', desc: '연결을 끊을 때는 네 번 주고받는다. 양쪽이 각자 "보낼 것이 끝났다(FIN)"를 알려야 하기 때문이다.', steps: [
            { from: 0, to: 1, label: 'FIN', note: '클라이언트: 보낼 데이터가 끝났다' },
            { from: 1, to: 0, label: 'ACK', kind: 'reply', note: '서버: 알겠다(아직 보낼 것이 남았을 수 있다)' },
            { from: 1, to: 0, label: 'FIN', kind: 'reply', note: '서버: 나도 다 보냈다' },
            { from: 0, to: 1, label: 'ACK', note: '클라이언트: 알겠다 → 잠시 기다린 뒤(TIME_WAIT) 연결 종료' },
          ] },
        ],
      })(),
      board({
        title: 'TCP와 UDP 비교', groups: [
          { name: 'TCP', en: 'Transmission Control Protocol', hue: 210, desc: '연결형 · 신뢰성 · 느림', items: [
            { name: '연결형', desc: '3-way handshake로 연결을 먼저 맺는다' }, { name: '순서 보장', desc: '순서 번호로 뒤바뀐 세그먼트를 정렬' },
            { name: '재전송', desc: 'ACK가 안 오면 다시 보낸다' }, { name: '흐름·혼잡 제어', desc: '슬라이딩 윈도우로 속도를 맞춘다' },
            { name: 'HTTP · FTP · SMTP', desc: '정확해야 하는 서비스에 쓴다' }] },
          { name: 'UDP', en: 'User Datagram Protocol', hue: 30, desc: '비연결형 · 빠름 · 신뢰성 없음', items: [
            { name: '비연결형', desc: '연결 없이 바로 보낸다' }, { name: '헤더 8바이트', desc: 'TCP(20바이트 이상)보다 가볍다' },
            { name: '순서·재전송 없음', desc: '잃어버려도 다시 보내지 않는다' }, { name: 'DNS · 실시간 영상 · 게임', desc: '빠름이 중요한 서비스에 쓴다' }] },
        ],
      })(),
    ]),
  },
  {
    id: 'routing', name: '라우팅 프로토콜', en: 'RIP · OSPF · BGP', cat: 'net',
    summary: 'RIP는 거쳐 가는 라우터 수(홉)만 보고, OSPF는 링크 비용 합이 가장 작은 길을 고른다. AS 사이에는 BGP를 쓴다.',
    match: ['RIP', 'OSPF', 'BGP', 'IGP', 'EGP', '라우팅', '거리 벡터', '링크 상태', '홉', 'Distance Vector', 'Link State', '자율 시스템'],
    make: () => stack([
      graph({
        title: '같은 지도, 다른 길', en: 'RIP(홉 수) vs OSPF(링크 비용)', w: 640, h: 300,
        nodes: [{ id: 'A', name: 'A', x: 60, y: 150 }, { id: 'B', name: 'B', x: 220, y: 60 }, { id: 'C', name: 'C', x: 420, y: 60 }, { id: 'D', name: 'D', x: 320, y: 240 }, { id: 'F', name: 'F', x: 580, y: 150 }],
        edges: [{ a: 'A', b: 'B', cost: 1, dir: false }, { a: 'B', b: 'C', cost: 1, dir: false }, { a: 'C', b: 'F', cost: 1, dir: false }, { a: 'A', b: 'D', cost: 10, dir: false }, { a: 'D', b: 'F', cost: 10, dir: false }],
        scenarios: [
          { name: 'RIP: 홉 수가 적은 길', desc: 'RIP는 거리 벡터 방식: 거쳐 가는 링크 수(홉)만 센다. A-D-F는 2홉, A-B-C-F는 3홉 → A-D-F (느린 회선이어도). 최대 15홉, 30초마다 이웃과 표를 교환한다.', path: [['A', 'D', 'F']], hl: ['A', 'D', 'F'] },
          { name: 'OSPF: 비용이 작은 길', desc: 'OSPF는 링크 상태 방식: 전체 지도를 알고 다익스트라로 비용 합이 가장 작은 길을 찾는다. A-B-C-F = 3, A-D-F = 20 → A-B-C-F. 변화가 생기면 바로 알린다.', path: [['A', 'B', 'C', 'F']], hl: ['A', 'B', 'C', 'F'] },
        ],
      })(),
      board({
        title: '라우팅 프로토콜 분류', groups: [
          { name: 'IGP (내부)', en: 'Interior Gateway Protocol', hue: 200, desc: '하나의 자율 시스템(AS) 안에서 쓴다.', items: [
            { name: 'RIP', en: 'Routing Information Protocol', desc: '거리 벡터, 벨만-포드, 홉 수, 최대 15홉, 소규모' },
            { name: 'OSPF', en: 'Open Shortest Path First', desc: '링크 상태, 다익스트라, 대규모, 영역(Area)으로 나눔' },
            { name: 'IGRP·EIGRP', desc: '시스코 전용 (대역폭·지연을 함께 봄)' }] },
          { name: 'EGP (외부)', en: 'Exterior Gateway Protocol', hue: 20, desc: 'AS와 AS 사이(인터넷 사업자끼리)에서 쓴다.', items: [
            { name: 'BGP', en: 'Border Gateway Protocol', desc: '경로 벡터 방식. 인터넷 백본의 표준' }] },
        ],
      })(),
    ]),
  },
  {
    id: 'ipaddr', name: 'IP 주소·서브넷·NAT', en: 'IPv4 · IPv6 · Subnet · NAT', cat: 'net',
    summary: 'IP 주소는 네트워크 부분과 호스트 부분으로 나뉜다. 마스크와 AND 하면 네트워크 주소, 호스트 비트를 모두 1로 하면 브로드캐스트 주소다.',
    match: ['IPv4', 'IPv6', '서브넷', 'CIDR', 'NAT', 'PAT', '사설 IP', '브로드캐스트 주소', '네트워크 주소', '프리픽스', 'IP 주소', '서브넷 마스크', '호스트에 할당'],
    make: () => tabs([
      { name: '서브넷 계산', make: subnetLab },
      { name: 'IPv4 vs IPv6', make: fields({ title: 'IPv4와 IPv6 주소', rows: [
        { label: 'IPv4 32비트', fields: [{ name: '192', text: '192', desc: '8비트씩 4부분, 10진수를 점(.)으로 구분' }, { name: '168', text: '168', desc: '0~255' }, { name: '10', text: '10', desc: '0~255' }, { name: '77', text: '77', desc: '약 43억 개 주소 → 부족 → NAT, IPv6' }] },
        { label: 'IPv6 128비트', fields: [{ name: '2001', text: '2001', desc: '16비트씩 8부분, 16진수를 콜론(:)으로 구분' }, { name: '0db8', text: '0db8', desc: '앞의 0은 생략 가능: 0db8 → db8' }, { name: '::', text: '::', w: 2, desc: '0으로만 된 연속 부분은 한 번만 ::로 줄인다' }, { name: '0001', text: '1', desc: '유니캐스트·멀티캐스트·애니캐스트 (브로드캐스트 없음)' }] },
      ], note: 'IPv6: 주소 부족 해결, 헤더 단순화, 자동 주소 설정, IPsec 기본 지원. 전환: 듀얼 스택, 터널링, 주소 변환' }) },
      { name: 'NAT 주소 변환', make: seq({
        title: 'NAT / PAT', en: 'Network (Port) Address Translation',
        actors: [{ name: 'PC 192.168.0.5', sub: '사설 IP' }, { name: '공유기 (NAT)', sub: '공인 IP 1.2.3.4' }, { name: '웹 서버', sub: '8.8.4.4' }],
        scenarios: [{ name: 'PAT', desc: '사설 IP(10.x, 172.16~31.x, 192.168.x)는 인터넷에서 쓸 수 없다. 공유기가 나가는 패킷의 출발지를 공인 IP:포트로 바꾸고, 돌아오는 응답은 표를 보고 다시 사설 IP로 바꾼다.', steps: [
          { from: 0, to: 1, label: '출발 192.168.0.5:5000', note: '내부 PC가 사설 IP로 요청을 보낸다' },
          { from: 1, to: 1, label: '변환 → 1.2.3.4:40001', note: '공유기가 변환표에 "40001 ↔ 192.168.0.5:5000"을 적고 출발지를 바꾼다(PAT는 포트까지)' },
          { from: 1, to: 2, label: '출발 1.2.3.4:40001', note: '인터넷에는 공인 IP만 보인다 → 내부 주소가 숨겨지는 보안 효과' },
          { from: 2, to: 1, label: '응답 → 1.2.3.4:40001', kind: 'reply', note: '서버는 공유기의 공인 IP로 응답한다' },
          { from: 1, to: 0, label: '응답 → 192.168.0.5:5000', kind: 'reply', note: '변환표를 보고 원래 PC로 돌려준다' },
        ] }],
      }) },
    ]),
  },
  {
    id: 'arp', name: 'ARP · RARP · ICMP', en: 'Address Resolution · Internet Control Message', cat: 'net',
    summary: 'ARP는 IP로 MAC 주소를 묻고(브로드캐스트), RARP는 MAC으로 IP를 묻는다. ICMP는 IP 통신의 오류·진단 메시지(ping)다.',
    match: ['ARP', 'RARP', 'ICMP', 'ping', 'traceroute', 'MAC 주소', 'Echo'],
    make: seq({
      title: '주소 묻기와 오류 알리기', en: 'ARP · RARP · ICMP',
      actors: [{ name: 'PC A', sub: '10.0.0.1' }, { name: '같은 네트워크 모두', sub: '브로드캐스트' }, { name: 'PC B', sub: '10.0.0.2' }],
      scenarios: [
        { name: 'ARP (IP → MAC)', desc: '같은 네트워크로 프레임을 보내려면 상대의 MAC 주소가 필요하다. IP는 알지만 MAC을 모를 때 ARP로 묻는다.', steps: [
          { from: 0, to: 1, label: '누가 10.0.0.2? (ARP Request)', note: '목적지 MAC FF:FF:FF:FF:FF:FF로 모두에게 묻는다(브로드캐스트)' },
          { from: 1, to: 2, label: '요청 전달', kind: 'info', note: '모든 PC가 받지만 IP가 맞는 B만 응답한다' },
          { from: 2, to: 0, label: '나야, MAC = BB:BB… (ARP Reply)', kind: 'reply', note: 'A에게만(유니캐스트) 답한다. A는 ARP 캐시에 저장해 다음부터는 묻지 않는다' },
        ] },
        { name: 'RARP (MAC → IP)', desc: '자기 MAC만 알고 IP를 모르는 기기(디스크 없는 단말)가 서버에 묻는다. 지금은 DHCP가 대신한다.', steps: [
          { from: 0, to: 1, label: '내 MAC은 AA:AA… 내 IP는? (RARP Request)', note: '브로드캐스트로 묻는다' },
          { from: 2, to: 0, label: '네 IP는 10.0.0.1 (RARP Reply)', kind: 'reply', note: 'RARP 서버(여기서는 B)가 알려 준다' },
        ] },
        { name: 'ICMP (ping)', desc: 'ICMP는 IP 패킷 전달 중 생긴 오류를 알리고 진단에 쓴다. ping은 Echo Request/Reply, traceroute는 Time Exceeded를 쓴다.', steps: [
          { from: 0, to: 2, label: 'Echo Request', note: 'ping 10.0.0.2' },
          { from: 2, to: 0, label: 'Echo Reply', kind: 'reply', note: '살아 있다는 응답과 왕복 시간' },
          { from: 0, to: 1, label: '없는 주소로 전송', kind: 'lost', note: '목적지에 갈 수 없으면 라우터가 Destination Unreachable을 돌려준다' },
        ] },
      ],
    }),
  },
  {
    id: 'errctl', name: '오류 제어', en: 'Error Detection · Correction · ARQ', cat: 'net',
    summary: '오류를 찾는 방법(패리티, CRC, 체크섬)과 고치는 방법(해밍 코드 같은 FEC, 다시 보내 달라는 BEC/ARQ)이 있다.',
    match: ['ARQ', 'FEC', 'BEC', '해밍', 'CRC', '패리티', '오류 제어', '오류 검출', 'Stop-and-Wait', 'Go-Back-N', 'Selective', '체크섬', '재전송'],
    make: () => stack([
      board({ title: '오류 검출과 정정', groups: [
        { name: '검출만', en: 'Detection', hue: 40, items: [
          { name: '패리티 검사', en: 'Parity', desc: '1의 개수를 짝수(또는 홀수)로 맞추는 비트 1개를 붙인다. 홀수 개 비트 오류만 찾는다' },
          { name: 'CRC', en: 'Cyclic Redundancy Check', desc: '생성 다항식으로 나눈 나머지를 붙여 보낸다. 버스트(연속) 오류도 잘 찾는다' },
          { name: '체크섬', en: 'Checksum', desc: '데이터를 더한 합을 붙여 보낸다' }] },
        { name: 'FEC (전진 오류 수정)', en: 'Forward Error Correction', hue: 140, desc: '재전송 없이 받는 쪽이 고친다', items: [
          { name: '해밍 코드', en: 'Hamming Code', desc: '패리티 비트를 여러 개 넣어 1비트 오류의 "위치"까지 찾아 고친다' },
          { name: '상승 코드', desc: '여러 비트 오류를 고친다' }] },
        { name: 'BEC (후진 오류 수정)', en: 'Backward Error Correction', hue: 260, desc: '오류를 알리고 다시 받는다', items: [
          { name: 'ARQ', en: 'Automatic Repeat reQuest', desc: '오류가 나면 재전송을 요청한다: 정지-대기, Go-Back-N, 선택적 재전송, 적응적' }] },
      ] })(),
      seq({
        title: 'ARQ 재전송 방식', en: 'Stop-and-Wait · Go-Back-N · Selective Repeat',
        actors: [{ name: '송신 측' }, { name: '수신 측' }],
        scenarios: [
          { name: '정지-대기', desc: '하나 보내고 ACK를 기다린다. 단순하지만 느리다.', steps: [
            { from: 0, to: 1, label: '프레임 0' }, { from: 1, to: 0, label: 'ACK', kind: 'reply' },
            { from: 0, to: 1, label: '프레임 1', kind: 'lost', note: '도중에 손상·분실' }, { from: 0, to: 0, label: '시간 초과', note: 'ACK가 오지 않아 같은 프레임을 다시 보낸다' },
            { from: 0, to: 1, label: '프레임 1 (재전송)' }, { from: 1, to: 0, label: 'ACK', kind: 'reply' },
          ] },
          { name: 'Go-Back-N', desc: '여러 개를 연속으로 보내다가 오류가 나면 그 프레임부터 뒤의 것을 모두 다시 보낸다.', steps: [
            { from: 0, to: 1, label: '프레임 0' }, { from: 0, to: 1, label: '프레임 1', kind: 'lost' }, { from: 0, to: 1, label: '프레임 2', note: '1이 빠져서 수신 측은 2를 버린다' },
            { from: 1, to: 0, label: 'NAK 1', kind: 'bad', note: '1번부터 다시 보내 달라' },
            { from: 0, to: 1, label: '프레임 1 (재전송)' }, { from: 0, to: 1, label: '프레임 2 (재전송)', note: '이미 보냈던 2도 다시 보낸다 → 낭비' },
          ] },
          { name: '선택적 재전송', desc: '오류 난 프레임만 다시 보낸다. 수신 측에 버퍼와 순서 재정렬이 필요하다.', steps: [
            { from: 0, to: 1, label: '프레임 0' }, { from: 0, to: 1, label: '프레임 1', kind: 'lost' }, { from: 0, to: 1, label: '프레임 2', note: '2는 받아서 버퍼에 보관한다' },
            { from: 1, to: 0, label: 'NAK 1', kind: 'bad' }, { from: 0, to: 1, label: '프레임 1만 재전송', note: '1만 다시 보내고, 수신 측이 0 1 2 순서로 맞춘다' },
          ] },
        ],
      })(),
    ]),
  },
  {
    id: 'hdlc', name: 'HDLC', en: 'High-level Data Link Control', cat: 'net',
    summary: '데이터 링크 계층의 비트 중심 프로토콜. 프레임은 플래그로 감싸고, 정보(I)·감독(S)·비번호(U) 프레임이 있다.',
    match: ['HDLC', 'NRM', 'ABM', 'ARM', '프레임 종류', '정규 응답', '비동기 균형'],
    make: () => stack([
      fields({ title: 'HDLC 프레임 구조', rows: [{ fields: [
        { name: '플래그', en: 'Flag', text: '01111110', desc: '프레임의 시작과 끝 표시. 데이터에 같은 패턴이 나오면 비트 스터핑으로 피한다', hue: 280 },
        { name: '주소', en: 'Address', text: '주소', desc: '종국(받는 쪽)의 주소', hue: 210 },
        { name: '제어', en: 'Control', text: '제어', desc: '프레임 종류(I·S·U)와 순서 번호', hue: 160 },
        { name: '정보', en: 'Information', text: '정보 (데이터)', w: 3, desc: '실제 데이터', hue: 40 },
        { name: 'FCS', en: 'Frame Check Sequence', text: 'FCS', desc: '오류 검사(CRC)', hue: 0 },
        { name: '플래그', en: 'Flag', text: '01111110', desc: '프레임의 끝', hue: 280 },
      ] }] })(),
      board({ title: '프레임 종류와 동작 모드', groups: [
        { name: '프레임 종류', hue: 200, items: [
          { name: '정보 프레임', en: 'I-frame', desc: '사용자 데이터를 나른다' },
          { name: '감독 프레임', en: 'S-frame', desc: '확인 응답(RR, RNR, REJ)으로 흐름·오류 제어' },
          { name: '비번호 프레임', en: 'U-frame', desc: '링크 설정·해제 같은 제어' }] },
        { name: '동작 모드', hue: 30, items: [
          { name: 'NRM', en: '정규 응답 모드', desc: '주국의 허가(폴링)가 있어야 종국이 전송 (포인트 투 멀티포인트)' },
          { name: 'ARM', en: '비동기 응답 모드', desc: '허가 없이 종국이 전송, 링크 관리는 주국' },
          { name: 'ABM', en: '비동기 균형 모드', desc: '두 국이 대등하게 언제든 전송 (포인트 투 포인트)' }] },
      ] })(),
    ]),
  },
  {
    id: 'switching', name: '패킷 교환 방식', en: 'Virtual Circuit · Datagram', cat: 'net',
    summary: '가상 회선은 길을 먼저 정해 모든 패킷이 같은 길로 순서대로 가고, 데이터그램은 패킷마다 따로 길을 골라 순서가 바뀔 수 있다.',
    match: ['가상 회선', '데이터그램', '패킷 교환', '연결형', '비연결형', 'Datagram', 'Virtual Circuit'],
    make: graph({
      title: '가상 회선과 데이터그램', w: 640, h: 280,
      nodes: [{ id: 'S', name: '출발', x: 50, y: 140 }, { id: 'R1', name: 'R1', x: 200, y: 60 }, { id: 'R2', name: 'R2', x: 200, y: 220 }, { id: 'R3', name: 'R3', x: 400, y: 60 }, { id: 'R4', name: 'R4', x: 400, y: 220 }, { id: 'D', name: '도착', x: 580, y: 140 }],
      edges: [{ a: 'S', b: 'R1', dir: false }, { a: 'S', b: 'R2', dir: false }, { a: 'R1', b: 'R3', dir: false }, { a: 'R2', b: 'R4', dir: false }, { a: 'R1', b: 'R4', dir: false }, { a: 'R3', b: 'D', dir: false }, { a: 'R4', b: 'D', dir: false }],
      scenarios: [
        { name: '가상 회선 (연결형)', desc: '보내기 전에 S-R1-R3-D 길을 먼저 정한다. 패킷 1, 2, 3이 모두 같은 길로 순서대로 도착한다. (X.25, TCP의 개념)', path: [['S', 'R1', 'R3', 'D'], ['S', 'R1', 'R3', 'D'], ['S', 'R1', 'R3', 'D']], notes: ['1번 패킷', '2번도 같은 길', '3번도 같은 길 → 순서 보장'], hl: ['S', 'R1', 'R3', 'D'] },
        { name: '데이터그램 (비연결형)', desc: '패킷마다 그 순간 좋은 길을 따로 고른다. 도착 순서가 보낸 순서와 다를 수 있다. 한 길이 끊겨도 다른 길로 가서 장애에 강하다. (IP, UDP)', path: [['S', 'R1', 'R3', 'D'], ['S', 'R2', 'R4', 'D'], ['S', 'R1', 'R4', 'D']], notes: ['1번 패킷', '2번은 다른 길', '3번은 또 다른 길 → 순서가 바뀔 수 있다'] },
      ],
    }),
  },
  {
    id: 'web', name: '웹 기술', en: 'URL · HTTP · AJAX · SOAP/REST', cat: 'net',
    summary: 'URL은 스킴·호스트·포트·경로·쿼리·프래그먼트로 나뉜다. AJAX는 페이지 일부만 비동기로 갱신하고, 웹 서비스는 SOAP(XML)이나 REST(HTTP 메서드)로 만든다.',
    match: ['URL', 'HTTP', 'HTML', '하이퍼텍스트', 'SOAP', 'REST', 'AJAX', 'JSON', 'XML', 'WSDL', 'UDDI', '포트 번호', '웹 서비스', 'well-known', 'HTTPS'],
    make: () => tabs([
      { name: 'URL 구조', make: fields({ title: 'URL의 구조', en: 'scheme://host:port/path?query#fragment', rows: [{ fields: [
        { name: '스킴', en: 'Scheme', text: 'https://', desc: '사용할 프로토콜 (http, https, ftp …)', hue: 340 },
        { name: '호스트', en: 'Host', text: 'www.example.com', w: 3, desc: '서버의 도메인 이름(또는 IP 주소)', hue: 210 },
        { name: '포트', en: 'Port', text: ':8443', desc: '서버 프로그램 번호. 생략하면 http 80, https 443', hue: 160 },
        { name: '경로', en: 'Path', text: '/board/list', w: 2, desc: '서버 안의 자원 위치', hue: 40 },
        { name: '쿼리', en: 'Query', text: '?page=2', desc: '이름=값 쌍으로 넘기는 값 (&로 이어 붙임)', hue: 100 },
        { name: '프래그먼트', en: 'Fragment', text: '#top', desc: '문서 안의 위치. 서버로 보내지지 않는다', hue: 280 },
      ] }] }) },
      { name: 'AJAX', make: seq({ title: 'AJAX — 페이지 일부만 바꾸기', en: 'Asynchronous JavaScript and XML',
        actors: [{ name: '사용자' }, { name: '브라우저 (JavaScript)' }, { name: '서버' }],
        scenarios: [{ name: 'AJAX', desc: '검색어를 칠 때마다 페이지 전체를 새로 받지 않고, JavaScript가 서버에 몰래(비동기) 물어 자동 완성 목록만 바꾼다.', steps: [
          { from: 0, to: 1, label: '"정보처" 입력', note: '사용자는 계속 입력할 수 있다(기다리지 않음 = 비동기)' },
          { from: 1, to: 2, label: 'fetch("/suggest?q=정보처")', note: 'XMLHttpRequest·fetch로 요청' },
          { from: 2, to: 1, label: 'JSON ["정보처리기사", …]', kind: 'reply', note: '요즘은 XML보다 JSON을 주고받는다' },
          { from: 1, to: 0, label: '목록 부분만 갱신', kind: 'reply', note: '페이지 전체를 다시 그리지 않는다' },
        ] }] }) },
      { name: '웹 서비스·포트', make: board({ title: '웹 서비스와 데이터 형식', groups: [
        { name: 'SOAP', hue: 210, desc: 'XML 메시지 교환 프로토콜 (무겁지만 엄격한 표준)', items: [{ name: 'WSDL', en: 'Web Services Description Language', desc: '웹 서비스의 기능·호출 방법을 XML로 설명' }, { name: 'UDDI', desc: '웹 서비스를 등록·검색하는 저장소' }, { name: 'XML', desc: '사용자가 태그를 정의하는 마크업 언어' }] },
        { name: 'REST', hue: 30, desc: '자원(URI) + HTTP 메서드', items: [{ name: 'GET 조회 · POST 생성', desc: 'PUT 수정 · DELETE 삭제' }, { name: 'JSON', en: 'JavaScript Object Notation', desc: '"이름": 값 쌍의 가벼운 형식' }] },
        { name: '잘 알려진 포트', hue: 140, items: [{ name: 'FTP 20·21' }, { name: 'SSH 22' }, { name: 'Telnet 23' }, { name: 'SMTP 25' }, { name: 'DNS 53' }, { name: 'HTTP 80' }, { name: 'POP3 110' }, { name: 'HTTPS 443' }] },
      ] }) },
    ]),
  },
  {
    id: 'vpn', name: 'VPN과 IPsec', en: 'Virtual Private Network · IPsec', cat: 'net',
    summary: 'VPN은 공중망 위에 암호화된 터널을 만들어 사설망처럼 쓴다. IPsec은 IP 계층에서 AH(인증)·ESP(암호화)로 패킷을 보호한다.',
    match: ['VPN', '터널링', 'IPsec', 'IPSec', 'AH', 'ESP', 'IKE', '가상 사설망'],
    make: () => stack([
      fields({ title: 'IPsec 두 모드 — 무엇을 감싸나', en: 'Transport Mode vs Tunnel Mode', rows: [
        { label: '원래 패킷', fields: [{ name: 'IP 헤더', text: 'IP', desc: '원래 출발지·목적지 IP', hue: 210 }, { name: 'TCP', text: 'TCP', desc: '전송 계층 헤더', hue: 140 }, { name: '데이터', text: 'DATA', w: 2, desc: '실제 데이터', hue: 40 }] },
        { label: '전송 모드', fields: [{ name: 'IP 헤더', text: 'IP', desc: '원래 IP 헤더를 그대로 쓴다', hue: 210 }, { name: 'ESP 헤더', en: 'Encapsulating Security Payload', text: 'ESP', desc: '암호화 + 인증. AH는 인증·무결성만(암호화 X)', hue: 0 }, { name: 'TCP', text: 'TCP 🔒', desc: '데이터 부분만 보호', hue: 140 }, { name: '데이터', text: 'DATA 🔒', w: 2, desc: '암호화된 데이터', hue: 40 }] },
        { label: '터널 모드', fields: [{ name: '새 IP 헤더', text: '새 IP', desc: 'VPN 장비끼리의 주소. 원래 주소는 숨겨진다', hue: 280 }, { name: 'ESP 헤더', text: 'ESP', desc: '원래 패킷 전체를 암호화', hue: 0 }, { name: 'IP 헤더', text: 'IP 🔒', desc: '원래 IP 헤더까지 암호화', hue: 210 }, { name: 'TCP', text: 'TCP 🔒', desc: '', hue: 140 }, { name: '데이터', text: 'DATA 🔒', w: 2, desc: '', hue: 40 }] },
      ], note: '키 교환은 IKE. 계층별 VPN: PPTP·L2TP(2계층), IPsec(3계층), SSL/TLS VPN(4계층 이상)' })(),
      graph({ title: 'VPN 터널', w: 640, h: 200,
        nodes: [{ id: 'H', name: '재택 PC', x: 60, y: 100 }, { id: 'I', name: '인터넷', en: '공중망', x: 320, y: 100, kind: 'cloud' }, { id: 'G', name: 'VPN 게이트웨이', x: 520, y: 100 }, { id: 'S', name: '사내 서버', x: 600, y: 40 }],
        edges: [{ a: 'H', b: 'I', dir: false, label: '🔒 암호화 터널' }, { a: 'I', b: 'G', dir: false, label: '🔒' }, { a: 'G', b: 'S', dir: false }],
        scenarios: [{ name: '터널링', desc: '공중망을 지나는 동안 원래 패킷은 새 패킷 안에 캡슐화·암호화되어 엿볼 수 없다. 게이트웨이가 꺼내 사내망으로 넘긴다.', path: [['H', 'I', 'G', 'S']] }] })(),
    ]),
  },
  {
    id: 'cloud', name: '클라우드 서비스 모델', en: 'IaaS · PaaS · SaaS', cat: 'net',
    summary: '어디까지를 클라우드 업체가 관리하느냐의 차이: IaaS(인프라), PaaS(+플랫폼), SaaS(완성된 소프트웨어).',
    match: ['IaaS', 'PaaS', 'SaaS', '클라우드'],
    make: cloudLab,
  },
  {
    id: 'netnew', name: '네트워크 신기술', en: 'Ad-hoc · Mesh · SDN · Edge', cat: 'net',
    summary: '기반 시설 없이 스스로 구성하는 애드혹, 제어를 소프트웨어로 분리하는 SDN, 데이터 가까이서 처리하는 엣지 컴퓨팅 등.',
    match: ['애드혹', 'Ad-hoc', 'Ad hoc', 'SDN', '엣지', '메시', 'MANET', 'NFV', '포그'],
    make: board({ title: '네트워크 신기술', groups: [
      { name: '구성 방식', hue: 190, items: [
        { name: '애드혹 네트워크', en: 'Ad-hoc Network', desc: '기지국·AP 없이 단말끼리 직접 연결, 노드가 라우터 역할. 재난·군사용 (이동하면 MANET)' },
        { name: '메시 네트워크', en: 'Mesh Network', desc: '노드들이 그물처럼 연결된 대규모 네트워크. 한 경로가 끊겨도 우회' },
        { name: 'WSN', en: 'Wireless Sensor Network', desc: '센서 노드들로 이루어진 무선 네트워크' }] },
      { name: '소프트웨어로 제어', hue: 270, items: [
        { name: 'SDN', en: 'Software Defined Networking', desc: '장비의 제어 기능을 분리해 중앙 컨트롤러가 소프트웨어로 관리 (OpenFlow)' },
        { name: 'NFV', en: 'Network Functions Virtualization', desc: '방화벽·라우터 같은 기능을 전용 장비 대신 가상 머신의 소프트웨어로' }] },
      { name: '처리 위치', hue: 30, items: [
        { name: '엣지 컴퓨팅', en: 'Edge Computing', desc: '데이터가 생기는 기기 가까이에서 처리해 지연을 줄인다 (자율주행, IoT)' },
        { name: '포그 컴퓨팅', en: 'Fog Computing', desc: '엣지와 클라우드 사이 계층에서 처리' }] },
    ] }),
  },
];
