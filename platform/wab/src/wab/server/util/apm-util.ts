import { WabPromTimer } from "@/wab/server/promstats";

export async function withSpan<T>(
  name: string,
  f: () => Promise<T>,
  msg?: string
) {
  const start = new Date().getTime();
  const promTimer = new WabPromTimer(name);
  try {
    return await f();
  } finally {
    const suffix = msg ? `: ${msg}` : "";
    console.log(`${name} took ${new Date().getTime() - start}ms${suffix}`);
    promTimer.end();
  }
}

export async function withTimeSpent<T>(f: () => Promise<T>): Promise<{
  result: T;
  spentTime: number;
}> {
  const start = new Date().getTime();
  const result = await f();
  return {
    result,
    spentTime: new Date().getTime() - start,
  };
}
