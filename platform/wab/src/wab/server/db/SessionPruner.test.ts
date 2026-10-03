import { createDatabase } from "@/wab/server/__testonly__/backend-util";
import { closeDbConnections, ensureDbConnection } from "@/wab/server/db/DbCon";
import { ANON_USER, DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { pruneExpiredSessions } from "@/wab/server/db/SessionPruner";
import { ExpressSession } from "@/wab/server/entities/Entities";
import { TypeormStore } from "@/wab/server/util/TypeormSessionStore";
import { vi } from "vitest";

describe("expired session pruning", () => {
  let database: Awaited<ReturnType<typeof createDatabase>>;
  const cutoff = Date.UTC(2026, 9, 1);
  const options = { batchSize: 2, pauseMs: 0, maxDurationSeconds: 60 };

  beforeAll(async () => {
    database = await createDatabase("session_pruner");
  });

  beforeEach(async () => {
    await database.con.getRepository(ExpressSession).clear();
    vi.spyOn(Date, "now").mockReturnValue(cutoff);
  });

  afterAll(async () => {
    await database?.cleanup();
    await closeDbConnections();
  });

  it("deletes oldest expired rows in bounded batches and keeps future sessions", async () => {
    const repository = database.con.getRepository(ExpressSession);
    await repository.save([
      { id: "older", expiredAt: cutoff - 2000, json: "{}" },
      { id: "expired", expiredAt: cutoff - 1000, json: "{}" },
      { id: "boundary", expiredAt: cutoff, json: "{}" },
      { id: "future", expiredAt: cutoff + 1, json: "{}" },
    ]);
    const db = new DbMgr(database.con.manager, SUPER_USER);
    expect(await db.deleteExpiredSessionsBatch(cutoff, 2)).toEqual({
      selected: 2,
      deleted: 2,
      lastExpiredAt: cutoff - 1000,
    });
    expect(await repository.find({ order: { id: "ASC" } })).toEqual([
      expect.objectContaining({ id: "boundary" }),
      expect.objectContaining({ id: "future" }),
    ]);
    expect(
      await db.deleteExpiredSessionsBatch(cutoff, 2, cutoff - 1000),
    ).toEqual({
      selected: 1,
      deleted: 1,
      lastExpiredAt: cutoff,
    });
    expect(await db.deleteExpiredSessionsBatch(cutoff, 2, cutoff)).toEqual({
      selected: 0,
      deleted: 0,
      lastExpiredAt: undefined,
    });
    expect(await repository.find()).toEqual([
      expect.objectContaining({ id: "future" }),
    ]);
  });

  it("keeps a session renewed between selection and deletion", async () => {
    const repository = database.con.getRepository(ExpressSession);
    await repository.save([
      { id: "renewed", expiredAt: cutoff - 2000, json: "{}" },
      { id: "expired", expiredAt: cutoff - 1000, json: "{}" },
    ]);
    const selection = repository.createQueryBuilder("session");
    const getMany = selection.getMany.bind(selection);
    vi.spyOn(selection, "getMany").mockImplementationOnce(async () => {
      const rows = await getMany();
      await repository.update("renewed", { expiredAt: cutoff + 1000 });
      return rows;
    });
    vi.spyOn(repository, "createQueryBuilder").mockReturnValueOnce(selection);

    const db = new DbMgr(database.con.manager, SUPER_USER);
    expect(await db.deleteExpiredSessionsBatch(cutoff, 2)).toEqual({
      selected: 2,
      deleted: 1,
      lastExpiredAt: cutoff - 1000,
    });
    expect(await repository.find()).toEqual([
      expect.objectContaining({
        id: "renewed",
        expiredAt: String(cutoff + 1000),
      }),
    ]);
  });

  it("requires a superuser and rejects invalid batch sizes and cursors", async () => {
    const db = new DbMgr(database.con.manager, ANON_USER);
    await expect(db.deleteExpiredSessionsBatch(cutoff, 1)).rejects.toThrow(
      "Must be Super User",
    );
    const sudo = new DbMgr(database.con.manager, SUPER_USER);
    for (const size of [0, -1, 1.5, NaN]) {
      await expect(
        sudo.deleteExpiredSessionsBatch(cutoff, size),
      ).rejects.toThrow("Invalid session pruning batch size");
    }
    for (const cursor of [1.5, NaN, cutoff + 1]) {
      await expect(
        sudo.deleteExpiredSessionsBatch(cutoff, 1, cursor),
      ).rejects.toThrow("Invalid session pruning cursor");
    }
  });

  it("keeps the initial expiration cutoff across multiple committed batches", async () => {
    const repository = database.con.getRepository(ExpressSession);
    await repository.save([
      { id: "older", expiredAt: cutoff - 2000, json: "{}" },
      { id: "expired", expiredAt: cutoff - 1000, json: "{}" },
      { id: "boundary", expiredAt: cutoff, json: "{}" },
      { id: "expires-during-run", expiredAt: cutoff + 250, json: "{}" },
    ]);
    const db = new DbMgr(database.con.manager, SUPER_USER);
    const deleteBatch = db.deleteExpiredSessionsBatch.bind(db);
    const batches = vi.spyOn(db, "deleteExpiredSessionsBatch");
    batches.mockImplementationOnce(async (...args) => {
      const result = await deleteBatch(...args);
      vi.mocked(Date.now).mockReturnValue(cutoff + 500);
      return result;
    });

    expect(await pruneExpiredSessions(db, options)).toEqual({
      deleted: 3,
      batches: 3,
      reason: "exhausted",
      expiredAtOrBefore: cutoff,
    });
    expect(batches.mock.calls).toEqual([
      [cutoff, 2, undefined],
      [cutoff, 2, cutoff - 1000],
      [cutoff, 2, cutoff],
    ]);
    expect(await repository.find()).toEqual([
      expect.objectContaining({ id: "expires-during-run" }),
    ]);
  });

  it("drains more than one batch with the same expiration timestamp", async () => {
    const repository = database.con.getRepository(ExpressSession);
    await repository.save([
      ...["equal-5", "equal-2", "equal-4", "equal-1", "equal-3"].map((id) => ({
        id,
        expiredAt: cutoff - 1000,
        json: "{}",
      })),
      { id: "future", expiredAt: cutoff + 1, json: "{}" },
    ]);
    const db = new DbMgr(database.con.manager, SUPER_USER);
    const batches = vi.spyOn(db, "deleteExpiredSessionsBatch");

    expect(await pruneExpiredSessions(db, options)).toMatchObject({
      deleted: 5,
      batches: 4,
      reason: "exhausted",
    });
    expect(batches.mock.calls).toEqual([
      [cutoff, 2, undefined],
      [cutoff, 2, cutoff - 1000],
      [cutoff, 2, cutoff - 1000],
      [cutoff, 2, cutoff - 1000],
    ]);
    expect(await repository.find()).toEqual([
      expect.objectContaining({ id: "future" }),
    ]);
  });

  it("advances the cursor while an older transaction can still see deleted rows", async () => {
    const repository = database.con.getRepository(ExpressSession);
    await repository.save([
      { id: "older", expiredAt: cutoff - 3000, json: "{}" },
      { id: "expired", expiredAt: cutoff - 2000, json: "{}" },
      { id: "boundary", expiredAt: cutoff, json: "{}" },
    ]);
    const db = new DbMgr(database.con.manager, SUPER_USER);
    const batches = vi.spyOn(db, "deleteExpiredSessionsBatch");

    await database.con.transaction("REPEATABLE READ", async (em) => {
      const oldSnapshot = em.getRepository(ExpressSession);
      expect(await oldSnapshot.count()).toBe(3);

      expect(await pruneExpiredSessions(db, options)).toMatchObject({
        deleted: 3,
        batches: 3,
        reason: "exhausted",
      });
      expect(await oldSnapshot.count()).toBe(3);
      expect(await repository.count()).toBe(0);
    });
    expect(batches.mock.calls).toEqual([
      [cutoff, 2, undefined],
      [cutoff, 2, cutoff - 2000],
      [cutoff, 2, cutoff],
    ]);
  });

  it("stops at the duration budget while expired sessions remain", async () => {
    const repository = database.con.getRepository(ExpressSession);
    await repository.save([
      { id: "older", expiredAt: cutoff - 2000, json: "{}" },
      { id: "expired", expiredAt: cutoff - 1000, json: "{}" },
    ]);
    const db = new DbMgr(database.con.manager, SUPER_USER);
    const deleteBatch = db.deleteExpiredSessionsBatch.bind(db);
    const batches = vi.spyOn(db, "deleteExpiredSessionsBatch");
    batches.mockImplementationOnce(async (...args) => {
      const result = await deleteBatch(...args);
      vi.mocked(Date.now).mockReturnValue(cutoff + 1000);
      return result;
    });

    expect(
      await pruneExpiredSessions(db, {
        batchSize: 1,
        pauseMs: 250,
        maxDurationSeconds: 1,
      }),
    ).toMatchObject({ deleted: 1, batches: 1, reason: "deadline" });
    expect(batches).toHaveBeenCalledTimes(1);
    expect(await repository.find()).toEqual([
      expect.objectContaining({ id: "expired" }),
    ]);
  });

  it("continues when every session in a selected batch was renewed", async () => {
    const repository = database.con.getRepository(ExpressSession);
    await repository.save([
      { id: "renewed-1", expiredAt: cutoff - 3000, json: "{}" },
      { id: "renewed-2", expiredAt: cutoff - 2000, json: "{}" },
      { id: "expired", expiredAt: cutoff - 1000, json: "{}" },
    ]);
    const selection = repository.createQueryBuilder("session");
    const getMany = selection.getMany.bind(selection);
    vi.spyOn(selection, "getMany").mockImplementationOnce(async () => {
      const rows = await getMany();
      await repository.update(["renewed-1", "renewed-2"], {
        expiredAt: cutoff + 1000,
      });
      return rows;
    });
    vi.spyOn(repository, "createQueryBuilder").mockReturnValueOnce(selection);
    const db = new DbMgr(database.con.manager, SUPER_USER);
    const batches = vi.spyOn(db, "deleteExpiredSessionsBatch");

    expect(await pruneExpiredSessions(db, options)).toMatchObject({
      deleted: 1,
      batches: 3,
      reason: "exhausted",
    });
    expect(await batches.mock.results[0].value).toEqual({
      selected: 2,
      deleted: 0,
      lastExpiredAt: cutoff - 2000,
    });
    expect(batches.mock.calls).toEqual([
      [cutoff, 2, undefined],
      [cutoff, 2, cutoff - 2000],
      [cutoff, 2, cutoff - 1000],
    ]);
    expect(await repository.find({ order: { id: "ASC" } })).toEqual([
      expect.objectContaining({ id: "renewed-1" }),
      expect.objectContaining({ id: "renewed-2" }),
    ]);
  });

  it("preserves a session returned by TypeormStore.get", async () => {
    const repository = database.con.getRepository(ExpressSession);
    const store = new TypeormStore({ cleanupLimit: 0 }).connect(repository);
    const session = { cookie: { maxAge: 60000 }, passport: { user: "active" } };
    await new Promise<void>((resolve, reject) => {
      store.set("active", session, (error) =>
        error ? reject(error) : resolve(),
      );
    });
    await repository.save([
      { id: "expired", expiredAt: cutoff - 1000, json: "{}" },
      { id: "boundary", expiredAt: cutoff, json: "{}" },
    ]);
    const getSession = (id: string) =>
      new Promise<unknown>((resolve, reject) => {
        store.get(id, (error, value) =>
          error ? reject(error) : resolve(value),
        );
      });
    expect(await getSession("active")).toEqual(session);
    expect(await getSession("boundary")).toBeUndefined();

    const db = new DbMgr(database.con.manager, SUPER_USER);
    expect(await pruneExpiredSessions(db, options)).toMatchObject({
      deleted: 2,
      reason: "exhausted",
    });
    expect(await getSession("active")).toEqual(session);
    expect(await repository.find()).toEqual([
      expect.objectContaining({ id: "active" }),
    ]);
  });

  it("propagates connection failures without retrying in the loop", async () => {
    const connection = await ensureDbConnection(
      database.dburi,
      "session_pruner_closed",
    );
    const db = new DbMgr(connection.manager, SUPER_USER);
    const batches = vi.spyOn(db, "deleteExpiredSessionsBatch");
    await connection.close();

    await expect(pruneExpiredSessions(db, options)).rejects.toThrow();
    expect(batches).toHaveBeenCalledTimes(1);
  });
});
