import { createTerminus } from "@godaddy/terminus";
import * as http from "http";
import { createApp, loadConfig } from "./server";

function spawn(promise: Promise<any>) {}

const { Command } = require("commander");
const opts = new Command("plasmic server")
  .option("-c, --config <c>", "Server config")
  .parse(process.argv);
const config = loadConfig(opts.config);

async function run() {
  const app = await createApp(config);
  const server = http.createServer(app);

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
      "/healthcheck": async () => true,
    },
    signal: "SIGINT", // send this signal to begin graceful shutdown
    timeout: 5000, // wait this many ms before force closing active conns
  });

  /**
   * Start Express server.
   */
  return server.listen(app.get("port"), () => {
    console.log(`
App is running at http://localhost:${app.get("port")} in ${app.get("env")} mode
Press CTRL-C to stop immediately.
Send SIGINT to shutdown gracefully: kill -INT ${process.pid}
`);
    // Let PM2 parent process know we're ready.
    if (process.send) {
      process.send("ready");
    }
  });
}

async function main() {
  console.log("__");
  await run();
}

spawn(main());
