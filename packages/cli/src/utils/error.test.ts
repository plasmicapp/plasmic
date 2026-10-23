import { describe, expect, it } from "vitest";
import { HandledError, sentryBeforeSend } from "./error";

describe("sentryBeforeSend", () => {
  const event = (type: string) => ({ exception: { values: [{ type }] } });

  it("drops HandledError passed as the original exception", () => {
    const err = new HandledError("Unable to authenticate Plasmic.");
    expect(sentryBeforeSend(event("Error"), { originalException: err })).toBe(
      null,
    );
  });

  it("drops HandledError from an unhandled rejection (original is the promise)", () => {
    const promise = Promise.resolve();
    expect(
      sentryBeforeSend(event(new HandledError("x").name), {
        originalException: promise as any,
      }),
    ).toBe(null);
  });

  it("drops EPIPE", () => {
    const err = Object.assign(new Error("write EPIPE"), { code: "EPIPE" });
    expect(sentryBeforeSend(event("Error"), { originalException: err })).toBe(
      null,
    );
  });

  it("keeps other errors", () => {
    const e = event("TypeError");
    expect(
      sentryBeforeSend(e, { originalException: new TypeError("boom") }),
    ).toBe(e);
    expect(sentryBeforeSend(e)).toBe(e);
  });
});
