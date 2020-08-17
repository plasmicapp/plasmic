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
} from "../utils/file-utils";
import { CommonArgs } from "..";
import { formatAsLocal } from "../utils/code-utils";
import { logger } from "../deps";
import * as semver from "../utils/semver";

export interface SyncStyleTokensArgs extends CommonArgs {
  projects: readonly string[];
}

export async function syncStyleTokens(opts: SyncStyleTokensArgs) {
  const context = getContext(opts);
  fixAllFilePaths(context);

  const api = context.api;
  const config = context.config;

  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : L.uniq(readCurStyleMap(context).props.map((p) => p.meta.projectId));

  const getVersionRange = (projectId: string) => {
    const projectConfig = context.config.projects.find(
      (x) => x.projectId === projectId
    );
    return projectConfig?.version ?? semver.latestTag;
  };

  const results = await Promise.all(
    projectIds.map((projectId) =>
      api.projectStyleTokens(projectId, getVersionRange(projectId))
    )
  );
  for (const [projectId, styleMap] of L.zip(projectIds, results) as [
    string,
    StyleTokensMap
  ][]) {
    upsertStyleTokens(context, styleMap);
  }

  updateConfig(context, {
    tokens: config.tokens,
  });
}

export function upsertStyleTokens(
  context: PlasmicContext,
  newStyleMap: StyleTokensMap
) {
  const curStyleMap = readCurStyleMap(context);
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
  curStyleMap.props.sort((prop1, prop2) =>
    prop1.name === prop2.name ? 0 : prop1.name < prop2.name ? -1 : 1
  );
  writeFileContent(
    context,
    context.config.tokens.tokensFilePath,

    JSON.stringify(curStyleMap, undefined, 2),

    { force: true }
  );
}

function readCurStyleMap(context: PlasmicContext): StyleTokensMap {
  const filePath = context.config.tokens.tokensFilePath;
  if (fileExists(context, filePath)) {
    try {
      return JSON.parse(
        readFileContent(context, context.config.tokens.tokensFilePath)
      );
    } catch (e) {
      logger.error(
        `Error countered reading ${context.config.tokens.tokensFilePath}: ${e}`
      );
      process.exit(1);
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
    writeFileContent(
      context,
      context.config.tokens.tokensFilePath,
      JSON.stringify(defaultMap, undefined, 2),
      { force: false }
    );
    return defaultMap;
  }
}
