import {
  readClipboardPlasmicData,
  writeClipboardPlasmicData,
} from "@/wab/client/clipboard/common";
import * as Sentry from "@sentry/browser";

vi.mock("@sentry/browser", () => ({ captureException: vi.fn() }));

describe("system clipboard", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard",
  );

  function mockClipboard(
    method: "read" | "write",
    error: unknown,
    synchronous: boolean,
  ) {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        [method]: synchronous
          ? vi.fn(() => {
              throw error;
            })
          : vi.fn().mockRejectedValue(error),
      },
    });
  }

  beforeEach(() => {
    vi.stubGlobal(
      "ClipboardItem",
      class {
        constructor(public items: unknown) {}
      },
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      delete (navigator as any).clipboard;
    }
  });

  it.each([false, true])(
    "does not report a denied clipboard write (sync: %s)",
    async (synchronous) => {
      mockClipboard(
        "write",
        new DOMException("Write permission denied.", "NotAllowedError"),
        synchronous,
      );
      writeClipboardPlasmicData("{}");
      await vi.waitFor(() => expect(console.warn).toHaveBeenCalled());
      expect(Sentry.captureException).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    "reports other clipboard write failures (sync: %s)",
    async (synchronous) => {
      const error = new Error("boom");
      mockClipboard("write", error, synchronous);
      writeClipboardPlasmicData("{}");
      await vi.waitFor(() =>
        expect(Sentry.captureException).toHaveBeenCalledWith(error),
      );
    },
  );

  it("does not report a denied clipboard read", async () => {
    mockClipboard(
      "read",
      new DOMException("Read permission denied.", "NotAllowedError"),
      false,
    );
    await expect(readClipboardPlasmicData()).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports other clipboard read failures", async () => {
    const error = new Error("boom");
    mockClipboard("read", error, false);
    await expect(readClipboardPlasmicData()).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
