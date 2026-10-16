// 정보처리기사 모드의 시뮬레이터를 개념 그림으로 감싼다 (페이지 교체, 스케줄링, 서브넷, 트리 순회, 수식 표기).
import { el } from '../../view/stage';
import { pagingSim, procTable, schedSim, subnetSim, traverseSim, notationSim, type Sim } from '../../exam/views';
import type { PageAlgo } from '../../exam/sims/paging';
import type { Proc, SchedAlgo } from '../../exam/sims/sched';
import type { Order } from '../../exam/sims/tree';
import { frame, nameHits, type Viz } from '../core';

function simTabs(title: string, en: string, lead: string, items: { name: string; keys: string[]; make: () => Sim; extra?: () => HTMLElement }[]): Viz {
  const { root, body } = frame(title, en);
  const head = el('div', 'seg viz-tabhead');
  const host = el('div');
  let cur: Sim | null = null;
  const open = (k: number) => {
    cur?.dispose();
    cur = items[k]!.make();
    host.replaceChildren(...(items[k]!.extra ? [items[k]!.extra!()] : []), cur.el);
    head.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === k));
  };
  items.forEach((it, k) => {
    const b = el('button', '', it.name);
    b.addEventListener('click', () => open(k));
    head.append(b);
  });
  body.append(el('p', 'viz-desc', lead), head, host);
  open(0);
  return {
    el: root,
    focus: (names) => {
      const k = items.findIndex((it) => nameHits(it.keys, names));
      head.querySelectorAll('button').forEach((b, j) => b.classList.toggle('focus', j === k));
      if (k >= 0) open(k);
    },
    dispose: () => cur?.dispose(),
  };
}

const REFS = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];
export const pagingViz = (): Viz => simTabs('페이지 교체 알고리즘', 'Page Replacement', `프레임 3개, 참조열 ${REFS.join(' ')}. 같은 참조열을 알고리즘마다 돌려 부재 횟수를 비교해 보세요.`,
  (['FIFO', 'LRU', 'LFU', 'OPT'] as PageAlgo[]).map((a) => ({ name: a, keys: [a, { FIFO: '선입선출', LRU: '최근 최소 사용', LFU: '최소 빈도', OPT: '최적' }[a]], make: () => pagingSim(REFS, 3, a) })));

const PROCS: Proc[] = [{ name: 'P1', arrival: 0, burst: 7 }, { name: 'P2', arrival: 1, burst: 4 }, { name: 'P3', arrival: 2, burst: 2 }, { name: 'P4', arrival: 4, burst: 5 }];
export const schedViz = (): Viz => simTabs('CPU 스케줄링', 'FCFS · SJF · SRT · RR · HRN', '같은 프로세스 4개를 알고리즘마다 돌려 간트 차트와 평균 대기 시간을 비교해 보세요. 선점형(SRT, RR)은 도중에 CPU를 빼앗긴다.',
  ([['FCFS', '선입선처리'], ['SJF', '최단 작업 우선'], ['SRT', '최소 잔여 시간'], ['RR', '라운드 로빈'], ['HRN', '응답률']] as [SchedAlgo, string][]).map(([a, ko]) => ({
    name: `${a} ${ko}`, keys: [a, ko], make: () => schedSim(PROCS, a, 2), extra: () => procTable(PROCS, false),
  })));

export const subnetViz = (): Viz => simTabs('IP 주소와 서브넷', 'IPv4 · CIDR · Subnet Mask', 'IP 주소와 서브넷 마스크를 비트로 놓고 AND 하면 네트워크 주소, 호스트 부분을 모두 1로 채우면 브로드캐스트 주소가 된다.',
  ([['/24', 24], ['/26', 26], ['/27', 27], ['/20', 20]] as [string, number][]).map(([n, p]) => ({ name: `192.168.10.77${n}`, keys: [n], make: () => subnetSim('192.168.10.77', p) })));

export const treeViz = (): Viz => simTabs('이진 트리 순회', 'Preorder · Inorder · Postorder', '전위: 자신 → 왼쪽 → 오른쪽 / 중위: 왼쪽 → 자신 → 오른쪽 / 후위: 왼쪽 → 오른쪽 → 자신',
  ([['전위 순회', 'pre'], ['중위 순회', 'in'], ['후위 순회', 'post']] as [string, Order][]).map(([n, o]) => ({ name: n, keys: [n, n.slice(0, 2)], make: () => traverseSim('A B C D E F G', o) })));

export const notationViz = (): Viz => simTabs('수식 표기법 변환', 'Infix → Postfix · Prefix', '중위식(A+B)을 스택으로 후위식(AB+)으로 바꾸는 과정. 연산자 우선순위가 높을수록 먼저 나간다.',
  [{ name: '후위식으로', keys: ['후위', 'Postfix'], make: () => notationSim('(A+B)*C-D/E', 'post') }, { name: '전위식으로', keys: ['전위', 'Prefix'], make: () => notationSim('A*(B-C)+D/E', 'pre') }]);
