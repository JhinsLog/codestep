// 운영체제 개념
import { board } from '../three/adapt';
import { graph } from '../three/adapt';
import { ladder } from '../three/adapt';
import { stack, tabs } from '../core';
import { chmod, raid } from '../custom/misc';
import { pagingViz, schedViz } from '../custom/sims';
import type { Concept } from './types';

export const OS: Concept[] = [
  {
    id: 'process', name: '프로세스 상태', en: 'Process State', cat: 'os',
    summary: '생성 → 준비 → (디스패치) 실행 → 종료. 시간 할당이 끝나면 준비로, 입출력을 기다리면 대기로, 입출력이 끝나면 다시 준비로 간다.',
    match: ['프로세스 상태', '상태 전이', '디스패치', '웨이크업', 'Wake Up', '타임아웃', 'Dispatch', 'IPC', '프로세스 간 통신', '준비 상태'],
    make: () => stack([
      graph({ title: '프로세스 상태 전이도', en: '▶ 재생: 프로세스 하나의 일생', w: 640, h: 300,
        nodes: [{ id: 'new', name: '생성', en: 'New', x: 70, y: 70, kind: 'state', desc: '프로세스가 만들어졌다' },
          { id: 'ready', name: '준비', en: 'Ready', x: 240, y: 150, kind: 'state', desc: 'CPU만 받으면 바로 실행할 수 있다. 준비 큐에서 기다린다' },
          { id: 'run', name: '실행', en: 'Running', x: 440, y: 70, kind: 'state', desc: 'CPU를 받아 명령을 실행 중이다' },
          { id: 'wait', name: '대기', en: 'Waiting · Blocked', x: 440, y: 240, kind: 'state', desc: '입출력 같은 사건을 기다린다. CPU를 줘도 실행할 수 없다' },
          { id: 'end', name: '종료', en: 'Terminated', x: 590, y: 150, kind: 'state', desc: '실행을 마쳤다' }],
        edges: [{ a: 'new', b: 'ready', label: '승인' }, { a: 'ready', b: 'run', label: '디스패치', curve: -20 }, { a: 'run', b: 'ready', label: '타임아웃', curve: -20 }, { a: 'run', b: 'wait', label: '블록 (입출력 요청)' }, { a: 'wait', b: 'ready', label: '웨이크업 (입출력 완료)' }, { a: 'run', b: 'end', label: '종료' }],
        scenarios: [{ name: '일생', path: [['new', 'ready', 'run', 'ready', 'run', 'wait', 'ready', 'run', 'end']], notes: [
          '생성된 프로세스가 준비 큐에 들어간다', '스케줄러가 CPU를 준다 — 디스패치', '할당 시간이 끝나 CPU를 내놓는다 — 타임아웃(실행 → 준비)',
          '다시 차례가 와서 디스패치', '파일을 읽으려고 입출력을 요청 — 블록(실행 → 대기)', '입출력이 끝났다 — 웨이크업. 실행이 아니라 준비로 간다!',
          '다시 디스패치', '할 일을 모두 마치고 종료'] }] })(),
      board({ title: '프로세스 간 통신 (IPC)', en: 'Inter-Process Communication', groups: [
        { name: '공유 메모리', hue: 200, items: [{ name: '공유 메모리', en: 'Shared Memory', desc: '같은 메모리를 함께 쓴다. 빠르지만 동기화(세마포어)가 필요' }] },
        { name: '메시지 전달', hue: 30, items: [{ name: '파이프', en: 'Pipe' }, { name: '메시지 큐', en: 'Message Queue' }, { name: '소켓', en: 'Socket', desc: '네트워크 너머의 프로세스와도' }, { name: '세마포어', en: 'Semaphore', desc: '동기화 신호' }] },
      ], quiz: false })(),
    ]),
  },
  {
    id: 'sched', name: 'CPU 스케줄링', en: 'CPU Scheduling', cat: 'os',
    summary: '비선점(FCFS, SJF, HRN)은 한번 잡으면 끝까지, 선점(RR, SRT, MLQ)은 도중에 빼앗는다. SJF의 기아는 에이징·HRN으로 줄인다.',
    match: ['스케줄링', 'FCFS', 'SJF', 'SRT', 'HRN', 'RR', '라운드 로빈', '선점', '비선점', '기아', '에이징', '호위', 'Convoy', '평균 대기', '평균 반환'],
    make: () => tabs([
      { name: '간트 차트로 비교', make: schedViz },
      { name: '선점·비선점', make: board({ title: '스케줄링 기법 분류', groups: [
        { name: '비선점', en: 'Non-preemptive', hue: 210, desc: '한번 CPU를 잡으면 끝날 때까지', items: [
          { name: 'FCFS', en: '선입선처리', desc: '먼저 온 순서. 긴 작업 뒤에 줄 서는 호위 효과' }, { name: 'SJF', en: '최단 작업 우선', desc: '실행 시간이 짧은 것 먼저. 긴 작업은 기아' },
          { name: 'HRN', en: 'Highest Response ratio Next', desc: '(대기 + 서비스) / 서비스가 큰 것. 기아 방지' }, { name: '우선순위 (비선점)', desc: '' }] },
        { name: '선점', en: 'Preemptive', hue: 0, desc: '더 급한 프로세스가 오면 빼앗는다', items: [
          { name: 'RR', en: '라운드 로빈', desc: '시간 할당량만큼 돌아가며' }, { name: 'SRT', en: 'Shortest Remaining Time', desc: '남은 시간이 가장 짧은 것' },
          { name: 'MLQ', en: '다단계 큐', desc: '큐를 여러 개, 큐 사이 이동 없음' }, { name: 'MLFQ', en: '다단계 피드백 큐', desc: '큐 사이 이동 가능' }] },
        { name: '문제와 해결', hue: 40, items: [{ name: '기아', en: 'Starvation', desc: '계속 밀려 무한히 기다림' }, { name: '에이징', en: 'Aging', desc: '오래 기다리면 우선순위를 올려 기아를 막는다' }, { name: '호위 효과', en: 'Convoy Effect', desc: 'FCFS에서 긴 작업 뒤에 짧은 작업들이 줄줄이' }] },
      ] }) },
    ]),
  },
  {
    id: 'paging', name: '페이지 교체', en: 'Page Replacement', cat: 'os',
    summary: '빈 프레임이 없을 때 어떤 페이지를 내보낼지: FIFO(먼저 들어온 것), LRU(가장 오래 안 쓴 것), LFU(가장 적게 쓴 것), OPT(앞으로 가장 오래 안 쓸 것).',
    match: ['페이지 교체', 'LRU', 'FIFO', 'OPT', 'LFU', '페이지 부재', 'Page Fault', '프레임'],
    make: pagingViz,
  },
  {
    id: 'linux', name: '리눅스와 파일 권한', en: 'UNIX · Linux · chmod', cat: 'os',
    summary: 'rwx = 4·2·1을 더해 소유자·그룹·기타 순서로 쓴다(751). UNIX는 커널·셸·유틸리티로 이루어진다.',
    match: ['chmod', '권한', 'pwd', 'chown', '리눅스', 'UNIX', '유닉스', '셸', '커널', '안드로이드', 'Android', '디렉터리', '명령어'],
    make: () => tabs([
      { name: 'chmod 권한', make: chmod },
      { name: '명령어', make: board({ title: '자주 나오는 리눅스 명령어', groups: [
        { name: '위치·목록', hue: 200, items: [{ name: 'pwd', desc: '현재 작업 디렉터리 경로 출력' }, { name: 'ls', desc: '파일 목록 (-l 자세히, -a 숨김 포함)' }, { name: 'cd', desc: '디렉터리 이동' }] },
        { name: '파일', hue: 30, items: [{ name: 'cp', desc: '복사' }, { name: 'mv', desc: '이동·이름 바꾸기' }, { name: 'rm', desc: '삭제' }, { name: 'mkdir', desc: '디렉터리 만들기' }, { name: 'cat', desc: '내용 보기' }] },
        { name: '권한·프로세스', hue: 140, items: [{ name: 'chmod', desc: '권한 바꾸기' }, { name: 'chown', desc: '소유자 바꾸기' }, { name: 'ps', desc: '프로세스 목록' }, { name: 'kill', desc: '프로세스 종료' }] },
      ] }) },
      { name: 'UNIX 구조', make: ladder({ title: 'UNIX 시스템 구조', top: '사용자', bottom: '하드웨어', shape: 'stack', hue: [200, 280], items: [
        { name: '유틸리티', en: 'Utility', desc: '편집기, 컴파일러 같은 응용 프로그램' },
        { name: '셸', en: 'Shell', desc: '사용자의 명령어를 해석해 커널에 전달하는 명령어 해석기 (bash, sh)' },
        { name: '커널', en: 'Kernel', desc: '하드웨어를 직접 관리: 프로세스, 메모리, 파일, 입출력' },
        { name: '하드웨어', en: 'Hardware', desc: 'CPU, 메모리, 디스크' },
      ], note: 'UNIX: 대부분 C로 작성되어 이식성이 높고, 계층적 트리 파일 시스템, 다중 사용자·다중 작업. 안드로이드는 리눅스 커널 기반 모바일 OS.' }) },
    ]),
  },
  {
    id: 'raid', name: 'RAID', en: 'Redundant Array of Independent Disks', cat: 'os',
    summary: 'RAID 0(스트라이핑, 빠르지만 중복 없음), 1(미러링), 5(분산 패리티, 1개 고장까지), 6(이중 패리티, 2개 고장까지).',
    match: ['RAID', '스트라이핑', '미러링', '패리티 분산', 'Striping', 'Mirroring'],
    make: raid,
  },
];
