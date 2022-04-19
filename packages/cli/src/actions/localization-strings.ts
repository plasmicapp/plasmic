import chalk from "chalk";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { HandledError } from "../lib";
import { getOrStartAuth } from "../utils/auth-utils";
import { DEFAULT_HOST } from "../utils/config-utils";
import { existsBuffered, writeFileText } from "../utils/file-utils";
import { confirmWithUser } from "../utils/user-utils";

export interface LocalizationStringsArgs {
  host: string;
  projects: readonly string[];
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
  const output = !opts.output
    ? opts.format === "po"
      ? "data.po"
      : "data.json"
    : opts.output;
  const auth = await getOrStartAuth({
    baseDir: "",
    host: opts.host || DEFAULT_HOST,
  });
  if (auth) {
    const api = new PlasmicApi(auth);
    logger.info(
      `Generating localization strings for ${chalk.bold(
        opts.projects.join(", ")
      )}...`
    );
    const data = await api.genLocalizationStrings(opts.projects, opts.format);
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
    logger.error("Missing auth information");
  }
}
