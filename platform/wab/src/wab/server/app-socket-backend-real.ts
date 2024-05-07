/**
 * In order to make the app backend "stateless", we put the stateful parts --
 * currently, just the stuff with websockets -- into a separate lightweight
 * standalone server. This server is responsible for actually maintaining
 * the live websockets and whatever transient state.  Ideally, those transient
 * state will be moved to some other place, like redis, but that's for
 * the future!  There will only be exactly one instance of this server.
 *
 * This server also has a few API endpoints that are used by the real app
 * backend to broadcast specific messages to the websockets.
 *
 * NOTE: this server should not be exposed to the public internet! It should
 * only be reachable by the real app server. No attempt at security here.
 *
 * Runs on port 3020 or SOCKET_PORT.
 */
import { spawn } from "@/wab/common";
import { addLoggingMiddleware } from "@/wab/server/AppServer";
import { Config } from "@/wab/server/config";
import {
  ensureDbConnections,
  maybeMigrateDatabase,
} from "@/wab/server/db/DbCon";
import { trackPostgresPool, WabPromStats } from "@/wab/server/promstats";
import { InitSocket } from "@/wab/server/routes/init-socket";
import { ProjectsSocket } from "@/wab/server/routes/projects-socket";
import { runExpressApp, setupServerCli } from "@/wab/server/server-common";
import { json as bodyParserJson } from "body-parser";
import express, { Request } from "express";
import promMetrics from "express-prom-bundle";
import http from "http";

export interface BroadcastPayload {
  // Null room means broadcast to all rooms
  room: string | null;
  type: string;
  message: object;
}

async function run() {
  const { config } = setupServerCli();

  await ensureDbConnections(config.databaseUri, {
    defaultPoolSize: 50,
  });
  await maybeMigrateDatabase();

  const app = express();
  app.set("port", process.env["SOCKET_PORT"]);
  app.set("name", "socket-server");

  addLoggingMiddleware(app);

  app.use(bodyParserJson({ limit: "400mb" }));

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.use(async (req: Request, res, next) => {
    req.statsd = new WabPromStats(app.get("name"));
    req.statsd.onReqStart(req);
    res.on("finish", () => {
      req.statsd.onReqEnd(req, res);
    });
    next();
  });

  app.use(
    promMetrics({
      includeMethod: true,
      includeStatusCode: true,
      includePath: true,
      promClient: {
        collectDefaultMetrics: {},
      },
      buckets: [
        0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 20, 30, 40, 65, 80, 100, 130,
        160, 180,
      ],
    })
  );

  trackPostgresPool(app.get("name"));
  const { attach } = addSocketRoutes(app, config);

  runExpressApp(app, (server) => {
    attach(server);
  });
}

export function addSocketRoutes(app: express.Application, config: Config) {
  const projectsIo = new ProjectsSocket(config, app.get("name"));

  app.post("/api/v1/disconnect", (req, res) => {
    const sessionId = req.body.sessionID as string;
    projectsIo.disconnectSession(sessionId);
    res.json({});
  });

  app.post("/api/v1/projects/broadcast", (req, res) => {
    const payload = req.body as BroadcastPayload;
    projectsIo.broadcast(payload);
    res.json({});
  });

  const cliInitIo = new InitSocket();
  app.post("/api/v1/cli/emit-token", (req, res) => {
    cliInitIo.emit(req.body.email, req.body.initToken, req.body.authToken);
    res.json({});
  });

  return {
    attach: (server: http.Server) => {
      projectsIo.attach(server);
      cliInitIo.attach(server);
    },
  };
}

if (require.main === module) {
  spawn(run());
}
