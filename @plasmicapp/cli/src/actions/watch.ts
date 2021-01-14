import L from "lodash";
import moment from "moment";
import { CommonArgs } from "..";
import { logger } from "../deps";
import { getContext } from "../utils/get-context";
import * as semver from "../utils/semver";
import { sync } from "./sync";

export interface WatchArgs extends CommonArgs {
  projects: readonly string[];
  forceOverwrite: boolean;
  newComponentScheme?: "blackbox" | "direct";
  appendJsxOnMissingBase?: boolean;
  yes?: boolean;
  force?: boolean;
  nonRecursive?: boolean;
  skipUpgradeCheck?: boolean;
}
export async function watchProjects(opts: WatchArgs) {
  // Perform a sync before watch.
  await sync({ ...opts, quiet: true });

  const context = await getContext(opts);
  const config = context.config;
  const socket = context.api.connectSocket();
  const promise = new Promise((resolve) => {});
  const projectIds = L.uniq(
    opts.projects.length > 0
      ? opts.projects
      : config.projects.map((c) => c.projectId)
  );

  // Filter out projects that are not latest
  const latestProjects = projectIds.filter((projectId) => {
    const projectConfig = config.projects.find(
      (p) => p.projectId === projectId
    );
    return !projectConfig || semver.isLatest(projectConfig.version);
  });

  if (projectIds.length !== latestProjects.length) {
    const filteredProjects = L.difference(projectIds, latestProjects);
    logger.warn(
      `Warning: watch only works for projects with version="latest". Ignoring ${filteredProjects}`
    );
  }

  if (latestProjects.length === 0) {
    logger.error(
      "Don't know which projects to sync; please specify via --projects"
    );
    process.exit(1);
  }

  socket.on("initServerInfo", () => {
    // upon connection, subscribe to changes for argument projects
    socket.emit("subscribe", {
      namespace: "projects",
      projectIds: latestProjects,
    });
  });
  socket.on("error", (data: any) => {
    logger.error(data);
    process.exit(1);
  });
  socket.on("update", async (data: any) => {
    // Just run syncProjects() for now when any project has been updated
    // Note on the 'updated to revision' part: this is parsed by the
    // loader package to know that we finished updating the components.
    await sync({ ...opts, quiet: true });
    logger.info(
      `[${moment().format("HH:mm:ss")}] Project ${
        data.projectId
      } updated to revision ${data.revisionNum}`
    );
  });

  logger.info(`Watching projects ${latestProjects} ...`);
  await promise;
}
