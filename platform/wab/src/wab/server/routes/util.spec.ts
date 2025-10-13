import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { GenericKeyValue } from "@/wab/server/entities/Entities";
import {
  commitTransaction,
  rollbackTransaction,
  startTransaction,
} from "@/wab/server/routes/util";
import { createDatabase } from "@/wab/server/test/backend-util";
import { Request } from "express";
import { Connection } from "typeorm";
import { IsolationLevel } from "typeorm/driver/types/IsolationLevel";
import { EntityManager } from "typeorm/entity-manager/EntityManager";

/**
 * FakeConnection simulates a database connection with transaction support.
 * It tracks whether transactions were committed or rolled back.
 */
class FakeConnection extends Connection {
  txEnds: ("commit" | "rollback")[] = [];

  constructor() {
    super({
      type: "postgres",
    });
  }

  /**
   * Wraps given function execution (and all operations made there) into a transaction.
   * All database operations must be executed using provided entity manager.
   */
  transaction<T>(
    runInTransaction: (entityManager: EntityManager) => Promise<T>
  ): Promise<T>;
  transaction<T>(
    isolationLevel: IsolationLevel,
    runInTransaction: (entityManager: EntityManager) => Promise<T>
  ): Promise<T>;
  async transaction<T>(
    arg1: IsolationLevel | ((entityManager: EntityManager) => Promise<T>),
    arg2?: (entityManager: EntityManager) => Promise<T>
  ): Promise<T> {
    const runInTransaction =
      arg2 ?? (arg1 as (entityManager: EntityManager) => Promise<T>);
    try {
      const result = await runInTransaction({} as EntityManager);
      this.txEnds.push("commit");
      return result;
    } catch (error) {
      this.txEnds.push("rollback");
      throw error;
    }
  }
}

function createMockRequest(con: Connection): Request {
  return {
    con: con,
    noTxMgr: con.createEntityManager(),
    txMgr: undefined,
    txMgrNestedRollback: undefined,
  } as unknown as Request;
}

describe("startTransaction with fake DB", () => {
  let connection: FakeConnection;
  let req: Request;

  beforeEach(() => {
    connection = new FakeConnection();
    req = createMockRequest(connection);
  });

  it("should commit and return data", async () => {
    await expect(
      startTransaction(req, async () => {
        expect(req.txMgr).toBeDefined();
        return commitTransaction({ data: "success" });
      })
    ).resolves.toEqual({
      type: "commit",
      commit: {
        data: "success",
      },
    });
    expect(req.txMgr).toBeUndefined();
    expect(connection.txEnds).toEqual(["commit"]);
  });

  it("should rollback and return data", async () => {
    await expect(
      startTransaction(req, async () => {
        expect(req.txMgr).toBeDefined();
        return rollbackTransaction({ error: "failure" });
      })
    ).resolves.toEqual({
      type: "rollback",
      rollback: {
        error: "failure",
      },
    });
    expect(req.txMgr).toBeUndefined();
    expect(connection.txEnds).toEqual(["rollback"]);
  });

  it("should rollback on throw", async () => {
    await expect(
      startTransaction(req, async () => {
        expect(req.txMgr).toBeDefined();
        throw "oops";
      })
    ).rejects.toEqual("oops");
    expect(req.txMgr).toBeUndefined();
    expect(connection.txEnds).toEqual(["rollback"]);
  });

  it("should commit in nested transaction", async () => {
    await expect(
      startTransaction(req, async () => {
        const outerTxMgr = req.txMgr;
        expect(outerTxMgr).toBeDefined();

        await expect(
          startTransaction(req, async () => {
            const innerTxMgr = req.txMgr;
            expect(innerTxMgr).toBe(outerTxMgr);
            return commitTransaction({ data: "inner" });
          })
        ).resolves.toEqual({
          type: "commit",
          commit: {
            data: "inner",
          },
        });
        expect(connection.txEnds).toEqual([]);

        return commitTransaction({ data: "outer" });
      })
    ).resolves.toEqual({
      type: "commit",
      commit: {
        data: "outer",
      },
    });
    expect(req.txMgr).toBeUndefined();
    expect(connection.txEnds).toEqual(["commit"]);
  });

  it("should rollback in nested transaction, even if outer transaction commits", async () => {
    await expect(
      startTransaction(req, async () => {
        const outerTxMgr = req.txMgr;
        expect(outerTxMgr).toBeDefined();

        await expect(
          startTransaction(req, async () => {
            const innerTxMgr = req.txMgr;
            expect(innerTxMgr).toBe(outerTxMgr);
            return rollbackTransaction({ data: "inner" });
          })
        ).resolves.toEqual({
          type: "rollback",
          rollback: {
            data: "inner",
          },
        });
        expect(connection.txEnds).toEqual([]);

        return commitTransaction({ data: "outer" });
      })
    ).rejects.toEqual({
      type: "commit",
      commit: {
        data: "outer",
      },
    });
    expect(req.txMgr).toBeUndefined();
    expect(connection.txEnds).toEqual(["rollback"]);
  });

  it("should rollback on throw in nested transaction, even if outer transaction commits", async () => {
    await expect(
      startTransaction(req, async () => {
        const outerTxMgr = req.txMgr;
        expect(outerTxMgr).toBeDefined();

        await expect(
          startTransaction(req, async () => {
            const innerTxMgr = req.txMgr;
            expect(innerTxMgr).toBe(outerTxMgr);
            throw "oops";
          })
        ).rejects.toEqual("oops");
        expect(connection.txEnds).toEqual([]);

        return commitTransaction({ data: "outer" });
      })
    ).rejects.toEqual({
      type: "commit",
      commit: {
        data: "outer",
      },
    });
    expect(req.txMgr).toBeUndefined();
    expect(connection.txEnds).toEqual(["rollback"]);
  });
});

describe("startTransaction with real DB", () => {
  // GenericKeyValue is arbitrarily chosen for simplicity
  async function getRowValue(txMgr: EntityManager, key: string) {
    const row = await txMgr.findOne(GenericKeyValue, {
      namespace: "hosting-hit",
      key,
    });
    return row?.value;
  }
  async function insertRow(txMgr: EntityManager, key: string, value: string) {
    return txMgr.insert(GenericKeyValue, {
      namespace: "hosting-hit",
      key,
      value,
      id: key,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  async function clearRows(txMgr: EntityManager) {
    return txMgr.clear(GenericKeyValue);
  }

  let req: Request;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const { con, cleanup: cleanupDatabase } = await createDatabase();
    req = createMockRequest(con);

    cleanup = async () => {
      await cleanupDatabase();
    };
  });

  afterEach(async () => {
    await clearRows(req.noTxMgr);
  });

  afterAll(async () => {
    await cleanup();
  });

  it("should commit", async () => {
    await expect(
      startTransaction(req, async (txMgr) => {
        await insertRow(txMgr, "row", "foo");
        const valueInTx = await getRowValue(txMgr, "row");
        expect(valueInTx).toEqual("foo");
        return commitTransaction("success");
      })
    ).resolves.toEqual({
      type: "commit",
      commit: "success",
    });
    const valueAfterCommit = await getRowValue(req.noTxMgr, "row");
    expect(valueAfterCommit).toEqual("foo");
  });

  it("should rollback", async () => {
    await expect(
      startTransaction(req, async (txMgr) => {
        await insertRow(txMgr, "row", "foo");
        const valueInTx = await getRowValue(txMgr, "row");
        expect(valueInTx).toEqual("foo");
        return rollbackTransaction("failure");
      })
    ).resolves.toEqual({
      type: "rollback",
      rollback: "failure",
    });
    const valueAfterCommit = await getRowValue(req.noTxMgr, "row");
    expect(valueAfterCommit).toBeUndefined();
  });

  it("should rollback on throw", async () => {
    const error = new Error("oops");
    await expect(
      startTransaction(req, async (txMgr) => {
        await insertRow(txMgr, "row", "foo");
        const valueInTx = await getRowValue(txMgr, "row");
        expect(valueInTx).toEqual("foo");
        throw error;
      })
    ).rejects.toEqual(error);
    const valueAfterCommit = await getRowValue(req.noTxMgr, "row");
    expect(valueAfterCommit).toBeUndefined();
  });

  it("should rollback when DbMgr created before transaction", async () => {
    const dbMgr = new DbMgr(req, SUPER_USER);
    await expect(
      startTransaction(req, async () => {
        await insertRow(dbMgr.getEntMgr(), "row", "foo");
        return rollbackTransaction("failure");
      })
    ).resolves.toEqual({
      type: "rollback",
      rollback: "failure",
    });
    const valueAfterCommit = await getRowValue(req.noTxMgr, "row");
    expect(valueAfterCommit).toBeUndefined();
  });
});
