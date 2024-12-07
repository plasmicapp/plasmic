/**
 * This module handles loading secrets from secrets.json.
 *
 * Plasmic should run without any secrets.json file.
 * But for testing some features, you'll need to set up certain variables.
 *
 * By default, secrets are read from ~/.plasmic/secrets.json.
 */

import { ensure, uncheckedCast } from "@/wab/shared/common";
import fs from "fs";
import * as os from "os";

interface Secrets {
  google?: {
    /** AKA consumer key */
    clientId: string;
    /** AKA consumer secret */
    clientSecret: string;
  };
  airtableSso?: {
    clientId: string;
    clientSecret: string;
  };
  "google-sheets"?: {
    /** AKA consumer key */
    clientId: string;
    /** AKA consumer secret */
    clientSecret: string;
  };
  encryptionKey?: string;
  dataSourceOperationEncryptionKey?: string;
  smtpAuth?: {
    user: string;
    pass: string;
  };
  intercomToken?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  github?: {
    appId: number;
    privateKey: string;
    oauth: {
      clientId: string;
      clientSecret: string;
    };
  };
  stripe?: {
    secretKey: string;
  };
  vercel?: {
    plasmicHostingSecret: string;
    projectId: string;
    teamId: string;
    authBearerToken: string;
  };
  discourse?: {
    discourseConnectSecret?: string;
    apiKey?: string;
  };
  clickhouse?: {
    host: string;
    port: number;
    username: string;
    password: string;
    database?: string;
  };
}

export function getEncryptionKey() {
  return loadSecrets().encryptionKey ?? "fake";
}

export function getOpEncryptionKey() {
  return loadSecrets().dataSourceOperationEncryptionKey ?? "fake";
}

export function getGoogleClientId() {
  return loadSecrets().google?.clientId ?? "fake";
}

export function getGoogleClientSecret() {
  return loadSecrets().google?.clientSecret ?? "fake";
}

export function getSmtpAuth() {
  return loadSecrets().smtpAuth;
}

export function getIntercomToken() {
  return loadSecrets().intercomToken;
}

export function getGithubSecrets() {
  return loadSecrets().github;
}

export function getStripeSecrets() {
  return loadSecrets().stripe;
}

export function getAirtableSsoSecrets() {
  return loadSecrets().airtableSso;
}

export function getGoogleSheetsClientId() {
  return loadSecrets()["google-sheets"]?.clientId;
}

export function getGoogleSheetsClientSecret() {
  return loadSecrets()["google-sheets"]?.clientSecret;
}

export function getOpenaiApiKey() {
  return loadSecrets().openaiApiKey;
}

export function getAnthropicApiKey() {
  return loadSecrets().anthropicApiKey;
}

export function getDiscourseConnectSecret() {
  return ensure(
    loadSecrets().discourse?.discourseConnectSecret,
    "DiscourseConnect secret required"
  );
}

export function getDiscourseApiKey() {
  return ensure(loadSecrets().discourse?.apiKey, "Discourse API key required");
}

export function getVercelSecrets() {
  return ensure(loadSecrets().vercel, "Vercel secrets required");
}

export function getClickhouseSecrets() {
  return loadSecrets().clickhouse;
}

export function loadSecrets(): Secrets {
  const path = getSecretsFile();
  if (!fs.existsSync(path)) {
    return {};
  }
  return uncheckedCast<Secrets>(
    JSON.parse(fs.readFileSync(path, { encoding: "utf8" }))
  );
}

function getSecretsFile() {
  return (
    process.env.PLASMIC_SECRETS_FILE || `${os.homedir()}/.plasmic/secrets.json`
  );
}

export function updateSecrets(updates: Partial<Secrets>) {
  const existing = loadSecrets();
  const updated = { ...existing, ...updates };
  fs.writeFileSync(getSecretsFile(), JSON.stringify(updated));
}
