import { _testonly } from "@/wab/server/run-job";
import * as Sentry from "@sentry/node";
import { afterEach, describe, expect, it, vi } from "vitest";

const { runJob } = _testonly;

vi.mock("@/wab/server/observability/setup", () => ({}));
vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
  close: vi.fn(async () => true),
}));

describe("runJob", () => {
  afterEach(() => {
    process.exitCode = undefined;
    vi.clearAllMocks();
  });

  it("flushes Sentry after a successful job", async () => {
    await runJob("test-job", async () => {});
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.close).toHaveBeenCalledOnce();
    expect(process.exitCode).toBeUndefined();
  });

  it("reports the error, fails the job and flushes Sentry", async () => {
    const error = new Error("boom");
    await runJob("test-job", async () => {
      throw error;
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(Sentry.close).toHaveBeenCalledAfter(
      vi.mocked(Sentry.captureException),
    );
    expect(process.exitCode).toBe(1);
  });
});
