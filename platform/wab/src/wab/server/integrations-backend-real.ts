// newrelic must be imported as early as possible, so we shift config loading to
// the top so that we know if we are running production and want newrelic.
import {
  addAppAuthRoutes,
  addCmsPublicRoutes,
  addIntegrationsRoutes,
  createApp,
} from "@/wab/server/AppServer";
import { Config } from "@/wab/server/config";
import {
  ensureDbConnections,
  maybeMigrateDatabase,
} from "@/wab/server/db/DbCon";
import { addInternalIntegrationsRoutes } from "@/wab/server/routes/custom-routes";
import { runExpressApp, setupServerCli } from "@/wab/server/server-common";
import "core-js";

async function runAppServer(config: Config) {
  await ensureDbConnections(config.databaseUri, {
    defaultPoolSize: 50,
  });
  await maybeMigrateDatabase();

  const { app } = await createApp(
    "integrations",
    config,
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
