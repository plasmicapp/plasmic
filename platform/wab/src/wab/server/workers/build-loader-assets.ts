import { spawnWrapper } from "@/wab/common";
import {
  bundleModules,
  LoaderBundleOutput,
} from "@/wab/server/loader/module-bundler";
import { writeCodeBundlesToDisk } from "@/wab/server/loader/module-writer";
import tmp from "tmp";
import { CodegenOutputBundle } from "./codegen";

export async function workerBuildAssets(
  codegenOutputs: CodegenOutputBundle[],
  componentDeps: Record<string, string[]>,
  platform: "react" | "nextjs" | "gatsby",
  opts: {
    mode: "production" | "development";
    loaderVersion: number;
    browserOnly: boolean;
    preferEsbuild: boolean;
    cacheableQuery?: string;
  }
) {
  return new Promise<LoaderBundleOutput>((resolve, reject) => {
    // We create a temporary folder for writing generated code files
    tmp.dir(
      {
        unsafeCleanup: true,
      },
      spawnWrapper(async (err, dir, cleanup) => {
        if (err) {
          reject(err);
        } else {
          try {
            console.log("Building worker assets in", dir);
            await writeCodeBundlesToDisk(dir, codegenOutputs);
            const result = await bundleModules(
              dir,
              codegenOutputs,
              componentDeps,
              {
                platform,
                mode: opts.mode,
                loaderVersion: opts.loaderVersion,
                browserOnly: opts.browserOnly,
                cacheableQuery: opts.cacheableQuery,
              },
              opts.preferEsbuild
            );
            resolve(result);
            cleanup();
          } catch (err2) {
            // Don't clean up on error, to allow investigating
            console.error(`Error bundling in ${dir}:`, err2);
            reject(err2);
          }
        }
      })
    );
  });
}
