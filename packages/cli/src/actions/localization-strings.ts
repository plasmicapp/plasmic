import chalk from "chalk";
import { pick } from "lodash";
import { CommonArgs } from "..";
import { PlasmicApi, ProjectIdAndToken } from "../api";
import { logger } from "../deps";
import { HandledError } from "../lib";
import { getCurrentAuth } from "../utils/auth-utils";
import { DEFAULT_HOST, findConfigFile } from "../utils/config-utils";
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
  keyScheme: "content" | "hash" | "path" | undefined;
  tagPrefix: string | undefined;
  excludeDeps: boolean | undefined;
}

export function getLocalizationYargs(key: "key-scheme" | "tag-prefix") {
  if (key === "key-scheme") {
    return {
      describe:
        "What value to use as message keys; `content` uses the message content itself, `hash` uses a hash of the content, and `path` uses a a hierarchical string containing the project id, component name, element name, and related variants, and does not encode the text content in the key.  Defaults to whatever is specified in plasmic.json, or `content`",
      type: "string" as const,
      choices: ["content", "hash", "path"],
    };
  } else if (key === "tag-prefix") {
    return {
      describe:
        "By default, rich text with markup tags look like '<0>hello</0>'. If your localization framework requires num-numeric tags, then specify a prefix; for example a prefix of 'n' turns it into '<n0>hello</n0>'.",
      type: "string" as const,
    };
  } else {
    throw new Error(`Unexpected localization option ${key}`);
  }
}

export async function localizationStrings(
  opts: LocalizationStringsArgs
): Promise<void> {
  if (!opts.baseDir) {
    opts.baseDir = process.cwd();
  }

  const maybeConfigFile =
    opts.config || findConfigFile(opts.baseDir, { traverseParents: true });

  let projectSpecs = opts.projects;
  let keyScheme = opts.keyScheme;
  let tagPrefix = opts.tagPrefix;
  const projectTokensFromConfig: ProjectIdAndToken[] = [];
  if (maybeConfigFile) {
    // if plasmic.json exists, then we can derive some settings from
    // there instead.
    logger.info(`Using settings from ${maybeConfigFile}...`);
    const context = await getContext(opts, { enableSkipAuth: true });
    context.config.projects.forEach((p) => {
      projectTokensFromConfig.push(pick(p, "projectId", "projectApiToken"));
    });
    if (!projectSpecs || projectSpecs.length === 0) {
      projectSpecs = context.config.projects.map(
        (p) => p.projectId + (p.version === "latest" ? "" : `@${p.version}`)
      );
    }
    if (!keyScheme) {
      keyScheme = context.config.i18n?.keyScheme;
    }
    if (!tagPrefix) {
      tagPrefix = context.config.i18n?.tagPrefix;
    }
  }
  if (!projectSpecs || projectSpecs.length === 0) {
    throw new HandledError(`Missing projects.`);
  }
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
  const auth = await getCurrentAuth(opts.auth);

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
        projectSpecs.join(", ")
      )}...`
    );
    const data = await api.genLocalizationStrings(
      projectSpecs,
      opts.format,
      keyScheme ?? "content",
      tagPrefix,
      projectIdsAndTokens,
      opts.excludeDeps
    );
    if (existsBuffered(output)) {
      const overwrite = await confirmWithUser(
        `File ${output} already exists. Do you want to overwrite?`,
        opts.forceOverwrite || opts.yes
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
