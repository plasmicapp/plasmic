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

export interface UploadBundleArgs extends CommonArgs {
  project: string;
  bundleName: string;
  bundleJsFile: string;
  cssFiles: readonly string[];
  metaJsonFile: string;
  genModulePath?: string;
  genCssPaths: string[];
  pkgVersion?: string;
}

export async function uploadJsBundle(opts: UploadBundleArgs) {
  const context = getContext(opts);
  fixAllFilePaths(context);

  const api = context.api;
  await api.uploadBundle(
    opts.project,
    opts.bundleName,
    readFileText(opts.bundleJsFile),
    opts.cssFiles.map((f) => readFileText(f)),
    readFileText(opts.metaJsonFile),
    opts.genModulePath,
    opts.genCssPaths,
    opts.pkgVersion
  );
}
