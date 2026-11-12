import { MultiOAuth2Strategy } from "@/wab/server/util/passport-multi-oauth2";
import { ForbiddenError } from "@/wab/shared/ApiErrors/errors";
import { Request } from "express";

describe("MultiOAuth2Strategy", () => {
  it("forwards asynchronous option lookup errors through Passport", async () => {
    const error = new ForbiddenError("Not configured to use SSO");
    const strategy = new MultiOAuth2Strategy(
      {
        getOAuth2Options(_req, done) {
          void Promise.resolve().then(() => done(error, { provider: "okta" }));
        },
      },
      vi.fn(),
    );
    const onError = vi.fn();
    strategy.error = onError;
    strategy.authenticate({} as Request);
    await Promise.resolve();
    expect(onError).toHaveBeenCalledWith(error);
  });
});
