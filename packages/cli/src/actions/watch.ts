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
    socket.on(
      "update",
      asyncOneAtATime(async (data: any) => {
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
      }, true)
    );
  });

  logger.info(`Watching projects ${latestProjects} ...`);
  return promise;
}

/**
 * Throttle invocations of a function to allow a single outstanding invocation
 * at a time.
 *
 * But, has a buffer of size one, so that after the current invocation
 * completes, it calls the last attempted invocation.
 *
 * Other invocations that get evicted from the buffer get returned bounceValue
 * upon eviction.
 */
type AsyncCallable = (...args: any[]) => Promise<any>;

function asyncOneAtATime(f: AsyncCallable, bounceValue: any): AsyncCallable {
  interface CallInfo {
    args: any[];
    resolve: any;
    reject: any;
  }
  let waitingCall: CallInfo | undefined = undefined,
    currentPromise: Promise<any> | undefined = undefined;
  function invoke({ args, resolve, reject }: CallInfo) {
    const onCompletion = () => {
      currentPromise = undefined;
      if (waitingCall) {
        invoke(waitingCall);
        waitingCall = undefined;
      }
    };
    currentPromise = f(...args);
    currentPromise.then(onCompletion, onCompletion);
    currentPromise.then(resolve, reject);
  }
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      if (!currentPromise) {
        // Free to proceed.
        invoke({ args, resolve, reject });
      } else {
        // Evict current waiter, and enqueue self.
        if (waitingCall) {
          waitingCall.resolve(bounceValue);
        }
        waitingCall = { args, resolve, reject };
      }
    });
  };
}
