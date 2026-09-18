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
