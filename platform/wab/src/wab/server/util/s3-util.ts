import { ensureInstance } from "@/wab/shared/common";
import S3 from "aws-sdk/clients/s3";
import path from "path";

export async function upsertS3CacheEntry<T>(opts: {
  bucket: string;
  key: string;
  compute: () => Promise<T>;
  serialize: (obj: T) => string;
  deserialize: (str: string) => T;
}) {
  const { bucket, key, compute: f, serialize, deserialize } = opts;
  const s3 = new S3({ accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY, endpoint: process.env.S3_ENDPOINT, sslEnabled: process.env.S3_SSL_ENABLED, s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE, region: process.env.S3_REGION, });

  try {
    const obj = await s3
      .getObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
    const serialized = ensureInstance(obj.Body, Buffer).toString("utf8");
    console.log(`S3 cache hit for ${bucket} ${key}`);
    const data = deserialize(serialized);
    return data;
  } catch (err) {
    if (err.code === "TimeoutError") {
      throw err;
    }
    console.log(`S3 cache miss for ${bucket} ${key}; computing`);
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
      if (process.env.NODE_ENV !== "development") {
        throw e;
      }
      console.error("Unable to add content to S3", e);
    }
    return content;
  }
}

export async function uploadFilesToS3(opts: {
  bucket: string;
  key: string;
  files: Record<string, string>;
}) {
  const { bucket, key, files } = opts;
  const s3 = new S3({ accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY, endpoint: process.env.S3_ENDPOINT, sslEnabled: process.env.S3_SSL_ENABLED, s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE, region: process.env.S3_REGION, });
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
