export function swallow<T>(f: () => T): T | undefined {
  try {
    return f();
  } catch {
    return undefined;
  }
}
