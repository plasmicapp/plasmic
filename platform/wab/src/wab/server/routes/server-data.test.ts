import { checkLegacyDataSourceOpRateLimit } from "@/wab/server/routes/server-data";
import { RateLimitedExceeded } from "@/wab/shared/ApiErrors/errors";
import { DevFlagsType } from "@/wab/shared/devflags";
import { Request, Response } from "express-serve-static-core";

function mkReq(dataSourceId: string, devflags: Partial<DevFlagsType>) {
  return {
    params: { dataSourceId },
    headers: {},
    devflags: {
      limitDataQueries: null,
      limitDataQueriesExemptDataSourceIds: [],
      ...devflags,
    },
  } as unknown as Request;
}

function mkRes() {
  return {
    headersSent: false,
    setHeader: () => {},
    getHeader: () => undefined,
    append: () => {},
  } as unknown as Response;
}

describe("checkLegacyDataSourceOpRateLimit", () => {
  it("doesn't limit when limitDataQueries is null", async () => {
    await expect(
      checkLegacyDataSourceOpRateLimit(mkReq("ds-unlimited", {}), mkRes()),
    ).resolves.toBeUndefined();
  });

  it("blocks with a limit of 0", async () => {
    await expect(
      checkLegacyDataSourceOpRateLimit(
        mkReq("ds-blocked", { limitDataQueries: 0 }),
        mkRes(),
      ),
    ).rejects.toThrow(RateLimitedExceeded);
  });

  it("doesn't limit exempt data sources", async () => {
    const devflags = {
      limitDataQueries: 0,
      limitDataQueriesExemptDataSourceIds: ["ds-exempt"],
    };
    await expect(
      checkLegacyDataSourceOpRateLimit(mkReq("ds-exempt", devflags), mkRes()),
    ).resolves.toBeUndefined();
    await expect(
      checkLegacyDataSourceOpRateLimit(mkReq("ds-other", devflags), mkRes()),
    ).rejects.toThrow(RateLimitedExceeded);
  });
});
