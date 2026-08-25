import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export interface PostgresTestDatabase {
  connection: {
    host: string;
    port: string;
    name: string;
    user: string;
    password: string;
  };
  dispose: () => Promise<void>;
}

const SEED_SQL = `
CREATE TABLE customers (
  customer_id text PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text,
  city text
);

INSERT INTO customers (customer_id, company_name, contact_name, city) VALUES
  ('ALFKI', 'Alfreds Futterkiste', 'Maria Anders', 'Berlin'),
  ('ANATR', 'Ana Trujillo Emparedados y helados', 'Ana Trujillo', 'México D.F.'),
  ('ANTON', 'Antonio Moreno Taquería', 'Antonio Moreno', 'México D.F.'),
  ('AROUT', 'Around the Horn', 'Thomas Hardy', 'London'),
  ('BERGS', 'Berglunds snabbköp', 'Christina Berglund', 'Luleå');

CREATE TABLE products (
  product_id integer PRIMARY KEY,
  product_name text NOT NULL
);

INSERT INTO products (product_id, product_name)
SELECT product_id, 'Product ' || product_id
FROM generate_series(1, 10) AS generated(product_id);
`;

export async function createPostgresTestDatabase(): Promise<PostgresTestDatabase> {
  const host = process.env.PLAYWRIGHT_POSTGRES_HOST ?? "localhost";
  const port = process.env.PLAYWRIGHT_POSTGRES_PORT ?? "5432";
  const user = process.env.PLAYWRIGHT_POSTGRES_USER ?? "wab";
  const adminUser = process.env.PLAYWRIGHT_POSTGRES_ADMIN_USER ?? "superwab";
  const password =
    process.env.PLAYWRIGHT_POSTGRES_PASSWORD ??
    process.env.WAB_DBPASSWORD ??
    "SEKRET";
  const name = `playwright_${randomUUID().replaceAll("-", "")}`;

  const runAsUser = (database: string, sql: string) =>
    runPsql({ host, port, user, password, database, sql });
  const runAsAdmin = (database: string, sql: string) =>
    runPsql({ host, port, user: adminUser, password, database, sql });

  const dispose = async () => {
    // FORCE terminates the data source pool's idle sessions
    await runAsAdmin(
      "postgres",
      `DROP DATABASE IF EXISTS ${quoteIdentifier(name)} WITH (FORCE);`
    );
  };

  await runAsAdmin(
    "postgres",
    `CREATE DATABASE ${quoteIdentifier(name)} OWNER ${quoteIdentifier(user)};`
  );
  try {
    await runAsUser(name, SEED_SQL);
  } catch (error) {
    await dispose();
    throw error;
  }

  return {
    connection: {
      host: process.env.PLAYWRIGHT_POSTGRES_DATA_SOURCE_HOST ?? host,
      port,
      name,
      user,
      password,
    },
    dispose,
  };
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function runPsql(opts: {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  sql: string;
}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "psql",
      [
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        opts.host,
        "-p",
        opts.port,
        "-U",
        opts.user,
        "-d",
        opts.database,
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: opts.password,
        },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    let stderr = "";
    child.stdout.resume();
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`psql exited with code ${code}: ${stderr}`));
      }
    });
    child.stdin.end(opts.sql);
  });
}
