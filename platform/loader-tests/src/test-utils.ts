/// <reference types="@types/jest" />
import S3 from "aws-sdk/clients/s3";
import cypress from "cypress";
import fs from "fs";
import glob from "glob";
import path from "path";
import process from "process";

export async function runCypressTest(opts: {
  name: string;
  spec: string;
  baseUrl: string;
  env?: Record<string, string>;
}) {
  const { name, spec, baseUrl, env } = opts;
  const diffOutputDir = path.join(
    ".",
    "cypress",
    "snapshots",
    name,
    "__diff_output__"
  );
  if (process.env.CYPRESS_OPEN) {
    await cypress.open({
      browser: "chrome",
      config: {
        baseUrl,
        videoCompression: false,
      } as any,
      env: {
        ...env,
        TEST_NAME: name,
        DIFF_OUTPUT_DIR: diffOutputDir,
      },
    });
  } else {
    const result = await cypress.run({
      browser: "chrome",
      headless: process.env.CYPRESS_HEADLESS === "false" ? false : true,
      config: {
        baseUrl,
        videoCompression: false,
      } as any,
      env: {
        ...env,
        TEST_NAME: name,
        DIFF_OUTPUT_DIR: diffOutputDir,
      },
      spec,
    });

    const diffFiles = glob.sync(`${diffOutputDir}/**/*.png`);

    if (result.status === "failed" && diffFiles.length > 0) {
      console.log("Diff files", diffFiles);
      const s3 = new S3({
        endpoint: process.env.S3_ENDPOINT,
      });
      for (const diffFile of diffFiles) {
        const { Location } = await s3
          .upload({
            Bucket: "plasmic-cypress",
            Key: `${
              process.env["BUILD_NUMBER"] ?? "local"
            }/loader-tests/${diffFile}`,
            Body: fs.readFileSync(diffFile),
            ContentType: "image/png",
            ACL: "public-read",
          })
          .promise();
        console.log(`Diff: ${Location}`);
      }
    }

    expect(result.status).toEqual("finished");
    if (result.status === "finished") {
      expect(result.totalFailed).toEqual(0);
    }
  }
}
