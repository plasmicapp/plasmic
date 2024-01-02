import { assert } from "@/wab/common";
import { getPublicUrl } from "@/wab/urls";
import * as fs from "fs";

export interface Config {
  host: string;
  production: boolean;
  databaseUri: string;
  sentryDSN?: string;
  sessionSecret: string;
  sessionSecretFile?: string;
  cluster: boolean;
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
  mailFrom: "Plasmic <team@plasmic.app>",
  mailUserOps: "ops@plasmic.app",
  production: process.env.NODE_ENV === "production",
  cluster: false,
};

export function loadConfig(file?: string): Config {
  const config = Object.assign({}, DEFAULT_CONFIG);
  if (file && fs.existsSync(file)) {
    console.log("Loading config from file: ", file);
    Object.assign(config, JSON.parse(fs.readFileSync(file).toString()));
  }

  if (config.sessionSecretFile && fs.existsSync(config.sessionSecretFile)) {
    console.log("Loading session secret from file: ", config.sessionSecretFile);
    config.sessionSecret = fs.readFileSync(config.sessionSecretFile).toString();
  }

  // Validity checks on config
  if (config.production) {
    if (config.sessionSecret === "x") {
      throw new Error("Must set session secret.");
    }
    const prodDbUri = process.env["DATABASE_URI"];
    assert(prodDbUri, "Production missing DB Uri");
    config.databaseUri = prodDbUri;
  }

  return config;
}
