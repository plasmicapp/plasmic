import { logger } from "../deps";
import { getCurrentAuth, startAuth } from "../utils/auth-utils";

export type AuthArgs = {
  check?: boolean;
  host: string;
};

export async function checkCredentials() {
  if (await getCurrentAuth()) {
    logger.info("Plasmic credentials are ok.");
    return;
  }
  logger.info("The authentication credentials are missing or invalid.");
  process.exit(1);
}

export async function auth(args: AuthArgs) {
  if (args.check) {
    return checkCredentials();
  } else {
    await startAuth({ host: args.host });
  }
}
