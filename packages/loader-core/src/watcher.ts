import socketio, { Socket } from 'socket.io-client';

const host = process.env.PLASMIC_HOST ?? `https://studio.plasmic.app`;

export interface PlasmicRemoteChangeListener {
  onChange: (projectId: string) => void;
  onError?: (data: any) => void;
}

export class PlasmicRemoteChangeWatcher {
  private watchers: PlasmicRemoteChangeListener[] = [];
  private socket: Socket | undefined = undefined;

  constructor(
    private opts: {
      user: string;
      token: string;
      projectIds: string[];
    }
  ) {}

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
    const socket = socketio(host, {
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
    return {
      'x-plasmic-api-user': this.opts.user,
      'x-plasmic-api-token': this.opts.token,
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
    socket.on('initServerInfo', () => {
      socket.emit('subscribe', {
        namespace: 'projects',
        projectIds: this.opts.projectIds,
      });
    });

    socket.on('error', (data) => {
      console.error(`${new Date().toISOString()}: Encountered error ${data}`);
      this.watchers.forEach((watcher) => watcher.onError?.(data));
      socket.disconnect();
      this.socket = undefined;
    });

    socket.on('update', async (data: any) => {
      console.log(
        `${new Date().toISOString()}: Project ${
          data.projectId
        } updated to revision ${data.revisionNum}`
      );
      console.log('Informing watchers', this.watchers);
      this.watchers.forEach((watcher) => watcher.onChange(data.projectId));
    });
  }
}
