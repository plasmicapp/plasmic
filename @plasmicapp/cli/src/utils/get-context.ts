import * as Sentry from "@sentry/node";
import path from "upath";
import { initPlasmic } from "../actions/init";
import { PlasmicApi } from "../api";
import { logger } from "../deps";
import { CommonArgs } from "../index";
import { runNecessaryMigrationsConfig } from "../migrations/migrations";
import { HandledError } from "../utils/error";
import { confirmWithUser } from "../utils/user-utils";
import { getCurrentAuth } from "./auth-utils";
import {
  DEFAULT_HOST,
  findConfigFile,
  LOCK_FILE_NAME,
  PlasmicContext,
  PlasmicLock,
  readConfig,
} from "./config-utils";
import { existsBuffered, readFileText } from "./file-utils";
import { ensure } from "./lang-utils";
import { getCliVersion } from "./npm-utils";

function createPlasmicLock(): PlasmicLock {
  return {
    projects: [],
    cliVersion: getCliVersion(),
  };
}

export function readLock(lockFile: string): PlasmicLock {
  if (!existsBuffered(lockFile)) {
    return createPlasmicLock();
  }
  try {
    const result = JSON.parse(readFileText(lockFile!)) as PlasmicLock;
    return {
      ...result,
    };
  } catch (e) {
    logger.error(
      `Error encountered reading ${LOCK_FILE_NAME} at ${lockFile}: ${e}`
    );
    throw e;
  }
}

export async function getContext(args: CommonArgs): Promise<PlasmicContext> {
  const auth = await getOrInitAuth(args);

  /** Sentry */
  if (auth.host.startsWith(DEFAULT_HOST)) {
    // Production usage of cli
    Sentry.init({
      dsn:
        "https://3ed4eb43d28646e381bf3c50cff24bd6@o328029.ingest.sentry.io/5285892",
    });
    Sentry.configureScope((scope) => {
      scope.setUser({ email: auth.user });
      scope.setExtra("cliVersion", getCliVersion());
      scope.setExtra("args", JSON.stringify(args));
      scope.setExtra("host", auth.host);
    });
  }

  /** PlasmicConfig **/
  let configFile =
    args.config || findConfigFile(process.cwd(), { traverseParents: true });

  if (!configFile) {
    await maybeRunPlasmicInit(args, "plasmic.json");
    configFile = findConfigFile(process.cwd(), { traverseParents: true });
    if (!configFile) {
      const err = new HandledError(
        "No plasmic.json file found. Please run `plasmic init` first."
      );
      throw err;
    }
  }
  await runNecessaryMigrationsConfig(configFile, args.yes);
  const config = readConfig(configFile);
  const rootDir = path.dirname(configFile);

  /** PlasmicLock */
  // plasmic.lock should be in the same directory as plasmic.json
  const lockFile = path.join(rootDir, LOCK_FILE_NAME);
  const lock = readLock(lockFile);

  return {
    config,
    configFile,
    lock,
    lockFile,
    rootDir,
    absoluteSrcDir: path.isAbsolute(config.srcDir)
      ? config.srcDir
      : path.resolve(rootDir, config.srcDir),
    auth,
    api: new PlasmicApi(auth),
    cliArgs: args,
  };
}

async function getOrInitAuth(args: CommonArgs) {
  const auth = await getCurrentAuth(args.auth);

  if (auth) {
    return auth;
  }

  if (await maybeRunPlasmicInit(args, ".plasmic.auth")) {
    return ensure(await getCurrentAuth());
  }

  // Could not find the authentication credentials and the user
  // declined to run plasmic init.
  process.exit(1);
}

export async function maybeRunPlasmicInit(
  args: CommonArgs,
  missingFile: string
): Promise<boolean> {
  const answer = await confirmWithUser(
    `No ${missingFile} file found. Would you like to run \`plasmic init\`?`,
    args.yes
  );

  if (!answer) {
    return false;
  }

  await initPlasmic({
    host: DEFAULT_HOST,
    platform: "",
    codeLang: "",
    codeScheme: "",
    styleScheme: "",
    imagesScheme: "",
    srcDir: "",
    plasmicDir: "",
    imagesPublicDir: "",
    imagesPublicUrlPrefix: "",
    ...args,
  });
  return true;
}
