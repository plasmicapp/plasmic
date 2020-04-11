export function flatMap<T, U>(arr: T[], f: (x: T) => U[]) {
  const r: U[] = [];
  for (const x of arr) {
    r.push(...f(x));
  }
  return r;
}
