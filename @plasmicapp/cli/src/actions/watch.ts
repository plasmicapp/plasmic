import L from "lodash";
import moment from "moment";
import { SyncArgs, sync } from "./sync";
import { getContext } from "../utils/config-utils";
import { warnLatestReactWeb } from "../utils/npm-utils";
import { logger } from "../deps";

export interface WatchArgs extends SyncArgs {}
export async function watchProjects(opts: WatchArgs) {
  // Perform a sync before watch.
  await sync(opts);

  const context = getContext(opts);
  const config = context.config;
  const socket = context.api.connectSocket();
  const promise = new Promise((resolve) => {});
  const projectIds = L.uniq(
    opts.projects.length > 0
      ? opts.projects
      : config.projects.map((c) => c.projectId)
  );
  if (projectIds.length === 0) {
    logger.error(
      "Don't know which projects to sync; please specify via --projects"
    );
    process.exit(1);
  }

  socket.on("initServerInfo", () => {
    // upon connection, subscribe to changes for argument projects
    socket.emit("subscribe", { namespace: "projects", projectIds });
  });
  socket.on("error", (data: any) => {
    logger.error(data);
    process.exit(1);
  });
  socket.on("update", (data: any) => {
    // Just run syncProjects() for now when any project has been updated
    logger.info(
      `[${moment().format("HH:mm:ss")}] Project ${
        data.projectId
      } updated to revision ${data.revisionNum}`
    );
    sync(opts);
  });

  logger.info("Watching projects...");
  await promise;
}
