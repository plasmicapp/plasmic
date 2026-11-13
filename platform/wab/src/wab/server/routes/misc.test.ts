import { getClip } from "@/wab/server/routes/misc";
import { NotFoundError } from "@/wab/shared/ApiErrors/errors";
import { NoSuchKey } from "@aws-sdk/client-s3";
import { Request, Response } from "express-serve-static-core";
import { mock, mockDeep } from "vitest-mock-extended";

const send = vi.hoisted(() => vi.fn());
vi.mock("@/wab/server/util/s3-util", () => ({
  makeS3Client: () => ({ send }),
}));

describe("getClip", () => {
  const req = mockDeep<Request>({
    params: { clipId: "test-clip" },
  });
  const res = mock<Response>();

  beforeEach(() => vi.clearAllMocks());

  it("returns the clip content", async () => {
    send.mockResolvedValue({
      Body: { transformToString: async () => "clip data" },
    });
    await getClip(req, res);
    expect(res.json).toHaveBeenCalledWith({ content: "clip data" });
  });

  it("maps a missing S3 key to a 404", async () => {
    send.mockRejectedValue(
      new NoSuchKey({ message: "Missing", $metadata: { httpStatusCode: 404 } }),
    );
    await expect(getClip(req, res)).rejects.toThrow(NotFoundError);
    expect(res.json).not.toHaveBeenCalled();
    expect(req.analytics.track).not.toHaveBeenCalled();
  });

  it("preserves infrastructure failures", async () => {
    const error = Object.assign(new Error("Access denied"), {
      name: "AccessDenied",
    });
    send.mockRejectedValue(error);
    await expect(getClip(req, res)).rejects.toBe(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
