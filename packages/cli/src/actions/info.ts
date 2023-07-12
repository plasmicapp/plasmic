import { CommonArgs } from "..";
import { logger } from "../deps";
import { getContext } from "../utils/get-context";

export interface InfoArgs extends CommonArgs {
  projects: readonly string[];
  json?: boolean;
  host?: string;
}

export async function printProjectInfo(opts: InfoArgs): Promise<void> {
  let context = await getContext(opts, { skipMissingFiles: true });
  const results = await Promise.all(
    opts.projects.map(async (p) => await context.api.projectMeta(p))
  );
  if (opts.json) {
    logger.info(JSON.stringify(results, null, 2));
  } else {
    for (const meta of results) {
      logger.info(`Id: ${meta.id}`);
      logger.info(`Name: ${meta.name}`);
      logger.info(`Host URL: ${meta.hostUrl ?? null}`);
      logger.info(
        `Last published version: ${meta.lastPublishedVersion ?? null}`
      );
    }
  }
}
