import { getE2eDevFlags } from "@/wab/server/e2e-devflags";
import { E2E_DEVFLAGS_COOKIE_NAME } from "@/wab/shared/e2e";
import type { Request } from "express-serve-static-core";

function fakeReq(opts: {
  production: boolean;
  cookies: Record<string, string>;
}): Request {
  return {
    config: { production: opts.production },
    cookies: opts.cookies,
  } as unknown as Request;
}

describe("getE2eDevFlags", () => {
  it("returns the overrides in dev when the cookie is present", () => {
    const flags = getE2eDevFlags(
      fakeReq({
        production: false,
        cookies: { [E2E_DEVFLAGS_COOKIE_NAME]: "1" },
      }),
    );
    expect(flags?.e2eDevFlagsApplied).toBe(true);
  });

  it("applies a test's own flags from a JSON cookie over the defaults", () => {
    const flags = getE2eDevFlags(
      fakeReq({
        production: false,
        cookies: {
          [E2E_DEVFLAGS_COOKIE_NAME]: JSON.stringify({
            branching: false,
            hostLessComponents: [],
          }),
        },
      }),
    );
    expect(flags?.e2eDevFlagsApplied).toBe(true);
    expect(flags?.branching).toBe(false);
    // Arrays replace, so a test declaring its packages sees only those.
    expect(flags?.hostLessComponents).toEqual([]);
  });

  it("returns undefined in dev without the cookie", () => {
    expect(
      getE2eDevFlags(fakeReq({ production: false, cookies: {} })),
    ).toBeUndefined();
  });

  it("returns undefined in production even with the cookie", () => {
    expect(
      getE2eDevFlags(
        fakeReq({
          production: true,
          cookies: { [E2E_DEVFLAGS_COOKIE_NAME]: "1" },
        }),
      ),
    ).toBeUndefined();
  });
});
