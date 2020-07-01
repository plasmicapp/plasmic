import L from "lodash";
import {
  PlasmicConfig,
  PlasmicContext,
  getContext,
  updateConfig
} from "../utils/config-utils";
import { StyleTokensMap } from "../api";
import {
  writeFileContent,
  readFileContent,
  fileExists,
  fixAllFilePaths
} from "../utils/file-utils";
import { CommonArgs } from "..";
import fs from "fs";

export interface UploadBundleArgs extends CommonArgs {
  project: string;
  bundleName: string;
  bundleJsFile: string;
  cssFiles: readonly string[];
  metaJsonFile: string;
}

export async function uploadJsBundle(opts: UploadBundleArgs) {
  const context = getContext(opts);
  fixAllFilePaths(context);

  const api = context.api;
  await api.uploadBundle(
    opts.project,
    opts.bundleName,
    fs.readFileSync(opts.bundleJsFile).toString(),
    opts.cssFiles.map(f => fs.readFileSync(f).toString()),
    fs.readFileSync(opts.metaJsonFile).toString()
  );
}
