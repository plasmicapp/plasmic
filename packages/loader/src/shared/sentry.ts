import * as config from "./config";
import * as Sentry from "@sentry/node";
import { PluginOptions } from "./types";

export async function setUser(email: string) {
  if (!config.sentryDsn) {
    return;
  }

  Sentry.configureScope((scope) => {
    scope.setUser({ email });
  });
}

export async function initSentry(options: PluginOptions) {
  if (!config.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: config.sentryDsn,
    defaultIntegrations: false,
  });

  Sentry.configureScope((scope) => {
    scope.setExtra("loaderVersion", config.packageJson.version);
    scope.setExtra("nodeVersion", process.version);
    scope.setExtra("projects", options.projects);
    scope.setExtra("config", JSON.stringify(options));
  });
}

export async function captureException(err: Error) {
  if (!config.sentryDsn) {
    return;
  }
  Sentry.captureException(err);

  // Give sentry 2s to send pending events.
  return Sentry.close(2000);
}
