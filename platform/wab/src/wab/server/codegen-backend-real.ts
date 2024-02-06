// newrelic must be imported as early as possible, so we shift config loading to
// the top so that we know if we are running production and want newrelic.
import "core-js";
import { addCodegenRoutes, createApp } from "./AppServer";
import { Config } from "./config";
import { ensureDbConnections } from "./db/DbCon";
import { runExpressApp, setupServerCli } from "./server-common";

async function runAppServer(config: Config) {
  await ensureDbConnections(config.databaseUri);

  const { app } = await createApp("codegen", config, addCodegenRoutes);
  return runExpressApp(app);
}

export async function codegenBackendMain() {
  const { opts, config } = setupServerCli();
  await runAppServer(config);
}
