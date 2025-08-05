export type Range<T> = {
  lower: T;
  upper: T;
  lowerExclusive: boolean;
  upperExclusive: boolean;
};

export function mkRange<T>(
  lower: T,
  upper: T,
  opts?: {
    lowerExclusive?: boolean;
    upperExclusive?: boolean;
  }
): Range<T> {
  return {
    lower,
    upper,
    lowerExclusive: opts?.lowerExclusive ?? false,
    upperExclusive: opts?.upperExclusive ?? false,
  };
}
