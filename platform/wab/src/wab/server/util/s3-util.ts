import { logger } from "@/wab/server/observability";
import { ensureInstance } from "@/wab/shared/common";
import S3 from "aws-sdk/clients/s3";
import path from "path";

let _s3: S3 | undefined;
function getS3Client(): S3 {
  return (_s3 ??= new S3({ endpoint: process.env.S3_ENDPOINT }));
}

export async function tryGetS3CacheEntry<T>(opts: {
  bucket: string;
  key: string;
  deserialize: (str: string) => T;
}): Promise<T | null> {
  const { bucket, key, deserialize } = opts;
  const s3 = getS3Client();
  try {
    const obj = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    const serialized = ensureInstance(obj.Body, Buffer).toString("utf8");
    logger().info(`S3 cache hit for ${bucket} ${key}`);
    return deserialize(serialized);
  } catch (err) {
    if (err.code === "TimeoutError") {
      throw err;
    }
    return null;
  }
}

export async function upsertS3CacheEntry<T>(opts: {
  bucket: string;
  key: string;
  compute: () => Promise<T>;
  serialize: (obj: T) => string;
  deserialize: (str: string) => T;
}) {
  const { bucket, key, compute: f, serialize, deserialize } = opts;
  const s3 = getS3Client();

  try {
    const obj = await s3
      .getObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
    const serialized = ensureInstance(obj.Body, Buffer).toString("utf8");
    logger().info(`S3 cache hit for ${bucket} ${key}`);
    const data = deserialize(serialized);
    return data;
  } catch (err) {
    if (err.code === "TimeoutError") {
      throw err;
    }
    logger().info(`S3 cache miss for ${bucket} ${key}; computing`);
    const content = await f();
    const serialized = serialize(content);
    try {
      await s3
        .putObject({
          Bucket: bucket,
          Key: key,
          Body: serialized,
        })
        .promise();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        throw e;
      }
      logger().error("Unable to add content to S3", e as any);
    }
    return content;
  }
}

export const _testonly = {
  resetS3Client: () => {
    _s3 = undefined;
  },
};

export async function uploadFilesToS3(opts: {
  bucket: string;
  key: string;
  files: Record<string, string>;
}) {
  const { bucket, key, files } = opts;
  const s3 = getS3Client();
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      await s3
        .putObject({
          Bucket: bucket,
          Key: path.join(key, file),
          Body: content,
        })
        .promise();
    })
  );
}
