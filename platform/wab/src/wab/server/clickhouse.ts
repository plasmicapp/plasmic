import { getClickhouseSecrets } from "@/wab/server/secrets";
import { createClient } from "@clickhouse/client";

export const getClickHouseConnection = () => {
  const config = getClickhouseSecrets();
  const client = createClient({
    host: config?.host ?? "http://clickhouse-db.plasmic.app",
    username: config?.username ?? process.env.CLICKHOUSE_USER ?? "admin",
    password: config?.password ?? process.env.CLICKHOUSE_PASS ?? "",
    database: config?.database ?? process.env.CLICKHOUSE_DB ?? "posthog",
  });
  return client;
};
