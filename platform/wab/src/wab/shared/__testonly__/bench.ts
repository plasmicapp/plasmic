export const RUN_BENCHMARKS = Boolean(process.env.RUN_BENCHMARKS);

interface BenchOpts {
  warmupRuns?: number;
  timedRuns?: number;
}

/**
 * Wrapper for making a test a benchmark.
 *
 * Normally the test would run once.
 * If RUN_BENCHMARKS env var is true, the test code will be run multiple times based on the options.
 *
 * To run:
 *  RUN_BENCHMARKS=1 pnpm vitest run ./module.test.ts
 */
export function bench<R>(name: string, f: () => R, opts?: BenchOpts): R;
export function bench<S, R>(
  name: string,
  f: (state: S) => R,
  opts: BenchOpts & { setup: () => S },
): R;
export function bench<S, R>(
  name: string,
  f: (state?: S) => R,
  {
    setup,
    warmupRuns = 5,
    timedRuns = 20,
  }: BenchOpts & { setup?: () => S } = {},
): R {
  if (!RUN_BENCHMARKS) {
    return f(setup?.());
  }
  if (!Number.isSafeInteger(timedRuns) || timedRuns < 1) {
    throw new RangeError("timedRuns must be a positive integer");
  }
  if (!Number.isSafeInteger(warmupRuns) || warmupRuns < 0) {
    throw new RangeError("warmupRuns must be a nonnegative integer");
  }
  for (let i = 0; i < warmupRuns; i++) {
    f(setup?.());
  }
  const times: number[] = [];
  let result: R;
  do {
    const state = setup?.();
    const start = performance.now();
    result = f(state);
    times.push(performance.now() - start);
  } while (times.length < timedRuns);
  times.sort((a, b) => a - b);
  const mid = Math.floor(timedRuns / 2);
  const median =
    timedRuns % 2 === 1 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
  process.stdout.write(
    `${name}: ${median.toFixed(1)} ms (median of ${timedRuns})\n`,
  );
  return result;
}
