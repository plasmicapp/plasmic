import { writeClipboardPlasmicData } from "@/wab/client/clipboard/common";
import * as Sentry from "@sentry/browser";

vi.mock("@sentry/browser", () => ({ captureException: vi.fn() }));

describe("writeClipboardPlasmicData", () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard",
  );

  function mockClipboardWrite(error: unknown, synchronous: boolean) {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: synchronous
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
    vi.restoreAllMocks();
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      delete (navigator as any).clipboard;
    }
  });

  it.each([false, true])(
    "does not report a denied clipboard write (sync: %s)",
    async (synchronous) => {
      mockClipboardWrite(
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
      mockClipboardWrite(error, synchronous);
      writeClipboardPlasmicData("{}");
      await vi.waitFor(() =>
        expect(Sentry.captureException).toHaveBeenCalledWith(error),
      );
    },
  );
});
