import { logger, withSpan } from "@/wab/server/observability";
import { stampIgnoreError } from "@/wab/shared/error-handling";
import { Span, context, propagation, trace } from "@opentelemetry/api";
import * as Sentry from "@sentry/node";

const { timerEnd } = vi.hoisted(() => ({ timerEnd: vi.fn() }));

vi.mock("@/wab/server/promstats", () => ({
  WabPromTimer: class {
    end = timerEnd;
  },
}));

beforeEach(() => {
  timerEnd.mockClear();
  Sentry.init({
    dsn: "http://public@127.0.0.1/1",
    defaultIntegrations: false,
    registerEsmLoaderHooks: false,
    tracesSampleRate: 1,
    sendClientReports: false,
    transport: () => ({ send: async () => ({}), flush: async () => true }),
  });
});

afterEach(async () => {
  await Sentry.close(1000);
  Sentry.getCurrentScope().setClient(undefined);
  Sentry.getCurrentScope().clear();
  Sentry.getIsolationScope().clear();
  context.disable();
  trace.disable();
  propagation.disable();
});

describe("withSpan", () => {
  it("logs ignored upstream failures at WARN and still rethrows them", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const logError = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);
    const error = stampIgnoreError(new Error("ENOTFOUND"));
    await expect(
      withSpan("execute-data-op", async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('span "execute-data-op" failed'),
    );
    expect(logError).not.toHaveBeenCalled();
    expect(timerEnd).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "logs on the operation span before ending it (failure: %s)",
    async (failure) => {
      let operationSpan: Span | undefined;
      let loggedSpan: Span | undefined;
      let recordingAtLog: boolean | undefined;
      const log = vi
        .spyOn(logger, failure ? "warn" : "info")
        .mockImplementation(() => {
          loggedSpan = trace.getSpan(context.active());
          recordingAtLog = loggedSpan?.isRecording();
        });
      const error = new Error("operation failed");

      await trace
        .getTracer("test")
        .startActiveSpan("parent", async (parent) => {
          try {
            const result = withSpan("operation", async () => {
              operationSpan = trace.getSpan(context.active());
              await Promise.resolve();
              if (failure) {
                throw error;
              }
              return 42;
            });

            if (failure) {
              await expect(result).rejects.toBe(error);
            } else {
              await expect(result).resolves.toBe(42);
            }

            expect(operationSpan).toBeDefined();
            expect(log).toHaveBeenCalledOnce();
            expect(loggedSpan).toBe(operationSpan);
            expect(recordingAtLog).toBe(true);
            expect(operationSpan?.isRecording()).toBe(false);
            expect(timerEnd).toHaveBeenCalledOnce();
            expect(trace.getSpan(context.active())).toBe(parent);
          } finally {
            parent.end();
          }
        });
    },
  );
});
