import { _testonly, tryGetS3CacheEntry, upsertS3CacheEntry } from "@/wab/server/util/s3-util";

const mockGetObjectPromise = jest.fn();
const mockPutObjectPromise = jest.fn();
const mockS3Instance = {
  getObject: jest.fn(),
  putObject: jest.fn(),
};

jest.mock("aws-sdk/clients/s3", () => jest.fn());

beforeEach(() => {
  // resetMocks: true clears implementations between tests — re-apply each time
  const S3 = require("aws-sdk/clients/s3");
  S3.mockImplementation(() => mockS3Instance);
  mockS3Instance.getObject.mockReturnValue({ promise: mockGetObjectPromise });
  mockS3Instance.putObject.mockReturnValue({ promise: mockPutObjectPromise });
  _testonly.resetS3Client();
});

describe("tryGetS3CacheEntry", () => {
  it("returns deserialized value on cache hit", async () => {
    mockGetObjectPromise.mockResolvedValue({
      Body: Buffer.from(JSON.stringify({ ok: true })),
    });
    const result = await tryGetS3CacheEntry({
      bucket: "b",
      key: "k",
      deserialize: JSON.parse,
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns null on cache miss", async () => {
    mockGetObjectPromise.mockRejectedValue({ code: "NoSuchKey" });
    const result = await tryGetS3CacheEntry({
      bucket: "b",
      key: "k",
      deserialize: JSON.parse,
    });
    expect(result).toBeNull();
  });

  it("returns null on other S3 errors", async () => {
    mockGetObjectPromise.mockRejectedValue(new Error("AccessDenied"));
    const result = await tryGetS3CacheEntry({
      bucket: "b",
      key: "k",
      deserialize: JSON.parse,
    });
    expect(result).toBeNull();
  });

  it("rethrows TimeoutError", async () => {
    const err = Object.assign(new Error("S3 timeout"), { code: "TimeoutError" });
    mockGetObjectPromise.mockRejectedValue(err);
    await expect(
      tryGetS3CacheEntry({ bucket: "b", key: "k", deserialize: JSON.parse })
    ).rejects.toThrow("S3 timeout");
  });
});

describe("upsertS3CacheEntry", () => {
  it("returns deserialized value on cache hit without calling compute", async () => {
    mockGetObjectPromise.mockResolvedValue({
      Body: Buffer.from('"cached"'),
    });
    const compute = jest.fn();
    const result = await upsertS3CacheEntry({
      bucket: "b",
      key: "k",
      compute,
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    });
    expect(result).toBe("cached");
    expect(compute).not.toHaveBeenCalled();
  });

  it("computes and stores value on cache miss", async () => {
    mockGetObjectPromise.mockRejectedValue({ code: "NoSuchKey" });
    mockPutObjectPromise.mockResolvedValue({});
    const result = await upsertS3CacheEntry({
      bucket: "b",
      key: "k",
      compute: async () => "computed",
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    });
    expect(result).toBe("computed");
    expect(mockPutObjectPromise).toHaveBeenCalled();
  });

  it("rethrows TimeoutError", async () => {
    const err = Object.assign(new Error("S3 timeout"), { code: "TimeoutError" });
    mockGetObjectPromise.mockRejectedValue(err);
    await expect(
      upsertS3CacheEntry({
        bucket: "b",
        key: "k",
        compute: async () => "x",
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      })
    ).rejects.toThrow("S3 timeout");
  });
});

describe("_testonly.resetS3Client", () => {
  it("forces a new S3 instance to be created on next call", async () => {
    const S3 = require("aws-sdk/clients/s3");
    mockGetObjectPromise.mockResolvedValue({ Body: Buffer.from('"a"') });

    await tryGetS3CacheEntry({ bucket: "b", key: "k", deserialize: JSON.parse });
    const beforeReset = S3.mock.instances.length;

    _testonly.resetS3Client();
    await tryGetS3CacheEntry({ bucket: "b", key: "k", deserialize: JSON.parse });

    expect(S3.mock.instances.length).toBe(beforeReset + 1);
  });
});
