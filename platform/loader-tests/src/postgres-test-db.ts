import { randomUUID } from "crypto";
import execa from "execa";

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

export const POKEDEX_SEED_SQL = `
CREATE TABLE entries (
  id serial PRIMARY KEY,
  name text,
  description text,
  "imageUrl" text,
  inserted_at timestamp with time zone DEFAULT now()
);

INSERT INTO entries (name, description, "imageUrl") VALUES
  ('Pikachu', 'Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png'),
  ('Charmander', 'It has a preference for hot things. When it rains, steam is said to spout from the tip of its tail.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/004.png'),
  ('Bulbasaur', 'There is a plant seed on its back right from the day this Pokémon is born. The seed slowly grows larger.', 'https://assets.pokemon.com/assets/cms2/img/pokedex/full/001.png');
`;

export const TODOMVC_SEED_SQL = `
CREATE SCHEMA todomvc;

CREATE TABLE todomvc.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  owner text NOT NULL,
  description text NOT NULL DEFAULT '',
  done boolean NOT NULL DEFAULT false
);
`;

export async function createPostgresTestDatabase(
  seedSql: string
): Promise<PostgresTestDatabase> {
  const host = process.env.PLAYWRIGHT_POSTGRES_HOST ?? "localhost";
  const port = process.env.PLAYWRIGHT_POSTGRES_PORT ?? "5432";
  const user = process.env.PLAYWRIGHT_POSTGRES_USER ?? "wab";
  const adminUser = process.env.PLAYWRIGHT_POSTGRES_ADMIN_USER ?? "superwab";
  const password =
    process.env.PLAYWRIGHT_POSTGRES_PASSWORD ??
    process.env.WAB_DBPASSWORD ??
    "SEKRET";
  const name = `loader_${randomUUID().replace(/-/g, "")}`;

  const runPsql = (opts: { user: string; database: string; sql: string }) =>
    execa(
      "psql",
      [
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        host,
        "-p",
        port,
        "-U",
        opts.user,
        "-d",
        opts.database,
      ],
      { input: opts.sql, env: { ...process.env, PGPASSWORD: password } }
    );

  const dispose = async () => {
    // FORCE terminates the data source pool's idle sessions
    await runPsql({
      user: adminUser,
      database: "postgres",
      sql: `DROP DATABASE IF EXISTS ${quoteIdentifier(name)} WITH (FORCE);`,
    });
  };

  await runPsql({
    user: adminUser,
    database: "postgres",
    sql: `CREATE DATABASE ${quoteIdentifier(name)} OWNER ${quoteIdentifier(
      user
    )};`,
  });
  try {
    await runPsql({ user, database: name, sql: seedSql });
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
  return `"${value.replace(/"/g, '""')}"`;
}
