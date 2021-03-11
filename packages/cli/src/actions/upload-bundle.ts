import pako from "pako";
import { CommonArgs } from "..";
import { readFileText } from "../utils/file-utils";
import { getContext } from "../utils/get-context";

export interface UploadBundleArgs extends CommonArgs {
  project: string;
  bundleName: string;
  bundleJsFile: string;
  cssFiles: readonly string[];
  metaJsonFile: string;
  genModulePath?: string;
  genCssPaths: string[];
  pkgVersion?: string;
  extraPropMetaJsonFile?: string;
  themeProviderWrapper?: string;
  themeModuleFile?: string;
}

export async function uploadJsBundle(opts: UploadBundleArgs) {
  const context = await getContext(opts);
  const api = context.api;
  await api.uploadBundle(
    opts.project,
    opts.bundleName,
    pako.deflate(readFileText(opts.bundleJsFile), { to: "string" }),
    opts.cssFiles.map((f) => pako.deflate(readFileText(f), { to: "string" })),
    pako.deflate(readFileText(opts.metaJsonFile), { to: "string" }),
    opts.genModulePath,
    opts.genCssPaths,
    opts.pkgVersion,
    opts.extraPropMetaJsonFile
      ? readFileText(opts.extraPropMetaJsonFile)
      : undefined,
    opts.themeProviderWrapper,
    opts.themeModuleFile ? readFileText(opts.themeModuleFile) : undefined
  );
}
