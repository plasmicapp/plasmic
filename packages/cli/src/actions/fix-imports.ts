import { CommonArgs } from "..";
import { GLOBAL_SETTINGS } from "../globals";
import { fixAllImportStatements } from "../utils/code-utils";
import { updateConfig } from "../utils/config-utils";
import { getContext } from "../utils/get-context";

export interface FixImportsArgs extends CommonArgs {
  skipFormatting?: boolean;
}
export async function fixImports(opts: FixImportsArgs) {
  if (!opts.baseDir) opts.baseDir = process.cwd();
  if (opts.skipFormatting) {
    GLOBAL_SETTINGS.skipFormatting = true;
  }
  const context = await getContext(opts, { enableSkipAuth: true });
  await updateConfig(context, context.config, opts.baseDir);
  await fixAllImportStatements(context, opts.baseDir);
}
