import { logger } from "../deps";
import { getCurrentAuth } from "../utils/config-utils";

export type AuthArgs = {
  check?: boolean;
};

export async function checkCredentials() {
  await getCurrentAuth();
  logger.info("Plasmic credentials are ok.");
}

export async function auth(args: AuthArgs) {
  if (args.check) {
    return checkCredentials();
  }
  // TODO: perhaps initialize auth flow?
}
