// IPv4 서브넷 계산: 네트워크·브로드캐스트 주소, 호스트 수, 고정 길이(FLSM) 분할.
// 관례: 서브넷 제로(첫 서브넷)도 사용한다.

export const toInt = (ip: string): number => ip.split('.').reduce((a, o) => (a * 256) + Number(o), 0);
export const toIp = (n: number): string => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join('.');
export const bits = (n: number): string => n.toString(2).padStart(32, '0');
export const maskOf = (prefix: number): number => (prefix === 0 ? 0 : (2 ** 32 - 2 ** (32 - prefix)));

export interface SubnetInfo {
  ip: number; prefix: number; mask: number; network: number; broadcast: number;
  first: number; last: number; hosts: number;
}

export function subnetInfo(ip: string, prefix: number): SubnetInfo {
  const n = toInt(ip);
  const mask = maskOf(prefix);
  const size = 2 ** (32 - prefix);
  const network = n - (n % size);
  const broadcast = network + size - 1;
  return { ip: n, prefix, mask, network, broadcast, first: network + 1, last: broadcast - 1, hosts: Math.max(0, size - 2) };
}

/** base/prefix 네트워크를 count개 이상으로 나눈 서브넷들 */
export function divide(base: string, prefix: number, count: number): SubnetInfo[] {
  const extra = Math.ceil(Math.log2(Math.max(1, count)));
  const np = prefix + extra;
  const size = 2 ** (32 - np);
  const start = subnetInfo(base, prefix).network;
  return Array.from({ length: 2 ** extra }, (_, i) => subnetInfo(toIp(start + i * size), np));
}
