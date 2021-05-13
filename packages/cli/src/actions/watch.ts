import L from "lodash";
import moment from "moment";
import { CommonArgs } from "..";
import { logger } from "../deps";
import { HandledError } from "../utils/error";
import { getContext, Metadata } from "../utils/get-context";
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
  metadata?: string;
}
export async function watchProjects(
  opts: WatchArgs,
  metadataDefaults?: Metadata,
  onProjectUpdate?: () => void
): Promise<void> {
  // Perform a sync before watch.
  const syncOpts = {
    ...opts,
    quiet: true,
  };
  const syncMetadata: Metadata = {
    ...metadataDefaults,
    command: "watch", // force this to be set
  };
  await sync(syncOpts, syncMetadata);

  const context = await getContext(opts);
  const config = context.config;
  const socket = context.api.connectSocket();
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
    throw new HandledError(
      "Don't know which projects to sync; please specify via --projects"
    );
  }

  const promise = new Promise<void>((resolve, reject) => {
    socket.on("initServerInfo", () => {
      // upon connection, subscribe to changes for argument projects
      socket.emit("subscribe", {
        namespace: "projects",
        projectIds: latestProjects,
      });
    });
    socket.on("error", (data: any) => {
      reject(new HandledError(data));
    });
    socket.on("update", async (data: any) => {
      // Just run syncProjects() for now when any project has been updated
      // Note on the 'updated to revision' part: this is parsed by the
      // loader package to know that we finished updating the components.
      await sync(syncOpts, syncMetadata);
      logger.info(
        `[${moment().format("HH:mm:ss")}] Project ${
          data.projectId
        } updated to revision ${data.revisionNum}`
      );

      onProjectUpdate?.();
    });
  });

  logger.info(`Watching projects ${latestProjects} ...`);
  return promise;
}
