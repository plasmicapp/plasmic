import { makeExpressSessionMiddleware } from "@/wab/server/AppServer";
import { getApiTokenUser } from "@/wab/server/auth/routes";
import { Config } from "@/wab/server/config";
import { getLastBundleVersion } from "@/wab/server/db/BundleMigrator";
import {
  ANON_USER,
  DbMgr,
  ForbiddenError,
  NotFoundError,
  SUPER_USER,
  normalActor,
} from "@/wab/server/db/DbMgr";
import { SocketUser } from "@/wab/server/extensions";
import { logger } from "@/wab/server/observability";
import { parseProjectIdsAndTokensHeader } from "@/wab/server/routes/util";
import {
  InitServerInfo,
  PlayerViewInfo,
  ServerPlayerInfo,
  ServerSessionsInfo,
  UpdatePlayerViewRequest,
} from "@/wab/shared/ApiSchema";
import type {
  BroadcastPayload,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@/wab/shared/api/socket";
import {
  ensure,
  maybe,
  removeWhere,
  spawnWrapper,
  withoutNils,
} from "@/wab/shared/common";
import { isAdminTeamEmail } from "@/wab/shared/devflag-utils";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { modelSchemaHash } from "@/wab/shared/model/classes-metas";
import { Request, Response } from "express";
import { Server } from "http";
import { get } from "lodash";
import { Gauge } from "prom-client";
import { Server as SocketIoServer, Socket as UntypedSocket } from "socket.io";
import { getConnection } from "typeorm";

type Socket = UntypedSocket<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

export class ProjectsSocket {
  private io: SocketIoServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >;
  private socketToPlayerViewInfo = new WeakMap<Socket, PlayerViewInfo>();
  private socketToPlayerId = new WeakMap<Socket, number>();
  /**
   * room (`projects/${projectId}`) -> client socket list
   */
  private roomToSockets = new Map<string, Socket[]>();
  private sessionIdToSockets = new Map<string, Socket[]>();
  private nextPlayerId = 0;

  constructor(config: Config, appName: string) {
    this.io = new SocketIoServer({
      path: "/api/v1/socket",
    });

    const expressSessionMiddleware = makeExpressSessionMiddleware(config);
    this.io.use((socket, next) => {
      expressSessionMiddleware(
        socket.request as Request,
        {} as Response,
        next as any
      );
    });
    this.io.use(spawnWrapper(socketAuthMiddleware));

    this.io.on("connection", async (socket) => {
      await this.onConnect(socket);
    });

    // Track number of connected sockets
    const self = this;
    new Gauge({
      name: `projects_room_sockets`,
      labelNames: ["app"],
      help: "Number of active sockets for ProjectsSocket in active rooms",
      collect() {
        this.set(
          { app: appName },
          Array.from(self.roomToSockets.values()).reduce(
            (a, b) => a + b.length,
            0
          )
        );
      },
    });
    new Gauge({
      name: `projects_session_sockets`,
      labelNames: ["app"],
      help: "Number of active sockets for ProjectsSocket in active sessions",
      collect() {
        this.set(
          { app: appName },
          Array.from(self.sessionIdToSockets.values()).reduce(
            (a, b) => a + b.length,
            0
          )
        );
      },
    });
    new Gauge({
      name: `projects_rooms`,
      labelNames: ["app"],
      help: "Number of active rooms for ProjectsSocket",
      collect() {
        this.set({ app: appName }, self.roomToSockets.size);
      },
    });
    new Gauge({
      name: `projects_sessions`,
      labelNames: ["app"],
      help: "Number of active sessions for ProjectsSocket",
      collect() {
        this.set({ app: appName }, self.sessionIdToSockets.size);
      },
    });
  }

  attach(server: Server) {
    this.io.attach(server);
  }

  disconnectSession(sessionId: string) {
    // On logout/login, we should close all existing connections to make sure
    // it'll reconnect with the right permissions
    this.sessionIdToSockets.get(sessionId)?.forEach((s) => s.disconnect(true));
  }

  broadcast(payload: BroadcastPayload) {
    if (payload.room) {
      this.io.in(payload.room).emit(payload.type, payload.message);
    } else {
      this.io.emit(payload.type, payload.message);
    }
  }

  private trackSocket(map: Map<string, Socket[]>, key: string, socket: Socket) {
    map.set(key, [...(map.get(key) ?? []), socket]);
  }

  private untrackSocket(
    map: Map<string, Socket[]>,
    key: string,
    socket: Socket
  ) {
    maybe(map.get(key), (sockets) => removeWhere(sockets, (s) => s === socket));
  }

  private async onConnect(socket: Socket) {
    const playerId = this.getPlayerId(socket);

    socket.on("subscribe", async (args: any) => {
      if (args.namespace === "projects") {
        // When a client connects and subscribes to listening to projects, we
        // join the socket to the associated rooms
        const hasPermissions = await verifyProjectPermissions(
          socket,
          args.projectIds
        );
        if (hasPermissions) {
          const sessionId = ensure(
            socket.request["sessionID"],
            "SessionID should not be undefined"
          );
          logger().info(`Starting session ${sessionId}`);
          this.trackSocket(this.sessionIdToSockets, sessionId, socket);
          logger().info(
            `Subscribing user ${getSocketUserName(
              ensure(socket.handshake.user, "User should not be undefined")
            )} to ${args.projectIds}`
          );
          for (const projectId of args.projectIds) {
            const room = `projects/${projectId}`;
            await socket.join(room);
          }
          if (args.studio) {
            // We subscribe for changes from Studio and from cli
            socket.on("view", (data: UpdatePlayerViewRequest) => {
              const room = `projects/${data.projectId}`;
              this.socketToPlayerViewInfo.set(socket, {
                branchId: data.branchId ?? undefined,
                arenaInfo: data.arena ?? undefined,
                selectionInfo: data.selection ?? undefined,
                cursorInfo: data.cursor ?? undefined,
                positionInfo: data.position ?? undefined,
              });
              this.broadcastPlayerSessions(room);
            });
            socket.on("disconnect", () => {
              this.untrackSocket(this.sessionIdToSockets, sessionId, socket);
              for (const projectId of args.projectIds) {
                const room = `projects/${projectId}`;
                this.untrackSocket(this.roomToSockets, room, socket);
                this.socketToPlayerViewInfo.delete(socket);
                this.socketToPlayerId.delete(socket);
                if (this.roomToSockets.get(room)?.length === 0) {
                  this.roomToSockets.delete(room);
                } else {
                  this.broadcastPlayerSessions(room);
                }
              }
            });

            for (const projectId of args.projectIds) {
              const room = `projects/${projectId}`;
              if (await shouldShowPlayer(socket, projectId)) {
                this.trackSocket(this.roomToSockets, room, socket);
              }
              this.broadcastPlayerSessions(room);
            }
          }
        } else {
          socket.emit(
            "error",
            `No read access to projects ${args.projectIds.join(", ")}`
          );
          socket.disconnect(true);
        }
      } else {
        socket.emit("error", "Unknown reason for connection");
        socket.disconnect(true);
      }
    });

    const initServerInfo: InitServerInfo = {
      modelSchemaHash,
      bundleVersion: await getLastBundleVersion(),
      selfPlayerId: playerId,
    };
    socket.emit("initServerInfo", initServerInfo);
    logger().info(
      `Socket connected for ${getSocketUserName(
        ensure(socket.handshake["user"], "User should not be undefined")
      )}`
    );
  }

  private getPlayerId(socket: Socket) {
    if (this.socketToPlayerId.has(socket)) {
      return this.socketToPlayerId.get(socket)!;
    }
    const id = this.nextPlayerId++;
    this.socketToPlayerId.set(socket, id);
    return id;
  }

  private buildPlayerInfo(socket: Socket) {
    const playerInfo = maybe(
      socket.handshake["user"]?.actor,
      (actor): ServerPlayerInfo | undefined =>
        actor.type === "NormalUser"
          ? {
              playerId: this.getPlayerId(socket),
              type: "NormalUser",
              userId: actor.userId,
            }
          : actor.type === "AnonUser"
          ? {
              playerId: this.getPlayerId(socket),
              type: "AnonUser",
            }
          : undefined
    );
    if (!playerInfo) {
      return undefined;
    }
    playerInfo.viewInfo = this.socketToPlayerViewInfo.get(socket);
    return playerInfo;
  }

  private broadcastPlayerSessions(room: string) {
    const playerSessions: ServerSessionsInfo = {
      sessions: withoutNils(
        (this.roomToSockets.get(room) ?? []).map((socket) =>
          this.buildPlayerInfo(socket)
        )
      ),
    };
    this.io.in(room).emit("players", playerSessions);
  }
}

async function socketAuthMiddleware(socket: Socket, next: (err?: any) => any) {
  try {
    const user = await extractAuthUser(socket);
    if (!user) {
      logger().info("Rejected unauthenticated socket connection");
      return next(new Error("Invalid credentials."));
    }
    socket.handshake["user"] = user;
  } catch (e) {
    return next(e);
  }
  return next();
}

async function extractAuthUser(
  socket: Socket
): Promise<SocketUser | undefined> {
  const request = socket.request as Request;

  return await withDbMgr({ actor: SUPER_USER }, async (mgr) => {
    if (get(socket, "request.session.passport.user")) {
      // This is a user logged in with a passport cookie
      logger().info(
        "Socket logged in via passport",
        // @ts-ignore
        request.session?.passport.user
      );
      return {
        // @ts-ignore
        actor: normalActor(request.session?.passport.user),
      };
    }

    const projectTokensStr =
      socket.handshake.headers["x-plasmic-api-project-tokens"];
    if (projectTokensStr) {
      const tokens = parseProjectIdsAndTokensHeader(projectTokensStr);
      return {
        actor: ANON_USER,
        projectIdAndTokens: tokens,
      };
    }

    const email = socket.handshake.headers["x-plasmic-api-user"];
    const token = socket.handshake.headers["x-plasmic-api-token"];

    if (email && token) {
      const user = (
        await getApiTokenUser(mgr, email as string, token as string)
      ).user;
      if (user) {
        return {
          actor: normalActor(user.id),
        };
      }
    }

    return {
      actor: ANON_USER,
    };
  });
}

async function withDbMgr<T>(user: SocketUser, f: (mgr: DbMgr) => Promise<T>) {
  return await getConnection().transaction(async (txMgr) => {
    const mgr = new DbMgr(txMgr, user.actor, {
      projectIdsAndTokens: user.projectIdAndTokens,
    });
    return f(mgr);
  });
}

async function verifyProjectPermissions(socket: Socket, projectIds: string[]) {
  const user = ensure(socket.handshake["user"], "User should not be undefined");
  return await withDbMgr(user, async (mgr) => {
    try {
      await Promise.all(
        projectIds.map((p) => mgr.checkProjectPerms(p, "viewer", "get"))
      );
      return true;
    } catch (err) {
      if (err instanceof ForbiddenError || err instanceof NotFoundError) {
        return false;
      } else {
        throw err;
      }
    }
  });
}

// Don't show @plasmic.app users if they're opening non-plasmic projects
// (as it could be surprising to the users seeing an unexpected avatar when
// we're debugging issues on their projects)
async function shouldShowPlayer(socket: Socket, projectId: string) {
  const user = ensure(socket.handshake["user"], "User should not be undefined");
  if (user.actor.type === "AnonUser") {
    return true;
  }
  if (user.actor.type === "NormalUser") {
    const actor = user.actor;
    return withDbMgr(user, async (mgr) => {
      if (
        // Note: just using the hardcoded default here, to avoid piping devflags down.
        isAdminTeamEmail((await mgr.getUserById(actor.userId)).email, DEVFLAGS)
      ) {
        const ownerId = (await mgr.getProjectById(projectId)).createdById;
        if (!ownerId) {
          return true;
        }
        return isAdminTeamEmail(
          (await mgr.getUserById(ownerId)).email,
          DEVFLAGS
        );
      }
      return true;
    });
  }
  return false;
}

function getSocketUserName(user: SocketUser) {
  if (user.actor.type === "NormalUser") {
    return user.actor.userId;
  } else if (user.projectIdAndTokens) {
    return `x-project-tokens ${user.projectIdAndTokens
      .map((p) => p.projectId)
      .join(",")}`;
  } else {
    return user.actor.type;
  }
}
