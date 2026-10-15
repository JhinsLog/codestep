// 페이지 교체 알고리즘 (FIFO · LRU · LFU · OPT).
//
// 정보처리기사에서 쓰는 관례를 따른다:
//   - 프레임은 자리가 고정이다. 교체되면 그 자리에 새 페이지가 들어간다
//   - LFU에서 참조 횟수가 같으면 먼저 들어온 페이지를 교체한다 (FIFO)
//   - OPT에서 앞으로 다시 안 쓰이는 페이지가 여럿이면 먼저 들어온 페이지를 교체한다

export type PageAlgo = 'FIFO' | 'LRU' | 'LFU' | 'OPT';

export const PAGE_ALGO_NAME: Record<PageAlgo, string> = {
  FIFO: 'FIFO (먼저 들어온 것 교체)',
  LRU: 'LRU (가장 오래 안 쓴 것 교체)',
  LFU: 'LFU (가장 적게 쓴 것 교체)',
  OPT: 'OPT (앞으로 가장 늦게 쓸 것 교체)',
};

export interface PageStep {
  ref: number;                    // 이번에 참조한 페이지
  frames: (number | null)[];      // 처리 후 프레임 모습
  hit: boolean;
  slot: number;                   // 적재·적중한 자리
  victim: number | null;          // 교체되어 나간 페이지
  faults: number;                 // 지금까지 부재 수
  note: string;
}

export function simulatePaging(refs: number[], nFrames: number, algo: PageAlgo): PageStep[] {
  const frames: (number | null)[] = Array(nFrames).fill(null);
  const loaded: number[] = Array(nFrames).fill(-1);   // 들어온 시각
  const used: number[] = Array(nFrames).fill(-1);     // 마지막 사용 시각
  const count: number[] = Array(nFrames).fill(0);     // 들어온 뒤 참조 횟수
  const steps: PageStep[] = [];
  let faults = 0;

  refs.forEach((ref, t) => {
    const at = frames.indexOf(ref);
    if (at >= 0) {
      used[at] = t;
      count[at]!++;
      steps.push({ ref, frames: frames.slice(), hit: true, slot: at, victim: null, faults, note: `${ref} 참조 → 이미 프레임에 있음 (적중)` });
      return;
    }
    faults++;
    const empty = frames.indexOf(null);
    let slot: number;
    let why: string;
    if (empty >= 0) {
      slot = empty;
      why = '빈 프레임에 적재';
    } else {
      const idx = [...frames.keys()];
      const byLoad = (a: number, b: number) => loaded[a]! - loaded[b]!;
      if (algo === 'FIFO') {
        slot = idx.sort(byLoad)[0]!;
        why = `가장 먼저 들어온 ${frames[slot]} 교체`;
      } else if (algo === 'LRU') {
        slot = idx.sort((a, b) => used[a]! - used[b]!)[0]!;
        why = `가장 오래 전에 쓴 ${frames[slot]} 교체 (마지막 사용 ${used[slot]! + 1}번째)`;
      } else if (algo === 'LFU') {
        slot = idx.sort((a, b) => count[a]! - count[b]! || byLoad(a, b))[0]!;
        why = `참조 횟수가 가장 적은 ${frames[slot]} 교체 (${count[slot]}회${idx.filter((i) => count[i] === count[slot]).length > 1 ? ', 같으면 먼저 들어온 것' : ''})`;
      } else {
        const next = (i: number) => {
          const n = refs.indexOf(frames[i]!, t + 1);
          return n < 0 ? Infinity : n;
        };
        slot = idx.sort((a, b) => next(b) - next(a) || byLoad(a, b))[0]!;
        const n = next(slot);
        why = n === Infinity ? `앞으로 다시 안 쓰는 ${frames[slot]} 교체` : `가장 늦게(${n + 1}번째) 다시 쓰는 ${frames[slot]} 교체`;
      }
    }
    const victim = frames[slot] ?? null;
    frames[slot] = ref;
    loaded[slot] = t;
    used[slot] = t;
    count[slot] = 1;
    steps.push({ ref, frames: frames.slice(), hit: false, slot, victim, faults, note: `${ref} 참조 → 프레임에 없음 (부재 ${faults}) → ${why}` });
  });
  return steps;
}
