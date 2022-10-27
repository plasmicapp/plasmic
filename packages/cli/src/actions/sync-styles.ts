import { StyleTokensMap } from "../api";
import { PlasmicContext } from "../utils/config-utils";
import { HandledError } from "../utils/error";
import {
  fileExists,
  readFileContent,
  writeFileContent,
} from "../utils/file-utils";

export async function upsertStyleTokens(
  context: PlasmicContext,
  newStyleMap: StyleTokensMap,
  projectId: string
) {
  const curStyleMap = await readCurStyleMap(context);
  for (const prop of newStyleMap.props) {
    const index = curStyleMap.props.findIndex(
      (p) => p.meta.id === prop.meta.id
    );
    if (index >= 0) {
      curStyleMap.props[index] = prop;
    } else {
      curStyleMap.props.push(prop);
    }
  }
  const allNewPropIds = new Set(newStyleMap.props.map((prop) => prop.meta.id));
  curStyleMap.props = curStyleMap.props.filter((prop) => {
    if (prop.meta.projectId !== projectId) {
      // Keep all tokens from other projects
      return true;
    }
    if (allNewPropIds.has(prop.meta.id)) {
      // Keep the current tokens in this project
      return true;
    }
    // Delete the tokens that have been removed from the project
    return false;
  });
  curStyleMap.props.sort((prop1, prop2) =>
    prop1.name === prop2.name ? 0 : prop1.name < prop2.name ? -1 : 1
  );
  await writeFileContent(
    context,
    context.config.tokens.tokensFilePath,

    JSON.stringify(curStyleMap, undefined, 2),

    { force: true }
  );
}

async function readCurStyleMap(
  context: PlasmicContext
): Promise<StyleTokensMap> {
  const filePath = context.config.tokens.tokensFilePath;
  if (fileExists(context, filePath)) {
    try {
      return JSON.parse(
        readFileContent(context, context.config.tokens.tokensFilePath)
      );
    } catch (e) {
      throw new HandledError(
        `Error encountered reading ${context.config.tokens.tokensFilePath}: ${e}`
      );
    }
  } else {
    const defaultMap = {
      props: [],
      global: {
        meta: {
          source: "plasmic.app",
        },
      },
    } as StyleTokensMap;
    await writeFileContent(
      context,
      context.config.tokens.tokensFilePath,
      JSON.stringify(defaultMap, undefined, 2),
      {
        force: false,
      }
    );
    return defaultMap;
  }
}
