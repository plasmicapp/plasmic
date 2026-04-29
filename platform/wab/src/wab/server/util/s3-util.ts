import { logger } from "@/wab/server/observability";
import { withSpan } from "@/wab/server/util/apm-util";
import { ensureInstance } from "@/wab/shared/common";
import S3 from "aws-sdk/clients/s3";
import path from "path";

/**
 * Reads a cache entry, returning null when it is absent (or unreadable for any
 * reason other than a timeout, which callers must not paper over).
 */
export async function tryGetS3CacheEntry<T>(opts: {
  bucket: string;
  key: string;
  deserialize: (str: string) => T;
}): Promise<T | null> {
  const { bucket, key, deserialize } = opts;
  const s3 = new S3({ endpoint: process.env.S3_ENDPOINT });
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
}): Promise<{ data: T; cacheHit: boolean }> {
  const { bucket, key, compute: f, serialize, deserialize } = opts;

  const cached = await tryGetS3CacheEntry({ bucket, key, deserialize });
  if (cached !== null) {
    return { data: cached, cacheHit: true };
  }

  logger().info(`S3 cache miss for ${bucket} ${key}; computing`);
  const content = await withSpan("s3-cache-compute", async () => await f());
  const serialized = serialize(content);
  const s3 = new S3({ endpoint: process.env.S3_ENDPOINT });
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
  return { data: content, cacheHit: false };
}

export async function uploadFilesToS3(opts: {
  bucket: string;
  key: string;
  files: Record<string, string>;
}) {
  const { bucket, key, files } = opts;
  const s3 = new S3({ endpoint: process.env.S3_ENDPOINT });
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
