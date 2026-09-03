/** @vitest-environment node */
import { checkEtagSkippable } from "@/wab/server/routes/loader";

describe("checkEtagSkippable", () => {
  it("keeps preview cache headers for uptime checks without returning 304", () => {
    const req = {
      devflags: {
        disableETagCaching: false,
      },
      headers: {
        "x-plasmic-uptime-check": "1",
        "if-none-match": 'W/"preview-etag"',
      },
    } as any;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;

    expect(checkEtagSkippable(req, res, 'W/"preview-etag"')).toBe(false);
    expect(res.setHeader).toHaveBeenCalledWith("ETag", 'W/"preview-etag"');
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "max-age=5");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
