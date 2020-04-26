import L from "lodash";
import { SyncArgs, syncProjects } from "./sync";
import { getContext } from "../utils/config-utils";
import { warnLatestReactWeb } from "../utils/npm-utils";

export interface WatchArgs extends SyncArgs {}
export async function watchProjects(opts: WatchArgs) {
  const context = getContext(opts);
  const config = context.config;
  const socket = context.api.connectSocket();
  const promise = new Promise(resolve => {});
  const projectIds = L.uniq(
    opts.projects.length > 0
      ? opts.projects
      : config.projects.map(c => c.projectId)
  );
  if (projectIds.length === 0) {
    console.error(
      "Don't know which projects to sync; please specify via --projects"
    );
    process.exit(1);
  }

  await warnLatestReactWeb(context);

  socket.on("connect", () => {
    // upon connection, subscribe to changes for argument projects
    socket.emit("subscribe", { namespace: "projects", projectIds });
  });
  socket.on("error", (data: any) => {
    console.error(data);
    process.exit(1);
  });
  socket.on("update", (data: any) => {
    // Just run syncProjects() for now when any project has been updated
    console.log(
      `Project ${data.projectId} updated to revision ${data.revisionNum}`
    );
    syncProjects(opts);
  });

  console.log("Watching projects...");
  await promise;
}
