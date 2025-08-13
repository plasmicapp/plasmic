// newrelic must be imported as early as possible, so we shift config loading to
// the top so that we know if we are running production and want newrelic.
import {
  addCodegenRoutes,
  addMainAppServerRoutes,
  createApp,
} from "@/wab/server/AppServer";
import {
  ensureDbConnections,
  maybeMigrateDatabase,
} from "@/wab/server/db/DbCon";
import { runExpressApp, setupServerCli } from "@/wab/server/server-common";
import { captureException } from "@sentry/node";
import * as childProcess from "child_process";
import "core-js";
import * as fs from "fs";
import http from "http";
import cron from "node-cron";
import * as path from "path";
// Must initialize globals early so that imported code can detect what
// environment we're running in.
import { addSocketRoutes } from "@/wab/server/app-socket-backend-real";
import { Config } from "@/wab/server/config";
import { logger } from "@/wab/server/observability";
import { sendCommentsNotificationEmails } from "@/wab/server/scripts/send-comments-notifications";
import { withSpan } from "@/wab/server/util/apm-util";
import httpProxy from "http-proxy";

export async function runAppServer(config: Config) {
  await ensureDbConnections(config.databaseUri, {
    defaultPoolSize: 100,
  });
  await maybeMigrateDatabase();

  logger().info(`Starting up app server; NODE_ENV: ${process.env.NODE_ENV}`);

  const socketHost = process.env["SOCKET_HOST"];

  // We proxy websocket requests to the socket server
  const socketProxy = socketHost
    ? httpProxy.createProxyServer({
        target: socketHost,
        ws: true,
      })
    : undefined;

  let attach: ((server: http.Server) => void) | undefined = undefined;
  const { app } = await createApp(
    "studio",
    config,
    (application) => {
      addMainAppServerRoutes(application, config);

      if (!config.production) {
        // For development, we also add codegen routes to the dev server.
        // In production, we don't, as codegen routes has security issues
        // like server side rendering, which the prod server is not
        // protected against.
        logger().info("Adding codegen routes");
        addCodegenRoutes(application);
      }
    },
    (application) => {
      // Two socket endpoints; we forward to WS_PROXY as long poll requests.
      // Preferably though, the socket.io client is directly using websockets.
      if (socketProxy) {
        application.all("/api/v1/socket", (req, res, next) => {
          socketProxy.web(req, res);
        });
        application.all("/api/v1/init-token", (req, res, next) => {
          socketProxy.web(req, res);
        });
      } else {
        logger().info(`No socket host found; serving sockets from app backend`);
        ({ attach } = addSocketRoutes(application, config));
      }
    }
  );

  // runs every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    await withSpan("[Comments] notifications emails", async () => {
      await sendCommentsNotificationEmails(config);
      logger().info("Notification emails sent");
    });
  });

  return runExpressApp(app, (server) => {
    // Upon upgrading to websocket, also proxy to socket server
    if (socketProxy) {
      server.on("upgrade", (req, socket, head) => {
        socketProxy.ws(req, socket, head);
      });
      socketProxy.on("error", (err, _req, res) => {
        if (config.sentryDSN) {
          captureException(err);
        } else {
          logger().error(`Error in socketProxy. ${err}`);
        }
        res.end("Something wrong happened when connecting to the server.");
      });
    } else if (attach) {
      attach(server);
    }
  });
}

async function prepareFreshDb(opts: any, config: Config) {
  const appDir = fs.realpathSync(process.cwd());
  const pgtmp = path.resolve(appDir, "tools/pg_tmp.sh");
  const pgres = childProcess.spawnSync(pgtmp, ["-t", "-w", opts.freshDb]);
  if (pgres.status !== 0) {
    logger().error("Failed to launch ephemeral postgres.");
    process.exit();
  }
  const dburi = pgres.stdout.toString().trim();
  if (!dburi.startsWith("postgresql://")) {
    logger().info("Got unexpected output from pg_tmp.sh");
    process.exit();
  }
  config.databaseUri = dburi.replace("postgresql", "postgres");
  logger().info(`Using fresh db at ${config.databaseUri}`);

  const expressSessionSchema = path.resolve(
    appDir,
    "node_modules/connect-pg-simple/table.sql"
  );
  const createSessionRes = childProcess.spawnSync(
    "psql",
    [dburi, "-f", expressSessionSchema],
    { env: process.env }
  );
  if (createSessionRes.status !== 0) {
    logger().error("Failed to create express session table.");
    process.exit();
  }
}

export async function appBackendMain() {
  const { opts, config } = setupServerCli();

  if (opts.freshDb > 0) {
    await prepareFreshDb(opts, config);
  }
  await runAppServer(config);
}
