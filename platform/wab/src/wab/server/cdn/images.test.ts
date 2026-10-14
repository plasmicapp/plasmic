import { uploadFileToS3 } from "@/wab/server/cdn/images";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import sharp from "sharp";

const mockUploadDone = vi.fn();
vi.mock("@aws-sdk/lib-storage", () => ({
  Upload: vi.fn().mockImplementation(function () {
    return { done: mockUploadDone };
  }),
}));
vi.mock("@/wab/server/util/s3-util", () => ({
  makeS3Client: vi.fn(),
}));

async function makeJpeg() {
  return sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("uploadFileToS3", () => {
  beforeEach(() => {
    mockUploadDone.mockReset();
    mockUploadDone.mockResolvedValue({ Location: "https://s3/x.jpg" });
  });

  it("uploads a valid jpeg", async () => {
    const result = await uploadFileToS3(await makeJpeg());
    expect(result.isOk()).toBe(true);
    expect(mockUploadDone).toHaveBeenCalledTimes(1);
  });

  it("rejects a truncated jpeg as a bad request without uploading", async () => {
    const jpeg = await makeJpeg();
    const result = await uploadFileToS3(jpeg.subarray(0, jpeg.length / 2));
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(BadRequestError);
    expect(mockUploadDone).not.toHaveBeenCalled();
  });
});
