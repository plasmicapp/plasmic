import { getDataTokenType } from "@/wab/commons/DataToken";
import {
  makeDataTokensFileName,
  makePlasmicModulePrelude,
} from "@/wab/shared/codegen/react-p/serialize-utils";
import { DataTokensBundle, ExportOpts } from "@/wab/shared/codegen/types";
import { jsLiteral, toVarName } from "@/wab/shared/codegen/util";
import { stripParensAndMaybeConvertToIife } from "@/wab/shared/core/exprs";
import { siteFinalDataTokens } from "@/wab/shared/core/site-data-tokens";
import { FinalToken } from "@/wab/shared/core/tokens";
import { DataToken, Site } from "@/wab/shared/model/classes";
import type { SetRequired } from "type-fest";

/**
 * Serializes a single data token as an export statement.
 */
function serializeDataTokenExport(token: FinalToken<DataToken>): string {
  const varName = toVarName(token.name);
  const tokenType = getDataTokenType(token.value);

  if (tokenType === "code") {
    const processedCode = stripParensAndMaybeConvertToIife(token.value);
    return `export const ${varName} = (() => { try { return (${processedCode}); } catch (e) { return undefined; } })();`;
  } else {
    const parsedValue = JSON.parse(token.value);
    return `export const ${varName} = ${jsLiteral(parsedValue)};`;
  }
}

export function makeDataTokensBundle(
  site: Site,
  projectId: string,
  exportOpts: SetRequired<Partial<ExportOpts>, "targetEnv">
): DataTokensBundle | undefined {
  const localTokens = siteFinalDataTokens(site);

  if (localTokens.length === 0) {
    return undefined;
  }

  const exports = localTokens
    .map((token) => serializeDataTokenExport(token))
    .join("\n\n");

  const module = `${makePlasmicModulePrelude(projectId)}
${exports}
`;

  return {
    id: projectId,
    module,
    fileName: makeDataTokensFileName(projectId, exportOpts),
  };
}
