export function assertNever(x: never): never {
  throw new Error("unexpected branch taken");
}
