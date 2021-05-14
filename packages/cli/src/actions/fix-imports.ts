import { CommonArgs } from "..";
import { fixAllImportStatements } from "../utils/code-utils";
import { fixAllFilePaths } from "../utils/file-utils";
import { getContext } from "../utils/get-context";

export interface FixImportsArgs extends CommonArgs {}
export async function fixImports(opts: FixImportsArgs) {
  if (!opts.baseDir) opts.baseDir = process.cwd();
  const context = await getContext(opts, { enableSkipAuth: true });

  await fixAllFilePaths(context, opts.baseDir);
  await fixAllImportStatements(context, opts.baseDir);
}
