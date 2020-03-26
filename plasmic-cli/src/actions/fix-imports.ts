import path from "path";
import { CommonArgs } from "..";
import { getContext, updateConfig } from "../utils/config-utils";
import { buildBaseNameToFiles, fixComponentPaths } from "../utils/file-utils";
import { fixAllImportStatements } from "../utils/code-utils";

export interface FixImportsArgs extends CommonArgs {}
export function fixImports(opts: FixImportsArgs) {
  const context = getContext(opts);
  const config = context.config;
  const srcDir = path.join(context.rootDir, config.srcDir);
  const baseNameToFiles = buildBaseNameToFiles(context);
  for (const compConfig of config.components) {
    fixComponentPaths(srcDir, compConfig, baseNameToFiles);
  }

  updateConfig(context, { components: config.components });
  fixAllImportStatements(context);
}
