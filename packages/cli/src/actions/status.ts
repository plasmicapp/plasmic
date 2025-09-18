import chalk from "chalk";
import { CommonArgs } from "..";
import { logger } from "../deps";
import { getContext, readLock } from "../utils/get-context";
import * as semver from "../utils/semver";

const PROJECT_ID_WIDTH = 23;
const PROJECT_NAME_WIDTH = 30;
const BRANCH_NAME_WIDTH = 15;
const VERSION_WIDTH = 15;
const STATUS_WIDTH = 23;
const TOTAL_WIDTH =
  PROJECT_ID_WIDTH +
  PROJECT_NAME_WIDTH +
  BRANCH_NAME_WIDTH +
  VERSION_WIDTH * 3 +
  STATUS_WIDTH;

export interface StatusArgs extends CommonArgs {
  json?: boolean;
}

export async function showProjectStatus(opts: StatusArgs): Promise<void> {
  const context = await getContext(opts, { skipInit: true });

  const projects = context.config.projects;
  if (projects.length === 0) {
    logger.info("No projects found in plasmic.json");
    return;
  }

  // Read lock file if it exists
  const lockData = readLock(context.lockFile);

  // Fetch latest versions from the server for all projects at once
  let serverVersions: Record<string, string | null> = {};
  try {
    const resolution = await context.api.resolveSync(
      projects.map((project) => ({
        projectId: project.projectId,
        branchName: project.projectBranchName || "main",
        // We want to use ">=0.0.0" to get the latest published version.
        // However, due to PLA-11698, this results in an error if the project
        // has never been published. This is much more likely if the synced
        // version is "latest".
        versionRange: project.version === "latest" ? "latest" : ">=0.0.0",
        componentIdOrNames: undefined,
        projectApiToken: project.projectApiToken,
      }))
    );

    resolution.projects?.forEach((resolvedProject) => {
      serverVersions[resolvedProject.projectId] = resolvedProject.version;
    });
  } catch (error) {
    // If we can't reach the server, we'll just show local information
    logger.debug(`Could not fetch latest versions from server: ${error}`);
  }

  const projectData = projects.map((project) => {
    // Find the corresponding lock entry
    const lockEntry = lockData.projects?.find(
      (p) => p.projectId === project.projectId
    );

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      branchName: project.projectBranchName,
      plasmicJsonVersion: project.version,
      plasmicLockVersion: lockEntry?.version || null,
      serverVersion: serverVersions[project.projectId] || "unpublished",
    };
  });

  if (opts.json) {
    // Output as JSON
    logger.info(JSON.stringify(projectData, null, 2));
  } else {
    // Output as formatted table
    logger.info(chalk.bold("\nPlasmic Project Sync Status\n"));
    logger.info(chalk.gray("─".repeat(TOTAL_WIDTH)));

    // Header
    logger.info(
      chalk.bold(padRight("Project ID", PROJECT_ID_WIDTH)) +
        chalk.bold(padRight("Project", PROJECT_NAME_WIDTH)) +
        chalk.bold(padRight("Branch", BRANCH_NAME_WIDTH)) +
        chalk.bold(padRight("plasmic.json", VERSION_WIDTH)) +
        chalk.bold(padRight("plasmic.lock", VERSION_WIDTH)) +
        chalk.bold(padRight("server", VERSION_WIDTH)) +
        chalk.bold("Status")
    );
    logger.info(chalk.gray("─".repeat(TOTAL_WIDTH)));

    let notSynced = 0;
    let updateAvailable = 0;
    let updateStatusUnknown = 0;
    for (const status of projectData) {
      const projectIdDisplay = padRight(status.projectId, 23);
      const projectNameDisplay = padRight(
        status.projectName.substring(0, 29),
        30
      );
      const branchDisplay = padRight(status.branchName || "main", 15);
      const targetDisplay = padRight(status.plasmicJsonVersion, 15);
      const syncedDisplay = padRight(
        status.plasmicLockVersion || "not synced",
        15
      );
      const latestDisplay = padRight(status.serverVersion || "unknown", 15);

      let statusDisplay = "";
      if (!status.plasmicLockVersion) {
        statusDisplay = chalk.gray("! Not synced");
        ++notSynced;
      } else if (
        !status.serverVersion ||
        !semver.valid(status.serverVersion) ||
        semver.isLatest(status.serverVersion)
      ) {
        // Can't compare if the server version is unknown or latest
        statusDisplay = chalk.yellow("? Update status unknown");
        ++updateStatusUnknown;
      } else if (semver.lt(status.plasmicLockVersion, status.serverVersion)) {
        statusDisplay = chalk.blue("↑ Update available");
        ++updateAvailable;
      } else {
        statusDisplay = chalk.green("✓ Up-to-date");
      }

      logger.info(
        projectIdDisplay +
          projectNameDisplay +
          branchDisplay +
          targetDisplay +
          syncedDisplay +
          latestDisplay +
          statusDisplay
      );
    }

    logger.info(chalk.gray("─".repeat(TOTAL_WIDTH)));
    logger.info("");

    if (notSynced > 0) {
      logger.info(chalk.yellow(`! ${notSynced} project(s) not synced`));
    }
    if (updateAvailable > 0) {
      logger.info(chalk.blue(`↑ ${updateAvailable} project(s) can be updated`));
    }
    if (updateStatusUnknown > 0) {
      logger.info(
        chalk.yellow(
          `? ${updateStatusUnknown} project(s) have unknown update status due to "latest" version in plasmic.json`
        )
      );
    }
    if (notSynced === 0 && updateAvailable === 0 && updateStatusUnknown === 0) {
      logger.info(chalk.green("✓ All projects are up to date"));
    }

    logger.info("");
    logger.info(chalk.gray("Run 'plasmic sync' to sync your projects"));
  }
}

function padRight(str: string, length: number): string {
  if (str.length >= length) {
    return str.substring(0, length - 1) + " ";
  }
  return str + " ".repeat(length - str.length);
}
