import { runAppServer } from "@/wab/server/app-backend-real";
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { initDb } from "@/wab/server/db/DbInitUtil";
import { DbMgr, normalActor, SUPER_USER } from "@/wab/server/db/DbMgr";
import { Project, User } from "@/wab/server/entities/Entities";
import { ensure, range } from "@/wab/shared/common";
import getPort from "get-port";
import { customAlphabet } from "nanoid";
import { lowercase, numbers } from "nanoid-dictionary";
import { EntityManager } from "typeorm";

export async function withDb(
  f: (
    sudo: DbMgr,
    users: User[],
    dbs: (() => DbMgr)[],
    project: Project,
    em: EntityManager,
    dburi: string
  ) => Promise<void>,
  opts?: {
    numUsers?: number;
  }
): Promise<void> {
  await withDatabase(async (dburi, dbname) => {
    const con = await ensureDbConnection(dburi, dbname);
    await con.transaction(async (em) => {
      const sudo = new DbMgr(em, SUPER_USER);
      const users = await Promise.all(
        range(1, opts?.numUsers ?? 3, true).map(async (num) => {
          const user = await sudo.createUser({
            email: `yang${num}@test.com`,
            firstName: `Yang${
              num === 1 ? "one" : num === 2 ? "two" : num === 3 ? "three" : num
            }`,
            lastName: "Zhang",
            password: "!53kr3tz!",
            needsIntroSplash: false,
            needsSurvey: false,
            needsTeamCreationPrompt: false,
          });
          await sudo.markEmailAsVerified(user);
          return user;
        })
      );
      // Always discard the cache since perms are changing.
      const dbs = users.map(
        (user) => () => new DbMgr(em, normalActor(user.id))
      );
      const { workspace } = await getTeamAndWorkspace(dbs[0]());
      const { project } = await dbs[0]().createProject({
        name: `My Project`,
        workspaceId: workspace.id,
      });
      await f(sudo, users, dbs, project, em, dburi);
    });
  });
}

async function withDatabase(
  f: (dburi: string, dbname: string) => Promise<void>
) {
  const { dburi, dbname, cleanup } = await createDatabase();
  try {
    await f(dburi, dbname);
  } finally {
    await cleanup();
  }
}

export type DbTestArgs = Parameters<Parameters<typeof withDb>[0]>;

export async function getTeamAndWorkspace(db1: DbMgr) {
  const teams = (await db1.getAffiliatedTeams()).filter(
    (it) => !it.personalTeamOwnerId
  );
  const team = ensure(teams[0], "");
  const workspaces = await db1.getWorkspacesByTeams(teams.map((t) => t.id));
  const workspace = ensure(workspaces[0], "");
  return { team, workspace };
}

/**
 * In CI, creates DB with random name and drops DB in cleanup.
 * In non-CI, creates DB with wab_dev_<name> and doesn't drop in cleanup,
 * allowing you to inspect the database after the test.
 */
export async function createDatabase(name = "test") {
  const isCI = !!process.env.CI;
  const dbname = isCI ? dbNameGen(name) : `wab_dev_${name}`;
  const sucon = await ensureDbConnection(
    "postgresql://superwab@localhost/postgres",
    "super"
  );
  await sucon.query("select 1");
  await sucon.query(`drop database if exists ${dbname} with (force);`);
  await sucon.query(`create database ${dbname} owner wab;`);
  await sucon.query(`grant pg_signal_backend to wab;`);
  const dburi = `postgresql://wab@localhost/${dbname}`;
  const con = await ensureDbConnection(dburi, dbname);
  await con.synchronize();
  await con.transaction(async (em) => {
    await initDb(em);
  });

  return {
    dbname,
    dburi,
    cleanup: async () => {
      await con.close();
      if (isCI) {
        await sucon.query(`drop database if exists ${dbname} with (force);`);
      }
      await sucon.close();
    },
  };
}

export async function createBackend(
  dburi: string,
  opts?: {
    preferredPorts?: number[];
  }
) {
  const port = await getPort(
    // Casting as any because the type definition is behind
    (opts?.preferredPorts ? { port: opts.preferredPorts } : undefined) as any
  );

  return await withEnvOverrides(
    {
      BACKEND_PORT: port,
    },
    async () => {
      const server = await runAppServer({
        databaseUri: dburi,
        port: port,
        host: `http://localhost:${port}`,
        adminEmails: [],
        production: false,
        sessionSecret: "secret",
        mailFrom: "",
        mailUserOps: "",
        mailBcc: "",
      });

      return {
        host: `http://localhost:${port}`,
        cleanup: async () => server.close(),
      };
    }
  );
}

async function withEnvOverrides<T>(
  overrides: Record<string, any>,
  f: () => Promise<T>
) {
  const origValues = Object.fromEntries(
    Object.keys(overrides).map((key) => [
      key,
      key in process.env ? process.env[key] : null,
    ])
  );
  try {
    for (const [key, val] of Object.entries(overrides)) {
      process.env[key] = val;
    }
    return await f();
  } finally {
    for (const [key, origVal] of Object.entries(origValues)) {
      if (origVal === null) {
        delete process.env[key];
      } else {
        process.env[key] = origVal;
      }
    }
  }
}

const randomPartGen = customAlphabet(lowercase + numbers, 10);

function dbNameGen(namePart: string) {
  const date = new Date();
  const datePart =
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0") +
    "_" +
    String(date.getHours()).padStart(2, "0") +
    String(date.getMinutes()).padStart(2, "0") +
    String(date.getSeconds()).padStart(2, "0");
  return `wab_${namePart}_${datePart}_${randomPartGen()}`;
}
