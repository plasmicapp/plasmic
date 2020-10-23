import { CommonArgs } from "..";
import { getContext } from "../utils/config-utils";
import { fixAllImportStatements } from "../utils/code-utils";
import { fixAllFilePaths } from "../utils/file-utils";

export interface FixImportsArgs extends CommonArgs {}
export function fixImports(opts: FixImportsArgs) {
  const context = getContext(opts);

  fixAllFilePaths(context);
  fixAllImportStatements(context);
}
