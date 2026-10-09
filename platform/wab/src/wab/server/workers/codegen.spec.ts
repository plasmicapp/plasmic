/**
 * @vitest-environment node
 */
import { createDatabase } from "@/wab/server/__testonly__/backend-util";
import { closeDbConnections } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { LOADER_CODEGEN_OPTS_DEFAULTS } from "@/wab/server/loader/gen-code-bundle";
import { workerGenCode } from "@/wab/server/workers/codegen";
import { Connection, getConnection } from "typeorm";

describe("workerGenCode", () => {
  let con: Connection;
  let projectId: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ con, cleanup } = await createDatabase("codegen_worker"));
    await con.transaction(async (em) => {
      const { projects } = await seedTestUserAndProjects(
        em,
        { email: "user@example.com" },
        1,
      );
      projectId = projects[0].id;
    });
  });

  afterAll(async () => {
    await closeDbConnections();
    await cleanup();
  });

  it("uses no transaction and keeps its pools between tasks", async () => {
    const idleInTx: number[] = [];
    const spy = vi
      .spyOn(DbMgr.prototype, "getDomainsForProject")
      .mockImplementation(async () => {
        const [{ n }] = await con.query(
          `select count(*)::int as n from pg_stat_activity
           where datname = current_database() and state = 'idle in transaction'`,
        );
        idleInTx.push(n);
        return [];
      });
    const genCode = () =>
      workerGenCode({
        connectionOptions: con.options,
        projectId,
        scheme: "blackbox",
        indirect: false,
        exportOpts: {
          ...LOADER_CODEGEN_OPTS_DEFAULTS,
          platform: "react",
          platformOptions: {},
        },
      });
    try {
      await genCode();
      const pool = getConnection();
      await genCode();
      expect(idleInTx).toEqual([0, 0]);
      // Not toBe(): a failing diff of a Connection never finishes printing.
      expect(getConnection() === pool && pool.isConnected).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
