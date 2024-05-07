// newrelic must be imported as early as possible, so we shift config loading to
// the top so that we know if we are running production and want newrelic.
import { addCodegenRoutes, createApp } from "@/wab/server/AppServer";
import { Config } from "@/wab/server/config";
import { ensureDbConnections } from "@/wab/server/db/DbCon";
import { runExpressApp, setupServerCli } from "@/wab/server/server-common";
import "core-js";

async function runAppServer(config: Config) {
  await ensureDbConnections(config.databaseUri);

  const { app } = await createApp("codegen", config, addCodegenRoutes);
  return runExpressApp(app);
}

export async function codegenBackendMain() {
  const { opts, config } = setupServerCli();
  await runAppServer(config);
}
