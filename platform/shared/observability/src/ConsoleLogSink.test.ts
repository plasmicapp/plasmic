import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleLogSink } from "./ConsoleLogSink";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConsoleLogSink", () => {
  it("logs the message without a payload arg when there is no payload", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    new ConsoleLogSink().info("hello");
    expect(spy.mock.calls).toEqual([["[logger.info] hello"]]);
  });

  it("logs the payload when there is one", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    new ConsoleLogSink().error("boom", { a: 1 });
    expect(spy.mock.calls).toEqual([["[logger.error] boom", { a: 1 }]]);
  });
});
