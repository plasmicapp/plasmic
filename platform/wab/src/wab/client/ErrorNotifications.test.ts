import { shouldIgnoreError } from "@/wab/client/ErrorNotifications";

describe("shouldIgnoreError", () => {
  it.each([
    "NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope': The script at 'https://studio-static.plasmic.app/editor.worker.js' failed to load.",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
  ])("ignores %s", (message) => {
    expect(shouldIgnoreError(new Error(message))).toBe(true);
  });

  it("does not ignore other errors", () => {
    expect(shouldIgnoreError(new Error("Failed to fetch"))).toBe(false);
  });
});
