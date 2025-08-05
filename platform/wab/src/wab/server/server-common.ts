import { loadConfig } from "@/wab/server/config";
import { closeDbConnections } from "@/wab/server/db/DbCon";
import { initializeGlobals } from "@/wab/server/svr-init";
import { createTerminus, HealthCheckError } from "@godaddy/terminus";
import { Application } from "express";
import http from "http";

export function runExpressApp(
  app: Application,
  setupServer?: (server: http.Server) => void
) {
  const server = http.createServer(app);
  const config = loadConfig();

  server.keepAliveTimeout = 185 * 1000;
  server.headersTimeout = 190 * 1000;

  setupServer?.(server);

  let isServerRunning = false;

  // Add graceful shutdown to the server.
  // Uses the "stoppable" package to change shutdown behavior so that:
  //  - new connections are not accepted
  //  - existing idle connections are closed
  //  - existing active connections are given a grace period before being
  //    terminated
  createTerminus(server, {
    // If the server is shutting down, healthcheck endpoints return 503. Else,
    // the handler function is run. This is useful for load balancers.
    healthChecks: {
      "/healthcheck": ({ state }) => {
        if (state.isShuttingDown || !isServerRunning) {
          throw new HealthCheckError("Server is not ready", {
            shutdown: state.isShuttingDown,
            running: isServerRunning,
          });
        }
        return Promise.resolve();
      },
    },
    signals: ["SIGTERM", "SIGINT"], // send this signal to begin graceful shutdown
    timeout: 125000, // wait this many ms before force closing active conns
    beforeShutdown: () => {
      console.log(`Received signal to shut down...`);
      // This has to be greater than the number of seconds defined
      // in the readiness probe "periodSeconds"
      return new Promise((resolve) =>
        setTimeout(resolve, config.terminationGracePeriodMs)
      );
    },
    onSignal: async () => {
      await closeDbConnections();
    },
    onShutdown: async () => {
      console.log(`Shutdown complete, exiting...`);
    },
    logger: (msg, err) => {
      console.log(`Shutdown error:`, msg, err);
    },
    useExit0: true,
  });

  /**
   * Start Express server.
   */
  return server.listen(app.get("port"), () => {
    console.log(`
App ${app.get("name")} is running at http://localhost:${app.get(
      "port"
    )} in ${app.get("env")} mode
Press CTRL-C to stop immediately.
Send SIGINT to shutdown gracefully: kill -INT ${process.pid}
`);
    // Let PM2 parent process know we're ready.
    if (process.send) {
      process.send("ready");
    }
    isServerRunning = true;
  });
}

export function setupServerCli(argv: string[] = process.argv) {
  const { Command } = require("commander");
  const opts = new Command("plasmic server")
    .option(
      "--freshDb <n>",
      "Start an ephemeral pg instance that self-terminates in n seconds",
      Number
    )
    .parse(argv)
    .opts();
  const config = loadConfig();

  initializeGlobals();
  return { opts, config };
}
