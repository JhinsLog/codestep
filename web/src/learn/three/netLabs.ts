// 네트워크 3D 실습: IP 주소와 서브넷 마스크를 비트 블록으로 놓고 AND, 브로드캐스트, 호스트 범위, 서브넷 나누기.
import { Vector3 } from 'three';
import { bits, divide, maskOf, subnetInfo, toInt, toIp } from '../../exam/sims/subnet';
import { sleep, type Viz } from '../core';
import type { SyncOpts, Want } from './keyed';
import { base } from './kit';
import { lab, type Cmd } from './lab';
import { hex, type Info } from './world';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const SI: Record<string, Info> = {
  ip: { title: 'IP 주소', sub: '32비트', body: '8비트씩 4부분(옥텟)을 10진수로 적은 것이 192.168.10.77 같은 표기입니다. 앞쪽은 네트워크 부분, 뒤쪽은 호스트 부분입니다.' },
  mask: { title: '서브넷 마스크', sub: '/프리픽스 = 앞쪽 1의 개수', body: '네트워크 부분은 1, 호스트 부분은 0입니다. /26이면 앞 26비트가 1 → 255.255.255.192.' },
  net: { title: '네트워크 주소', sub: 'IP AND 마스크', body: 'IP와 마스크를 비트마다 AND 하면 호스트 부분이 모두 0이 되어 네트워크 주소가 됩니다. 호스트에 할당할 수 없습니다.' },
  bc: { title: '브로드캐스트 주소', sub: '호스트 부분을 모두 1로', body: '같은 네트워크의 모든 호스트에게 보내는 주소입니다. 호스트에 할당할 수 없습니다. 사용 가능한 호스트 수 = 2^(호스트 비트 수) − 2.' },
};

export function subnetLab(): Viz {
  return lab({ title: 'IP 서브넷 계산 3D', en: 'IP AND Mask · Network · Broadcast · Subnetting', height: 500, setup: (l) => {
    const b = base(l);
    const { w, k } = b;
    const IP = '192.168.10.77';
    let prefix = 26;
    let rows = { mask: false, net: 0, bc: 0 };   // net·bc: 채운 비트 수
    let subs: ReturnType<typeof divide> | null = null;
    const BX = (i: number) => -6.6 + i * 0.4 + Math.floor(i / 8) * 0.35;
    const RZ = { ip: -2.4, mask: -1.2, net: 0.2, bc: 1.5 };
    function want(): Want[] {
      const P = w.pal;
      const out: Want[] = [];
      const ipb = bits(toInt(IP)), mb = bits(maskOf(prefix));
      const info = subnetInfo(IP, prefix);
      const nb = bits(info.network), bb = bits(info.broadcast);
      const row = (key: keyof typeof RZ, str: string, upto: number, inf: Info, label: string, dec: string) => {
        for (let i = 0; i < Math.min(32, upto); i++) {
          const host = i >= prefix;
          const one = str[i] === '1';
          out.push({ key: `${key}:${i}`, kind: 'block', pos: V(BX(i), 0, RZ[key]), size: [0.36, one ? 0.42 : 0.2, 0.9], color: host ? (one ? 0xf59e0b : 0xfde7c2) : one ? 0x2563eb : 0xc7d7fe, text: str[i]!, textColor: one ? '#ffffff' : P.cellText, info: inf });
        }
        out.push({ key: `${key}:l`, kind: 'sign', pos: V(BX(0) - 1.3, 0.3, RZ[key]), runs: [{ text: label, color: P.text, weight: 800, size: 36 }], height: 0.36, bg: hex(P.slab), info: inf });
        if (upto >= 32) out.push({ key: `${key}:d`, kind: 'sign', pos: V(BX(31) + 1.9, 0.3, RZ[key]), runs: [{ text: dec, color: P.text, weight: 800, mono: true, size: 38 }], height: 0.4, bg: hex(P.pend), info: inf });
      };
      row('ip', ipb, 32, SI.ip!, 'IP', IP);
      if (rows.mask) row('mask', mb, 32, SI.mask!, `마스크 /${prefix}`, toIp(maskOf(prefix)));
      if (rows.net) row('net', nb, rows.net, SI.net!, '네트워크', toIp(info.network));
      if (rows.bc) row('bc', bb, rows.bc, SI.bc!, '브로드캐스트', toIp(info.broadcast));
      // 네트워크 | 호스트 경계
      const xb = (BX(prefix - 1) + BX(prefix)) / 2;
      out.push({ key: 'cut', kind: 'block', pos: V(xb, 0, -0.45), size: [0.05, 1.0, 4.9], color: P.bad, opacity: 0.6, info: SI.mask });
      out.push({ key: 'cutl', kind: 'sign', pos: V(xb, 1.25, -3.1), runs: [{ text: `네트워크 ${prefix}비트 | 호스트 ${32 - prefix}비트`, color: '#ffffff', weight: 800, size: 36 }], height: 0.4, bg: hex(P.bad), info: SI.mask });
      if (subs) subs.forEach((s, i) => {
        const span = 12.4 / subs!.length;
        out.push({ key: `sb:${i}`, kind: 'block', pos: V(-6.2 + span * (i + 0.5), 0, 3.3), size: [span - 0.12, 0.4, 1.2], color: [0x0ea5e9, 0x22c55e, 0xa855f7, 0xf97316, 0xeab308, 0xec4899, 0x14b8a6, 0x6366f1][i % 8]!, text: `${toIp(s.network)}/${s.prefix}`, textColor: '#ffffff', info: { title: `서브넷 ${i + 1}`, sub: `${toIp(s.network)} ~ ${toIp(s.broadcast)}`, body: `네트워크 주소 ${toIp(s.network)}, 브로드캐스트 ${toIp(s.broadcast)}, 호스트 ${toIp(s.first)} ~ ${toIp(s.last)} (${s.hosts}대)` } });
        out.push({ key: `sr:${i}`, kind: 'sign', pos: V(-6.2 + span * (i + 0.5), 0.3, 4.3), runs: [{ text: `.${s.network % 256}~.${s.broadcast % 256}`, color: P.text, weight: 700, size: 34, mono: true }], height: 0.32 });
      });
      return out;
    }
    const draw = (o: SyncOpts = {}) => k.sync(want(), o);
    w.onRepaint = () => void draw({ ms: 0 });
    async function setPrefix(p: number) {
      prefix = p; rows = { mask: true, net: 0, bc: 0 }; subs = null;
      const info = subnetInfo(IP, p);
      l.code(`${IP}/${p}\n마스크 ${toIp(maskOf(p))}`);
      await draw({ ms: 500, spawn: (key, to) => (key.startsWith('mask:') ? to.clone().add(V(0, 2.5, 0)) : undefined) });
      l.say(`/${p}: 앞 ${p}비트가 1인 마스크(${toIp(maskOf(p))}). 호스트 비트 ${32 - p}개 → 주소 ${2 ** (32 - p)}개, 사용 가능한 호스트 ${info.hosts}대.`, 'info');
    }
    async function and() {
      if (!rows.mask) await setPrefix(prefix);
      l.code(`  ${IP}\nAND ${toIp(maskOf(prefix))}\n= ${toIp(subnetInfo(IP, prefix).network)}`);
      // 옥텟(8비트)씩 IP 비트가 아래로 내려와 AND 결과가 된다
      for (let i = 8; i <= 32; i += 8) {
        rows.net = i;
        await draw({ ms: 450, spawn: (key) => { const m = /^net:(\d+)$/.exec(key); return m ? k.get(`ip:${m[1]}`)?.position.clone().add(V(0, 0.6, 0)) : undefined; }, arc: 0.6 });
        await sleep(150);
      }
      l.say(`비트마다 AND(둘 다 1일 때만 1): 마스크가 0인 호스트 부분은 모두 0이 되어 네트워크 주소 ${toIp(subnetInfo(IP, prefix).network)}가 나옵니다.`, 'ok');
    }
    async function bcast() {
      if (rows.net < 32) await and();
      const info = subnetInfo(IP, prefix);
      l.code(`네트워크 ${toIp(info.network)}\n호스트 ${32 - prefix}비트를 모두 1로\n= ${toIp(info.broadcast)}`);
      for (let i = 8; i <= 32; i += 8) { rows.bc = i; await draw({ ms: 420, spawn: (key) => { const m = /^bc:(\d+)$/.exec(key); return m ? k.get(`net:${m[1]}`)?.position.clone().add(V(0, 0.6, 0)) : undefined; }, arc: 0.5 }); await sleep(120); }
      l.say(`호스트 부분(주황)을 모두 1로 바꾸면 브로드캐스트 주소 ${toIp(info.broadcast)}. 호스트에 줄 수 있는 주소는 ${toIp(info.first)} ~ ${toIp(info.last)}, ${info.hosts}대입니다.`, 'ok');
    }
    async function split(n: number) {
      const base0 = `${IP.split('.').slice(0, 3).join('.')}.0`;
      subs = divide(base0, 24, n);
      const np = subs[0]!.prefix;
      l.code(`${base0}/24 를 ${n}개로 나누기\n→ 호스트 비트 ${Math.log2(n)}개를 빌려 /${np}`);
      await draw({ ms: 600, spawn: (key, to) => (key.startsWith('sb:') ? to.clone().add(V(0, 3, 0)) : undefined) });
      w.fit(-8.4, 9.6, -3.8, 5, 800, 1.5);
      l.say(`서브넷 ${n}개 = 2^${Math.log2(n)} → 호스트 비트에서 ${Math.log2(n)}비트를 빌려 /${np}. 각 서브넷은 주소 ${2 ** (32 - np)}개, 호스트 ${2 ** (32 - np) - 2}대. 첫 주소는 네트워크, 끝 주소는 브로드캐스트.`, 'ok');
    }
    async function reset() { prefix = 26; rows = { mask: false, net: 0, bc: 0 }; subs = null; await draw({ exit: 'shrink' }); w.fit(-8.4, 9.6, -3.8, 2.6, 800, 1.5); l.code(IP); }
    void reset();
    return {
      hint: '프리픽스를 고르면 마스크 비트가 깔립니다. AND → 브로드캐스트 순서로 눌러 보세요. 파랑 = 네트워크 부분, 주황 = 호스트 부분.',
      reset,
      groups: [
        { name: '프리픽스', en: 'CIDR', hue: 210, cmds: [24, 26, 27, 20].map((p): Cmd => ({ name: `/${p}`, run: () => setPrefix(p) })) },
        { name: '계산', en: 'Compute', hue: 150, cmds: [{ name: 'AND → 네트워크', run: and }, { name: '브로드캐스트', run: bcast }] },
        { name: '서브넷 나누기', en: 'Subnetting', hue: 30, cmds: [2, 4, 8].map((n): Cmd => ({ name: `/24를 ${n}개로`, run: () => split(n) })) },
      ],
    };
  } });
}
