import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import path from "upath";
import { v4 as uuidv4 } from "uuid";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { CommonArgs } from "../index";
import { HandledError } from "../utils/error";
import { pollAuthToken } from "../utils/poll-token";
import {
  AuthConfig,
  AUTH_FILE_NAME,
  DEFAULT_HOST,
  ENV_AUTH_HOST,
  ENV_AUTH_TOKEN,
  ENV_AUTH_USER,
} from "./config-utils";
import {
  existsBuffered,
  findFile,
  readFileText,
  writeFileContentRaw,
} from "./file-utils";

export async function startAuth(opts: CommonArgs & { host: string }) {
  if (opts.yes) {
    throw new HandledError("Plasmic credentials could not be found.");
  }
  const { email } = await inquirer.prompt([
    {
      name: "email",
      message: "Your Plasmic user email",
    },
  ]);

  const initToken = uuidv4();
  logger.info(
    `Please log into this link: ${opts.host}/auth/plasmic-init/${initToken}`
  );

  let authToken: string;
  try {
    authToken = await pollAuthToken(opts.host, email, initToken);
  } catch (e) {
    console.error(`Could not get auth token from Plasmic: ${e}`);
    return;
  }

  const newAuthFile = opts.auth || path.join(os.homedir(), AUTH_FILE_NAME);
  writeAuth(newAuthFile, {
    host: opts.host,
    user: email,
    token: authToken,
  });

  logger.info(
    `Successfully created Plasmic credentials file at ${newAuthFile}`
  );
}

export function readAuth(authFile: string) {
  if (!existsBuffered(authFile)) {
    throw new HandledError(`No Plasmic auth file found at ${authFile}`);
  }
  try {
    const parsed = JSON.parse(readFileText(authFile)) as AuthConfig;
    // Strip trailing slashes.
    return {
      ...parsed,
      host: parsed.host.replace(/\/+$/, ""),
    };
  } catch (e) {
    logger.error(
      `Error encountered reading plasmic credentials at ${authFile}: ${e}`
    );
    throw e;
  }
}

export function getEnvAuth(): AuthConfig | undefined {
  const host = process.env[ENV_AUTH_HOST];
  const user = process.env[ENV_AUTH_USER];
  const token = process.env[ENV_AUTH_TOKEN];

  // both user and token are required
  if (!user || !token) {
    // Try to give a hint if they partially entered a credential
    if (user || token) {
      logger.warn(
        `Your Plasmic credentials were only partially set via environment variables. Try both ${ENV_AUTH_USER} and ${ENV_AUTH_TOKEN}`
      );
    }
    return;
  }

  return {
    host: host ?? DEFAULT_HOST,
    user,
    token,
  };
}

function readCurrentAuth(authPath?: string) {
  const authFromEnv = getEnvAuth();
  if (authFromEnv) return authFromEnv;

  if (!authPath) {
    authPath = findAuthFile(process.cwd(), { traverseParents: true });
  }
  if (!authPath) {
    return undefined;
  }
  return readAuth(authPath);
}

export async function getCurrentAuth(authPath?: string) {
  const auth = readCurrentAuth(authPath);
  if (!auth) {
    return undefined;
  }
  const api = new PlasmicApi(auth);
  try {
    await api.getCurrentUser();
    return auth;
  } catch (e) {
    if (e.response?.status === 401) {
      logger.error(`The current credentials expired or are not valid.`);
      return undefined;
    }
    throw e;
  }
}

export async function getOrStartAuth(opts: CommonArgs & { host: string }) {
  let auth = await getCurrentAuth(opts.auth);
  if (!auth && opts.yes) {
    throw new HandledError("Could not find the authentication credentials.");
  }
  if (!auth) {
    await startAuth(opts);
    auth = await getCurrentAuth(opts.auth);
  }
  if (!auth) {
    throw new HandledError("Could not find the authentication credentials.");
  }
  return auth;
}

export function findAuthFile(
  dir: string,
  opts: {
    traverseParents?: boolean;
  }
) {
  let file = findFile(dir, (f) => f === AUTH_FILE_NAME, opts);
  if (!file) {
    file = findFile(os.homedir(), (f) => f === AUTH_FILE_NAME, {
      traverseParents: false,
    });
  }
  return file;
}

export function writeAuth(authFile: string, config: AuthConfig) {
  writeFileContentRaw(authFile, JSON.stringify(config, undefined, 2), {
    force: true,
  });
  fs.chmodSync(authFile, "600");
}
