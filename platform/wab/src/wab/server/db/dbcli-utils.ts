import { DEFAULT_DATABASE_URI } from "@/wab/server/config";
import { logger } from "@/wab/server/observability";
import { parse as parseDbUri } from "pg-connection-string";
import { createConnection, getConnectionOptions } from "typeorm";

export async function createDbConnection(dburi?: string) {
  dburi = dburi ?? DEFAULT_DATABASE_URI;
  const password = process.env.WAB_DBPASSWORD;
  logger().info(
    `Connecting to ${dburi} ${
      password ? `with WAB_DBPASSWORD` : `without env password`
    }`
  );
  const options = Object.assign(
    {},
    await getConnectionOptions(),

    // We parse dbUri into its component options, instead of specifying
    // `url:`, because we can't use `url:` in combination with `password:`
    parseDbUri(dburi),
    password
      ? {
          password,
        }
      : {}
  );
  return await createConnection(options);
}
