import {
  tryGetS3CacheEntry,
  upsertS3CacheEntry,
} from "@/wab/server/util/s3-util";

const mocks = vi.hoisted(() => {
  const getObjectPromise = vi.fn();
  const putObjectPromise = vi.fn();
  const getObject = vi.fn(() => ({ promise: getObjectPromise }));
  const putObject = vi.fn(() => ({ promise: putObjectPromise }));
  return {
    getObjectPromise,
    putObjectPromise,
    getObject,
    putObject,
    // `new S3(...)`, so this has to be constructible.
    S3: vi.fn(function () {
      return { getObject, putObject };
    }),
  };
});

vi.mock("aws-sdk/clients/s3", () => ({ default: mocks.S3 }));

const CACHE = { bucket: "bucket", key: "key" };

beforeEach(() => {
  // `restoreMocks` wipes the implementations set at creation time.
  mocks.getObject.mockImplementation(() => ({
    promise: mocks.getObjectPromise,
  }));
  mocks.putObject.mockImplementation(() => ({
    promise: mocks.putObjectPromise,
  }));
  mocks.S3.mockImplementation(function () {
    return { getObject: mocks.getObject, putObject: mocks.putObject };
  });
  mocks.putObjectPromise.mockResolvedValue({});
});

function mkTimeoutError() {
  return Object.assign(new Error("S3 timeout"), { code: "TimeoutError" });
}

describe("tryGetS3CacheEntry", () => {
  it("deserializes the object body on a hit", async () => {
    mocks.getObjectPromise.mockResolvedValue({
      Body: Buffer.from(JSON.stringify({ ok: true })),
    });

    expect(
      await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse })
    ).toEqual({ ok: true });
    expect(mocks.getObject).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "key",
    });
  });

  it("returns null when the key is absent", async () => {
    mocks.getObjectPromise.mockRejectedValue({ code: "NoSuchKey" });

    expect(
      await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse })
    ).toBeNull();
  });

  it("returns null when the cached body cannot be deserialized", async () => {
    mocks.getObjectPromise.mockResolvedValue({
      Body: Buffer.from("not json"),
    });

    expect(
      await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse })
    ).toBeNull();
  });

  it("rethrows a TimeoutError instead of reporting a miss", async () => {
    mocks.getObjectPromise.mockRejectedValue(mkTimeoutError());

    await expect(
      tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse })
    ).rejects.toThrow("S3 timeout");
  });
});

describe("upsertS3CacheEntry", () => {
  const upsert = (compute: () => Promise<unknown>) =>
    upsertS3CacheEntry({
      ...CACHE,
      compute,
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    });

  it("returns the cached value without computing on a hit", async () => {
    mocks.getObjectPromise.mockResolvedValue({ Body: Buffer.from('"cached"') });
    const compute = vi.fn();

    expect(await upsert(compute)).toEqual({ data: "cached", cacheHit: true });
    expect(compute).not.toHaveBeenCalled();
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("computes and stores the value on a miss", async () => {
    mocks.getObjectPromise.mockRejectedValue({ code: "NoSuchKey" });

    expect(await upsert(async () => "computed")).toEqual({
      data: "computed",
      cacheHit: false,
    });
    expect(mocks.putObject).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "key",
      Body: '"computed"',
    });
  });

  it("recomputes when the cached body cannot be deserialized", async () => {
    mocks.getObjectPromise.mockResolvedValue({ Body: Buffer.from("not json") });

    expect(await upsert(async () => "computed")).toEqual({
      data: "computed",
      cacheHit: false,
    });
  });

  it("rethrows a TimeoutError instead of computing", async () => {
    mocks.getObjectPromise.mockRejectedValue(mkTimeoutError());
    const compute = vi.fn();

    await expect(upsert(compute)).rejects.toThrow("S3 timeout");
    expect(compute).not.toHaveBeenCalled();
  });

  it("still returns the computed value when the write fails outside production", async () => {
    mocks.getObjectPromise.mockRejectedValue({ code: "NoSuchKey" });
    mocks.putObjectPromise.mockRejectedValue(new Error("AccessDenied"));

    expect(await upsert(async () => "computed")).toEqual({
      data: "computed",
      cacheHit: false,
    });
  });

  it("rethrows a failed write in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.getObjectPromise.mockRejectedValue({ code: "NoSuchKey" });
    mocks.putObjectPromise.mockRejectedValue(new Error("AccessDenied"));

    await expect(upsert(async () => "computed")).rejects.toThrow(
      "AccessDenied"
    );
    vi.unstubAllEnvs();
  });
});
