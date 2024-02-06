import { DEVFLAGS } from "@/wab/devflags";
import { ProjectIdAndToken } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import Analytics from "analytics-node";
import socketio from "socket.io";
import { Connection, EntityManager } from "typeorm";
import { Config } from "./config";
import { Actor } from "./db/DbMgr";
import { Mailer } from "./emails/Mailer";
import { Team, User as UserEnt } from "./entities/Entities";
import { WabPromStats } from "./promstats";
import { TimingStore } from "./timing-util";
import { PlasmicWorkerPool } from "./workers/pool";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Application {
      analytics: Analytics;
    }
    // Merge our User with passport's User
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface User extends UserEnt {}
    export interface Request {
      con: Connection;
      txMgr: EntityManager;
      resolveTransaction: () => Promise<void>;
      rejectTransaction: (err: Error) => Promise<void>;
      activeTransaction: Promise<any>;
      user?: User;
      bundler: Bundler;
      mailer: Mailer;
      apiTeam?: Team; // For when acting with team api token
      socketio: socketio.Server;
      config: Config;
      devflags: typeof DEVFLAGS;
      workerpool: PlasmicWorkerPool;
      statsd: WabPromStats;
      timingStore: TimingStore | undefined;
      startTime?: bigint;
      id?: string;
      promLabels: {
        projectId?: string;
      };
    }
    export interface Response {
      isClosedBeforeFulfilled?: boolean;
    }
  }
}
declare module "socket.io/dist/socket" {
  export interface Handshake {
    user?: SocketUser;
  }
}

export interface SocketUser {
  actor: Actor;
  projectIdAndTokens?: ProjectIdAndToken[];
}
