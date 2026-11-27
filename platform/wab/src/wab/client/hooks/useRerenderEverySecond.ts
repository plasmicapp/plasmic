import { noopFn } from "@/wab/shared/functions";
import * as React from "react";

export function useRerenderEverySecond(enabled = true): void {
  React.useSyncExternalStore(
    enabled ? subscribe : subscribeNever,
    enabled ? getVersion : getZero,
  );
}

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let version = 0;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    tick();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

function tick() {
  timer = setTimeout(
    () => {
      version++;
      listeners.forEach((listener) => listener());
      tick();
    },
    1000 - (Date.now() % 1000),
  );
}

function subscribeNever(): () => void {
  return noopFn;
}

function getVersion(): number {
  return version;
}

function getZero(): number {
  return 0;
}
