import L from "lodash";
import {
  PlasmicConfig,
  PlasmicContext,
  getContext,
  updateConfig,
} from "../utils/config-utils";
import { StyleTokensMap } from "../api";
import {
  writeFileContent,
  readFileContent,
  fileExists,
  fixAllFilePaths,
  readFileText,
} from "../utils/file-utils";
import { CommonArgs } from "..";
import fs from "fs";
import pako from "pako";

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
}

export async function uploadJsBundle(opts: UploadBundleArgs) {
  const context = getContext(opts);
  fixAllFilePaths(context);

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
      : undefined
  );
}
