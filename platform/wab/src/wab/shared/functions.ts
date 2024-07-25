import { unexpected } from "@/wab/shared/common";

export function noopFn() {
  // noop
}

export function unexpectedFn(...args: unknown[]) {
  console.error("unexpectedFn called with args", args);
  unexpected(`unexpectedFn called`);
}
