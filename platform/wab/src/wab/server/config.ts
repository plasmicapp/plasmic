import { assert } from "@/wab/common";
import { getPublicUrl } from "@/wab/urls";

export interface Config {
  host: string;
  production: boolean;
  databaseUri: string;
  sentryDSN?: string;
  sessionSecret: string;
  mailFrom: string;
  mailUserOps: string;
  mailBcc?: string;
  port?: number;
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
};

export function loadConfig(): Config {
  const config = parseConfigFromEnv();

  // Validity checks on config
  if (config.production) {
    assert(process.env["SESSION_SECRET"], "Production missing Session Secret");
    assert(process.env["DATABASE_URI"], "Production missing DB Uri");
    assert(process.env["HOST"], "Production missing Host");
  }

  return config;
}

function parseConfigFromEnv(): Config {
  const config = Object.assign({}, DEFAULT_CONFIG);
  const mailConfig = process.env["MAIL_CONFIG"]
    ? JSON.parse(process.env["MAIL_CONFIG"])
    : undefined;
  const envConfig = {
    host: process.env["HOST"],
    databaseUri: process.env["DATABASE_URI"],
    sentryDSN: process.env["SENTRY_DSN"],
    sessionSecret: process.env["SESSION_SECRET"],
    mailFrom: mailConfig?.mailFrom,
    mailUserOps: mailConfig?.mailUserOps,
    mailBcc: mailConfig?.mailBcc,
  };

  Object.entries(envConfig).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    config[key] = value;
  });

  return config;
}
