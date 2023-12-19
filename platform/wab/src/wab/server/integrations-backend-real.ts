// newrelic must be imported as early as possible, so we shift config loading to
// the top so that we know if we are running production and want newrelic.
import { addInternalIntegrationsRoutes } from "@/wab/server/routes/custom-routes";
import "core-js";
import {
  addAppAuthRoutes,
  addCmsPublicRoutes,
  addIntegrationsRoutes,
  createApp,
} from "./AppServer";
import { Config } from "./config";
import { ensureDbConnections, maybeMigrateDatabase } from "./db/DbCon";
import { runExpressApp, setupServerCli } from "./server-common";

async function runAppServer(config: Config) {
  await ensureDbConnections(config.databaseUri, {
    defaultPoolSize: 50,
  });
  await maybeMigrateDatabase();

  const { app } = await createApp(
    "integrations",
    config,
    undefined,
    (app_) => {
      addCmsPublicRoutes(app_);
      addIntegrationsRoutes(app_);
      addAppAuthRoutes(app_);
      addInternalIntegrationsRoutes(app_);
    },
    undefined,
    { skipSession: true }
  );
  return runExpressApp(app);
}

export async function serverDataBackendMain() {
  const { opts, config } = setupServerCli();
  await runAppServer(config);
}
