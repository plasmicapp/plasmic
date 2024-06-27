/**
 * Shim for window.requestIdleCallback, based on https://gist.github.com/paullewis/55efe5d6f05434a96c36
 */

import { spawnWrapper } from "@/wab/shared/common";

export type IdleCallback = (opts: {
  didTimeout: boolean;
  timeRemaining: () => number;
}) => void;

export function requestIdleCallback(callback: IdleCallback): number {
  if ("requestIdleCallback" in window) {
    return (window as any).requestIdleCallback(callback);
  } else {
    return window.setTimeout(function () {
      const start = Date.now();
      callback({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        },
      });
    }, 1);
  }
}

export function clearIdleCallback(id: number) {
  if ("cancelIdleCallback" in window) {
    (window as any).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

export type IdleCallbackAsync = (opts: {
  didTimeout: boolean;
  timeRemaining: () => number;
}) => Promise<void>;

export async function requestIdleCallbackAsync(
  callback: IdleCallbackAsync
): Promise<void> {
  return new Promise((resolve) => {
    const requestId = requestIdleCallback(
      spawnWrapper(async (args) => {
        await callback(args);
        clearIdleCallback(requestId);
        resolve();
      })
    );
  });
}
