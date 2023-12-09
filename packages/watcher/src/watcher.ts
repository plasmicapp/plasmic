import type { Socket } from "socket.io-client";
import socketio from "socket.io-client";

export interface PlasmicRemoteChangeListener {
  onUpdate?: (projectId: string, revision: number) => void;
  onPublish?: (projectId: string, version: string) => void;
  onError?: (data: any) => void;
}

export class PlasmicRemoteChangeWatcher {
  private watchers: PlasmicRemoteChangeListener[] = [];
  private socket: Socket | undefined = undefined;
  private host: string;

  constructor(
    private opts: {
      projects: { id: string; token: string }[];
      host?: string;
    }
  ) {
    this.host = opts.host ?? "https://studio.plasmic.app";
  }

  subscribe(watcher: PlasmicRemoteChangeListener) {
    this.watchers.push(watcher);
    this.ensureWatch();
    return () => {
      this.unsubscribe(watcher);
    };
  }

  unsubscribe(watcher: PlasmicRemoteChangeListener) {
    const index = this.watchers.indexOf(watcher);
    if (index >= 0) {
      this.watchers.splice(index, 1);
      if (this.watchers.length === 0 && this.socket) {
        this.socket.disconnect();
        this.socket = undefined;
      }
    }
  }

  private async connectSocket() {
    const socket = socketio(this.host, {
      path: `/api/v1/socket`,
      transportOptions: {
        polling: {
          extraHeaders: this.makeAuthHeaders(),
        },
      },
    });
    return socket;
  }

  private makeAuthHeaders() {
    const tokens = this.opts.projects
      .map((p) => `${p.id}:${p.token}`)
      .join(",");
    return {
      "x-plasmic-api-project-tokens": tokens,
    };
  }

  private async ensureWatch() {
    if (this.socket) {
      return;
    }

    if (this.watchers.length === 0) {
      return;
    }

    const socket = (this.socket = await this.connectSocket());
    socket.on("initServerInfo", () => {
      socket.emit("subscribe", {
        namespace: "projects",
        projectIds: this.opts.projects.map((p) => p.id),
      });
    });

    socket.on("error", (data) => {
      console.error(`${new Date().toISOString()}: Encountered error ${data}`);
      this.watchers.forEach((watcher) => watcher.onError?.(data));
      socket.disconnect();
      this.socket = undefined;
    });

    socket.on("update", async (data: any) => {
      console.log(
        `${new Date().toISOString()}: Project ${
          data.projectId
        } updated to revision ${data.revisionNum}`
      );
      this.watchers.forEach((watcher) =>
        watcher.onUpdate?.(data.projectId, data.revisionNum)
      );
    });

    socket.on("publish", async (data: any) => {
      console.log(
        `${new Date().toISOString()}: Project ${
          data.projectId
        } updated to version ${data.version}`
      );
      this.watchers.forEach((watcher) =>
        watcher.onPublish?.(data.projectId, data.version)
      );
    });
  }
}
