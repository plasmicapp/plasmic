import * as config from "./config";
import * as Sentry from "@sentry/node";

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    defaultIntegrations: false,
  });
  Sentry.configureScope((scope) => {
    scope.setExtra("loaderVersion", config.packageJson.version);
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
