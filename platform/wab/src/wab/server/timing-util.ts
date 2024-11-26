import { AsyncLocalStorage } from "async_hooks";

export interface CallDuration {
  name: string;
  duration: number;
  subcalls: CallDuration[];
}

export interface TimingStore {
  calls: CallDuration[];
  cur: CallDuration | undefined;
}

export const ASYNC_TIMING = new AsyncLocalStorage<TimingStore>();

/**
 * Wraps argument func (could be sync or async) to track its call duration and
 * append statistics to ASYNC_TIMING
 */
export function asyncTimed<T extends (...args: any[]) => any>(
  name: string,
  func: T
) {
  return ((...args: any[]) => {
    const start = new Date().getTime();
    const duration: CallDuration = {
      name,
      duration: 0,
      subcalls: [],
    };
    const store = ASYNC_TIMING.getStore();
    const prev = store?.cur;
    if (store) {
      if (store.cur) {
        store.cur.subcalls.push(duration);
      } else {
        store.calls.push(duration);
      }
      store.cur = duration;
    }

    const cleanup = () => {
      const end = new Date().getTime();
      duration.duration = end - start;
      if (store) {
        store.cur = prev;
      }
    };

    let result: any;
    try {
      result = func(...args);
    } catch (err) {
      cleanup();
      throw err;
    }
    if (isPromiseLike(result)) {
      return (result as Promise<any>).finally(() => {
        cleanup();
      });
    } else {
      cleanup();
      return result;
    }
  }) as T;
}

export function asyncTimedExec<R>(name: string, func: () => R) {
  const timedFunc = asyncTimed(name, func);
  return timedFunc();
}

function isPromiseLike(x: any) {
  return (
    x != null && typeof x === "object" && x.then && typeof x.then === "function"
  );
}

export function serializeCallDurations(calls: CallDuration[], startDepth = 0) {
  const lines: string[] = [];
  const rec = (call: CallDuration, depth: number) => {
    const indent = new Array(depth).fill("  ").join("");
    lines.push(`${indent}${call.name} (${Math.round(call.duration)}ms)`);
    call.subcalls.forEach((c) => rec(c, depth + 1));
  };
  calls.forEach((c) => rec(c, startDepth));
  return lines.join("\n");
}

const MAX_CALLS = 5;
/**
 * Convert CallDurations[] to Server-Timing format
 */
export function callsToServerTiming(calls: CallDuration[]) {
  let flatCalls: { name: string; duration: number }[] = [];
  const rec = (call: CallDuration, path: string[]) => {
    if (call.duration === 0) {
      return;
    }
    const callName = makeCallName(path, call.name);
    if (call.subcalls.length === 0) {
      flatCalls.push({ name: callName, duration: call.duration });
    } else {
      const selfTime =
        call.duration - call.subcalls.reduce((x, y) => x + y.duration, 0);
      if (selfTime > 0) {
        flatCalls.push({
          name: callName,
          duration: selfTime,
        });
      }
      call.subcalls.forEach((subcall) => rec(subcall, [...path, call.name]));
    }
  };

  calls.forEach((call) => rec(call, []));
  const total = flatCalls.reduce((x, y) => x + y.duration, 0);

  if (flatCalls.length > MAX_CALLS) {
    // If there are a lot of calls, only keep the top MAX_CALLS, so we don't
    // end up with too large of a header, which makes Cloudfront unhappy
    const topCalls = flatCalls
      .sort((a, b) => b.duration - a.duration)
      .slice(0, MAX_CALLS);
    const restDuration = flatCalls.reduce(
      (x, y) => x + (topCalls.includes(y) ? 0 : y.duration),
      0
    );
    flatCalls = [...topCalls, { name: "rest", duration: restDuration }];
  }

  return `total;dur=${total},${flatCalls
    .map((call) => `${call.name};dur=${call.duration}`)
    .join(",")}`;
}

const RE_UPPERCASE = /[A-Z]/;
const RE_NON_LETTER_PREFIX = /^[^a-zA-Z]*/;
function makeCallName(path: string[], name: string) {
  if (path.length === 0) {
    return name;
  }
  const abbreviated = (part: string) => {
    return Array.from(part.replace(RE_NON_LETTER_PREFIX, ""))
      .filter((x, i) => i === 0 || RE_UPPERCASE.test(x))
      .join("");
  };
  // Only save the first/last 4 if it starts getting too big to avoid making the header too large
  if (path.length > 12) {
    path = [...path.slice(0, 4), "...", ...path.slice(-4)];
  }
  return `${path.map((p) => abbreviated(p)).join("_")}_${name}`;
}
