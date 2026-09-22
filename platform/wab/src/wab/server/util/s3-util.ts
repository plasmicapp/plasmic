import { logger } from "@/wab/server/observability";
import { withSpan } from "@/wab/server/util/apm-util";
import { ensure } from "@/wab/shared/common";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { memoize } from "lodash";
import path from "path";

export function shouldBypassS3() {
  return Boolean(process.env.BYPASS_S3_CACHE);
}

export const makeS3Client = memoize(() => {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.AWS_REGION ?? "us-east-1",
    requestChecksumCalculation: process.env.S3_ENDPOINT
      ? "WHEN_REQUIRED"
      : undefined,
  });
});

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
  if (shouldBypassS3()) {
    return null;
  }
  const s3 = makeS3Client();
  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const serialized = await ensure(
      obj.Body,
      "Unexpected empty S3 cache entry body",
    ).transformToString("utf8");
    logger().info(`S3 cache hit for ${bucket} ${key}`);
    return deserialize(serialized);
  } catch (err) {
    if (err.name === "TimeoutError") {
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
  if (shouldBypassS3()) {
    return { data: content, cacheHit: false };
  }
  const serialized = serialize(content);
  const s3 = makeS3Client();
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: serialized,
      }),
    );
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
  if (shouldBypassS3()) {
    return;
  }
  const s3 = makeS3Client();
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path.join(key, file),
          Body: content,
        }),
      );
    }),
  );
}
