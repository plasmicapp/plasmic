import {
  makeS3Client,
  tryGetS3CacheEntry,
  uploadFilesToS3,
  upsertS3CacheEntry,
} from "@/wab/server/util/s3-util";

const mocks = vi.hoisted(() => {
  const getObjectPromise = vi.fn();
  const putObjectPromise = vi.fn();
  // v3 dispatches every operation through `send(command)`, so the operation is
  // identified by the command instance rather than by the method called.
  const getObject = vi.fn();
  const putObject =
    vi.fn<(request: { Bucket: string; Key: string; Body: string }) => void>();
  const GetObjectCommand = vi.fn(function (input) {
    getObject(input);
    return { __type: "GetObject", input };
  });
  const PutObjectCommand = vi.fn(function (input) {
    putObject(input);
    return { __type: "PutObject", input };
  });
  const send = vi.fn((command) =>
    command.__type === "GetObject" ? getObjectPromise() : putObjectPromise(),
  );
  return {
    getObjectPromise,
    putObjectPromise,
    getObject,
    putObject,
    send,
    GetObjectCommand,
    PutObjectCommand,
    S3Client: vi.fn(function () {
      return { send };
    }),
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: mocks.S3Client,
  GetObjectCommand: mocks.GetObjectCommand,
  PutObjectCommand: mocks.PutObjectCommand,
}));

const CACHE = { bucket: "bucket", key: "key" };

beforeEach(() => {
  makeS3Client.cache.clear?.();
  vi.clearAllMocks();
  // `restoreMocks` wipes the implementations set at creation time.
  mocks.GetObjectCommand.mockImplementation(function (input) {
    mocks.getObject(input);
    return { __type: "GetObject", input };
  });
  mocks.PutObjectCommand.mockImplementation(function (input) {
    mocks.putObject(input);
    return { __type: "PutObject", input };
  });
  mocks.send.mockImplementation((command) =>
    command.__type === "GetObject"
      ? mocks.getObjectPromise()
      : mocks.putObjectPromise(),
  );
  mocks.S3Client.mockImplementation(function () {
    return { send: mocks.send };
  });
  mocks.putObjectPromise.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function mkTimeoutError() {
  return Object.assign(new Error("S3 timeout"), { name: "TimeoutError" });
}

/** v3 bodies are streams, exposing transformToString rather than a Buffer. */
function mkBody(content: string) {
  return { transformToString: async () => content };
}

describe("makeS3Client", () => {
  it.each([
    [undefined, undefined],
    ["https://storage.googleapis.com", "WHEN_REQUIRED"],
  ])(
    "preserves the v2 region fallback with endpoint %s",
    (endpoint, requestChecksumCalculation) => {
      vi.stubEnv("S3_ENDPOINT", endpoint);
      vi.stubEnv("AWS_REGION", undefined);

      makeS3Client();

      expect(mocks.S3Client).toHaveBeenCalledWith({
        endpoint,
        region: "us-east-1",
        requestChecksumCalculation,
      });
    },
  );

  it("uses the configured AWS region", () => {
    vi.stubEnv("S3_ENDPOINT", undefined);
    vi.stubEnv("AWS_REGION", "eu-west-1");

    makeS3Client();

    expect(mocks.S3Client).toHaveBeenCalledWith({
      endpoint: undefined,
      region: "eu-west-1",
      requestChecksumCalculation: undefined,
    });
  });

  it("reuses one client for cache reads and concurrent writes", async () => {
    mocks.getObjectPromise.mockRejectedValue({ name: "NoSuchKey" });
    await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse });
    await uploadFilesToS3({ ...CACHE, files: { "a.tsx": "a", "b.tsx": "b" } });

    expect(makeS3Client()).toBe(makeS3Client());
    expect(mocks.S3Client).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledTimes(3);
  });
});

describe("tryGetS3CacheEntry", () => {
  it("reports a miss without reading when BYPASS_S3_CACHE is set", async () => {
    vi.stubEnv("BYPASS_S3_CACHE", "1");

    expect(
      await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse }),
    ).toBeNull();
    expect(mocks.S3Client).not.toHaveBeenCalled();
  });

  it("deserializes the object body on a hit", async () => {
    mocks.getObjectPromise.mockResolvedValue({
      Body: mkBody(JSON.stringify({ ok: true })),
    });

    expect(
      await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse }),
    ).toEqual({ ok: true });
    expect(mocks.getObject).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "key",
    });
  });

  it("returns null when the key is absent", async () => {
    mocks.getObjectPromise.mockRejectedValue({ name: "NoSuchKey" });

    expect(
      await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse }),
    ).toBeNull();
  });

  it("returns null when the cached body cannot be deserialized", async () => {
    mocks.getObjectPromise.mockResolvedValue({
      Body: mkBody("not json"),
    });

    expect(
      await tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse }),
    ).toBeNull();
  });

  it("rethrows a TimeoutError instead of reporting a miss", async () => {
    mocks.getObjectPromise.mockRejectedValue(mkTimeoutError());

    await expect(
      tryGetS3CacheEntry({ ...CACHE, deserialize: JSON.parse }),
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

  it("computes without reading or writing when BYPASS_S3_CACHE is set", async () => {
    vi.stubEnv("BYPASS_S3_CACHE", "1");
    const compute = vi.fn(async () => "computed");

    expect(await upsert(compute)).toEqual({
      data: "computed",
      cacheHit: false,
    });
    expect(compute).toHaveBeenCalledOnce();
    expect(mocks.S3Client).not.toHaveBeenCalled();
  });

  it("returns the cached value without computing on a hit", async () => {
    mocks.getObjectPromise.mockResolvedValue({ Body: mkBody('"cached"') });
    const compute = vi.fn();

    expect(await upsert(compute)).toEqual({ data: "cached", cacheHit: true });
    expect(compute).not.toHaveBeenCalled();
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("computes and stores the value on a miss", async () => {
    mocks.getObjectPromise.mockRejectedValue({ name: "NoSuchKey" });

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
    mocks.getObjectPromise.mockResolvedValue({ Body: mkBody("not json") });

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
    mocks.getObjectPromise.mockRejectedValue({ name: "NoSuchKey" });
    mocks.putObjectPromise.mockRejectedValue(new Error("AccessDenied"));

    expect(await upsert(async () => "computed")).toEqual({
      data: "computed",
      cacheHit: false,
    });
  });

  it("rethrows a failed write in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.getObjectPromise.mockRejectedValue({ name: "NoSuchKey" });
    mocks.putObjectPromise.mockRejectedValue(new Error("AccessDenied"));

    await expect(upsert(async () => "computed")).rejects.toThrow(
      "AccessDenied",
    );
  });
});

describe("uploadFilesToS3", () => {
  const upload = () =>
    uploadFilesToS3({ ...CACHE, files: { "a.tsx": "a", "b.tsx": "b" } });

  it("puts one object per file", async () => {
    await upload();

    expect(mocks.putObject.mock.calls.map(([{ Key }]) => Key)).toEqual([
      "key/a.tsx",
      "key/b.tsx",
    ]);
  });

  it("uploads nothing when BYPASS_S3_CACHE is set", async () => {
    vi.stubEnv("BYPASS_S3_CACHE", "1");

    await upload();

    expect(mocks.S3Client).not.toHaveBeenCalled();
  });
});
