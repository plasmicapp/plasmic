export function nudgeIntoRange(
  n: number,
  { min, max }: { min: number; max: number }
) {
  return Math.min(max, Math.max(min, n));
}

export function ensureNumber(n: number | string | null | undefined) {
  return typeof n === "number" ? n : parseInt(n || "0", 10);
}
