export function hashCode(s) {
  let h;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}

export const X = 0, Y = 1, Z = 2;
export const range = (n: number) => [...new Array(n)].map((_, i) => i);
export const rangef = <T>(n: number, f: (n: number) => T) => [...new Array(n)].map((_, i) => f ? f(i) : i) as T[];
export const PI2 = Math.PI * 2, PI = Math.PI, PIH = Math.PI / 2, PIQ = Math.PI / 4;

const maxN = 2**31;

export type Rng = (n?: number) => number;

export function RNG(seed: number) {
  if (0 < seed && seed < 1)
    seed = ~~(seed * maxN);

  let rngi = (n: number) => {
    return (seed = (seed * 16807) % 0x7FFFFFFF) % n;
  };

  let rng = (n?: number) => {
    return n == -1 ? seed : n == null ? rngi(maxN) / maxN : rngi(n)
  }
  return rng;
}

export function dictMap<T, S>(a: { [id: string]: T }, f: (t: T, k: string, a: { [id: string]: T }) => S) {
  let res: { [id: string]: S } = {};
  for (let k in a)
    res[k] = f(a[k], k, a);
  return res;
}

export function hexDigit(n: number, place: number) {
  return n >> (place * 4) % 16;
}

export function hex2Digit(n: number, place: number) {
  return n >> (place * 4) % 256;
}

export function hexFromDigits(n:number[]){
  return n.reduce((t,v)=>t*16+v)
}

export function lastOf<T>(arr:T[]){
  return arr[arr.length-1];
}

export function fromTheEnd<T>(arr:T[], n:number=1){
  return arr[arr.length-n];
}

export function toObjectBy(arr:any[], name:string){
  return Object.fromEntries(arr.map(v=>[v[name], v]))
}