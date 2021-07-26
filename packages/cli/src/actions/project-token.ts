import chalk from "chalk";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { getOrStartAuth } from "../utils/auth-utils";
import { DEFAULT_HOST } from "../utils/config-utils";

export interface ProjectTokenArgs {
  projectId: string;
  host: string;
}

export const getProjectApiToken = async (projectId: string, host?: string) => {
  const auth = await getOrStartAuth({
    host: host || DEFAULT_HOST,
    baseDir: "",
  });

  if (auth) {
    const api = new PlasmicApi(auth);
    const versionResolution = await api.resolveSync([
      { projectId, componentIdOrNames: undefined },
    ]);
    return versionResolution.projects[0]?.projectApiToken;
  }
  return undefined;
};

export const projectToken = async (args: ProjectTokenArgs) => {
  const { projectId, host } = args;
  const projectApiToken = await getProjectApiToken(projectId, host);
  logger.info(`Generated projectApiToken for ${chalk.bold(projectId)}:`);
  logger.info(chalk.bold(projectApiToken));
  logger.warn(
    `Be careful with this token, anyone can have access to your project with it`
  );
};
