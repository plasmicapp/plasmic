import { assert } from "@/wab/shared/common";
import { getPublicUrl } from "@/wab/shared/urls";
import memoizeOne from "memoize-one";

export interface Config {
  host: string;
  production: boolean;
  databaseUri: string;
  adminEmails: string[];
  sentryDSN?: string;
  sessionSecret: string;
  mailFrom: string;
  mailUserOps: string;
  mailBcc?: string;
  port?: number;
  terminationGracePeriodMs: number;
  genericWorkerPoolSize: number;
  loaderWorkerPoolSize: number;
}

export const DEFAULT_DATABASE_URI =
  "postgresql://wab@localhost/" + (process.env.WAB_DBNAME || "wab");

const DEFAULT_CONFIG: Config = {
  host: getPublicUrl(),
  databaseUri: DEFAULT_DATABASE_URI,
  sessionSecret: "x",
  mailFrom: "Plasmic <team@example.com>",
  mailUserOps: "ops@example.com",
  production: process.env.NODE_ENV === "production",
  adminEmails:
    process.env.NODE_ENV !== "production" ? ["admin@admin.example.com"] : [],
  terminationGracePeriodMs: 5500,
  genericWorkerPoolSize: 1,
  loaderWorkerPoolSize: 1,
};

export const loadConfig = memoizeOne((): Config => {
  const config = parseConfigFromEnv();

  // Validity checks on config
  if (config.production) {
    assert(process.env["SESSION_SECRET"], "Production missing Session Secret");
    assert(process.env["DATABASE_URI"], "Production missing DB Uri");
    assert(process.env["HOST"], "Production missing Host");
  }

  return config;
});

function parseConfigFromEnv(): Config {
  const config = Object.assign({}, DEFAULT_CONFIG);
  const mailConfig = process.env["MAIL_CONFIG"]
    ? JSON.parse(process.env["MAIL_CONFIG"])
    : undefined;
  const rawTerminationGracePeriodMs =
    process.env["TERMINATION_GRACE_PERIOD_MS"];
  const terminationGracePeriodMs =
    rawTerminationGracePeriodMs != null
      ? parseInt(rawTerminationGracePeriodMs, 10)
      : undefined;

  const envConfig = {
    host: process.env["HOST"],
    databaseUri: process.env["DATABASE_URI"],
    sentryDSN: process.env["SENTRY_DSN"],
    sessionSecret: process.env["SESSION_SECRET"],
    mailFrom: mailConfig?.mailFrom,
    mailUserOps: mailConfig?.mailUserOps,
    mailBcc: mailConfig?.mailBcc,
    adminEmails: process.env["ADMIN_EMAILS"]
      ? (JSON.parse(process.env["ADMIN_EMAILS"]) as string[]).map((email) =>
          email.toLowerCase()
        )
      : undefined,
    terminationGracePeriodMs: terminationGracePeriodMs,
    genericWorkerPoolSize: process.env["GENERIC_WORKER_POOL_SIZE"]
      ? parseInt(process.env["GENERIC_WORKER_POOL_SIZE"], 10)
      : undefined,
    loaderWorkerPoolSize: process.env["LOADER_WORKER_POOL_SIZE"]
      ? parseInt(process.env["LOADER_WORKER_POOL_SIZE"], 10)
      : undefined,
  };

  Object.entries(envConfig).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    config[key] = value;
  });

  return config;
}
