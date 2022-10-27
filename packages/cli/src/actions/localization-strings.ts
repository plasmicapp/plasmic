import chalk from "chalk";
import { pick } from "lodash";
import { CommonArgs } from "..";
import { PlasmicApi, ProjectIdAndToken } from "../api";
import { logger } from "../deps";
import { HandledError } from "../lib";
import { getCurrentAuth, getOrStartAuth } from "../utils/auth-utils";
import {
  DEFAULT_HOST,
  findConfigFile,
  PlasmicContext,
} from "../utils/config-utils";
import { existsBuffered, writeFileText } from "../utils/file-utils";
import { getContext } from "../utils/get-context";
import { confirmWithUser } from "../utils/user-utils";

export interface LocalizationStringsArgs extends CommonArgs {
  host: string;
  projects: readonly string[];
  projectTokens?: readonly string[];
  format: "po" | "json" | "lingui";
  output: string;
  forceOverwrite: boolean;
}

export async function localizationStrings(
  opts: LocalizationStringsArgs
): Promise<void> {
  if (!opts.projects || opts.projects.length === 0) {
    throw new HandledError(`Missing projects.`);
  }
  if (!opts.baseDir) opts.baseDir = process.cwd();
  const parsedProjectTokens: ProjectIdAndToken[] = (
    opts.projectTokens ?? []
  ).map((val) => {
    const [projectId, projectApiToken] = val.split(":");
    if (!projectId || !projectApiToken) {
      throw new Error(
        `Invalid value passed to '--project-tokens': ${val}\nPlease provide the API tokens with the format PROJECT_ID:PROJECT_API_TOKEN`
      );
    }
    return {
      projectId: projectId.trim(),
      projectApiToken: projectApiToken.trim(),
    };
  });
  const output = !opts.output
    ? opts.format === "po"
      ? "data.po"
      : "data.json"
    : opts.output;
  const projectTokensFromConfig: ProjectIdAndToken[] = [];
  const auth = await getCurrentAuth(opts.auth);
  const maybeConfigFile =
    opts.config || findConfigFile(opts.baseDir, { traverseParents: true });
  if (maybeConfigFile) {
    const context = await getContext(opts, { enableSkipAuth: true });
    context.config.projects.forEach((p) => {
      projectTokensFromConfig.push(pick(p, "projectId", "projectApiToken"));
    });
  }

  const projectIdsAndTokens = [
    ...parsedProjectTokens,
    ...projectTokensFromConfig,
  ].filter((v) => !!v && !!v.projectId && !!v.projectApiToken);

  if (auth || projectIdsAndTokens.length > 0) {
    const api = new PlasmicApi(
      auth ?? {
        host: DEFAULT_HOST,
        user: "",
        token: "",
      }
    );
    logger.info(
      `Generating localization strings for ${chalk.bold(
        opts.projects.join(", ")
      )}...`
    );
    const data = await api.genLocalizationStrings(
      opts.projects,
      opts.format,
      projectIdsAndTokens
    );
    if (existsBuffered(output)) {
      const overwrite = await confirmWithUser(
        `File ${output} already exists. Do you want to overwrite?`,
        opts.forceOverwrite
      );
      if (!overwrite) {
        throw new HandledError(
          `Cannot write to ${output}; file already exists.`
        );
      }
    }
    writeFileText(output, data);
    logger.info(`Localization strings have been written to ${output}`);
  } else {
    logger.error(`Missing auth information. You can follow any of the steps below to fix it:
- Run 'plasmic auth'
- Provide the project API token to 'plasmic.json'
- Or provide the project API token through '--project-tokens' flag`);
  }
}
