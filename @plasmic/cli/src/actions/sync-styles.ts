import L from "lodash";
import { PlasmicConfig, getContext, updateConfig } from "../utils/config-utils";
import { StyleTokensMap } from "../api";
import {
  writeFileContent,
  findSrcDirPath,
  buildBaseNameToFiles,
  readFileContent,
  fileExists
} from "../utils/file-utils";
import { CommonArgs } from "..";

export interface SyncStyleTokensArgs extends CommonArgs {
  projects: readonly string[];
}

export async function syncStyleTokens(opts: SyncStyleTokensArgs) {
  const context = getContext(opts);
  const api = context.api;
  const config = context.config;

  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : L.uniq(readCurStyleMap(config).props.map(p => p.meta.projectId));

  const baseNameToFiles = buildBaseNameToFiles(context);
  const results = await Promise.all(
    projectIds.map(projectId => api.projectStyleTokens(projectId))
  );
  for (const [projectId, styleMap] of L.zip(projectIds, results) as [
    string,
    StyleTokensMap
  ][]) {
    upsertStyleTokens(config, styleMap, baseNameToFiles);
  }

  updateConfig(context, {
    tokens: config.tokens
  });
}

export function upsertStyleTokens(
  config: PlasmicConfig,
  newStyleMap: StyleTokensMap,
  baseNameToFiles: Record<string, string[]>
) {
  config.tokens.tokensFilePath = findSrcDirPath(
    config.srcDir,
    config.tokens.tokensFilePath,
    baseNameToFiles
  );
  const curStyleMap = readCurStyleMap(config);
  for (const prop of newStyleMap.props) {
    const index = curStyleMap.props.findIndex(p => p.meta.id === prop.meta.id);
    if (index >= 0) {
      curStyleMap.props[index] = prop;
    } else {
      curStyleMap.props.push(prop);
    }
  }
  writeFileContent(
    config,
    config.tokens.tokensFilePath,
    JSON.stringify(curStyleMap, undefined, 2),
    { force: true }
  );
}

function readCurStyleMap(config: PlasmicConfig): StyleTokensMap {
  const filePath = config.tokens.tokensFilePath;
  if (fileExists(config, filePath)) {
    try {
      return JSON.parse(readFileContent(config, config.tokens.tokensFilePath));
    } catch (e) {
      console.log(
        `Error countered reading ${config.tokens.tokensFilePath}: ${e}`
      );
      process.exit(1);
    }
  } else {
    const defaultMap = {
      props: [],
      global: {
        meta: {
          source: "plasmic.app"
        }
      }
    } as StyleTokensMap;
    writeFileContent(
      config,
      config.tokens.tokensFilePath,
      JSON.stringify(defaultMap, undefined, 2),
      { force: false }
    );
    return defaultMap;
  }
}
