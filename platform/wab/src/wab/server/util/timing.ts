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
