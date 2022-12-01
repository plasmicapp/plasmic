export function swallow<T>(f: () => T): T | undefined {
  try {
    return f();
  } catch {
    return undefined;
  }
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> {
  const res: any = {};
  for (const key of keys) {
    if (key in obj) {
      res[key] = obj[key as keyof T];
    }
  }
  return res;
}
