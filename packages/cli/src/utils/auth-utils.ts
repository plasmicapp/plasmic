import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import socketio from "socket.io-client";
import path from "upath";
import { v4 as uuidv4 } from "uuid";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { CommonArgs } from "../index";
import { HandledError } from "../utils/error";
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

export type AuthData = {
  user: string;
  token: string;
};

export type CancellablePromise<T> = {
  promise: Promise<T>;
  cancel: () => void;
};

export function authByPolling(
  host: string,
  initToken: string
): CancellablePromise<AuthData> {
  const socket = socketio.connect(host, {
    path: `/api/v1/init-token`,
    transportOptions: {
      polling: {
        extraHeaders: {
          "x-plasmic-init-token": initToken,
        },
      },
    },
  });

  const promise = new Promise<AuthData>((resolve, reject) => {
    socket.on("connect", (reason: string) => {
      logger.info("Waiting for token...");
    });

    socket.on("token", (data: AuthData) => {
      resolve(data);
      socket.close();
    });

    socket.on("error", (error: {}) => {
      logger.warn(error);
      reject(error);
    });
  });

  const cancel = () => {
    socket.close();
  };

  return { promise, cancel };
}

function authByPrompt(host: string) {
  const promise = inquirer.prompt([
    {
      name: "user",
      message: "Your Plasmic user email",
    },
    {
      name: "token",
      message: `Your personal access token (create one at ${host}/self/settings)`,
    },
  ]);

  const cancel = () => {
    logger.info("Cancelling prompt...");
    process.stdin.pause();
  };

  return { promise, cancel };
}

export async function startAuth(opts: CommonArgs & { host: string }) {
  if (opts.yes) {
    throw new HandledError("Plasmic credentials could not be found.");
  }

  const auth = await new Promise<AuthData>((resolve, reject) => {
    let prompt: CancellablePromise<AuthData>;

    const initToken = uuidv4();
    logger.info(
      `Please log into this link: ${opts.host}/auth/plasmic-init/${initToken}`
    );

    const polling = authByPolling(opts.host, initToken);
    polling.promise.then((auth) => {
      if (prompt) {
        prompt.cancel();
      } else {
        clearTimeout(timeout);
      }
      resolve(auth);
    });

    // Default to 1 minute.
    const authPollTimeout =
      Number(process.env.PLASMIC_AUTH_POLL_TIMEOUT) || 60 * 1000;
    if (authPollTimeout === -1) {
      return;
    }
    const timeout = setTimeout(() => {
      logger.info(`We haven't received an auth token from Plasmic yet.`);
      prompt = authByPrompt(opts.host);
      prompt.promise
        .then((auth) => {
          polling.cancel();
          resolve(auth);
        })
        .catch(reject);
    }, authPollTimeout);
  });

  if (!auth.user || !auth.token) {
    logger.error(`Could not get auth token.`);
    return;
  }

  const newAuthFile = opts.auth || path.join(os.homedir(), AUTH_FILE_NAME);

  await writeAuth(newAuthFile, {
    host: opts.host,
    user: auth.user,
    token: auth.token,
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

  if (!authPath && !process.env.PLASMIC_DISABLE_AUTH_SEARCH) {
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

function failAuth() {
  throw new HandledError(
    `Unable to authenticate Plasmic. Please run 'plasmic auth'.`
  );
}

export async function getOrStartAuth(
  opts: CommonArgs & { host: string; enableSkipAuth?: boolean }
) {
  let auth = await getCurrentAuth(opts.auth);
  if (!auth && opts.enableSkipAuth) {
    return;
  }
  if (!auth && opts.yes) {
    failAuth();
  }
  if (!auth) {
    await startAuth(opts);
    auth = await getCurrentAuth(opts.auth);
  }
  if (!auth) {
    failAuth();
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

export async function writeAuth(authFile: string, config: AuthConfig) {
  await writeFileContentRaw(authFile, JSON.stringify(config, undefined, 2), {
    force: true,
  });
  fs.chmodSync(authFile, "600");
}
