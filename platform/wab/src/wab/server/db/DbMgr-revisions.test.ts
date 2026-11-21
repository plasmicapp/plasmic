/** @vitest-environment node */
import { DbMgr, NotFoundError, SUPER_USER } from "@/wab/server/db/DbMgr";

type Call = [method: string, ...args: unknown[]];

function mkFakeMgr(rows: object[]) {
  const calls: Call[] = [];
  const qb: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of [
    "select",
    "where",
    "andWhere",
    "setParameter",
    "orderBy",
    "limit",
  ]) {
    qb[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return qb;
    };
  }
  qb.getMany = async () => rows;
  const em = {
    getRepository: () => ({ createQueryBuilder: () => qb }),
  };
  const mgr = new DbMgr({ txMgr: em } as never, SUPER_USER);
  const checkProjectPerms = vi
    .spyOn(mgr, "checkProjectPerms")
    .mockResolvedValue(undefined as never);
  const checkBranchPerms = vi
    .spyOn(
      mgr as unknown as { checkBranchPerms: () => Promise<void> },
      "checkBranchPerms",
    )
    .mockResolvedValue(undefined);
  const wheres = () =>
    calls.filter(([m]) => m === "where" || m === "andWhere").map(([, w]) => w);
  const selects = () => calls.filter(([m]) => m === "select").map(([, s]) => s);
  return { mgr, calls, wheres, selects, checkProjectPerms, checkBranchPerms };
}

describe("DbMgr.getLatestProjectRevRef", () => {
  it("selects only id and revision of the latest live revision", async () => {
    const fake = mkFakeMgr([{ id: "rev3", revision: 3, data: "unused" }]);

    const ref = await fake.mgr.getLatestProjectRevRef("proj1");

    expect(ref).toEqual({ id: "rev3", revision: 3 });
    expect(fake.selects()).toEqual([["rev.id", "rev.revision"]]);
    expect(fake.wheres()).toEqual([
      "rev.projectId = :projectId",
      "rev.deletedAt IS NULL",
      "rev.branchId is null",
    ]);
    expect(fake.calls).toContainEqual(["orderBy", "rev.revision", "DESC"]);
    expect(fake.calls).toContainEqual(["limit", 1]);
    expect(fake.checkProjectPerms).toHaveBeenCalledWith(
      "proj1",
      "viewer",
      expect.any(String),
    );
  });

  it("filters on the branch and checks branch perms", async () => {
    const fake = mkFakeMgr([{ id: "rev3", revision: 3 }]);

    await fake.mgr.getLatestProjectRevRef("proj1", {
      branchId: "branch1" as never,
    });

    expect(fake.wheres()).toContain("rev.branchId = :branchId");
    expect(fake.calls).toContainEqual(["setParameter", "branchId", "branch1"]);
    expect(fake.checkBranchPerms).toHaveBeenCalledWith(
      "branch1",
      "viewer",
      expect.any(String),
    );
  });

  it("throws NotFoundError without a live revision", async () => {
    const fake = mkFakeMgr([]);
    await expect(fake.mgr.getLatestProjectRevRef("proj1")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("checks perms before querying", async () => {
    const fake = mkFakeMgr([{ id: "rev3", revision: 3 }]);
    fake.checkProjectPerms.mockRejectedValue(new Error("forbidden"));
    await expect(fake.mgr.getLatestProjectRevRef("proj1")).rejects.toThrow(
      "forbidden",
    );
    expect(fake.calls).toEqual([]);
  });
});

describe("DbMgr.getProjectRevRefByIdForProject", () => {
  it("requires the revision to belong to the project and not be soft-deleted", async () => {
    const fake = mkFakeMgr([{ id: "rev1", revision: 1, branchId: null }]);

    const ref = await fake.mgr.getProjectRevRefByIdForProject("proj1", "rev1");

    expect(ref).toEqual({ id: "rev1", revision: 1 });
    expect(fake.wheres()).toEqual([
      "rev.id = :revisionId",
      "rev.projectId = :projectId",
      "rev.deletedAt IS NULL",
    ]);
    expect(fake.calls).toContainEqual([
      "where",
      "rev.id = :revisionId",
      { revisionId: "rev1" },
    ]);
    expect(fake.calls).toContainEqual([
      "andWhere",
      "rev.projectId = :projectId",
      { projectId: "proj1" },
    ]);
    expect(fake.selects()).toEqual([
      ["rev.id", "rev.revision", "rev.branchId"],
    ]);
    expect(fake.checkProjectPerms).toHaveBeenCalledWith(
      "proj1",
      "viewer",
      expect.any(String),
    );
    expect(fake.checkBranchPerms).not.toHaveBeenCalled();
  });

  it("throws NotFoundError for a revision of another project or a soft-deleted one", async () => {
    const fake = mkFakeMgr([]);
    await expect(
      fake.mgr.getProjectRevRefByIdForProject("proj1", "rev1"),
    ).rejects.toThrow(NotFoundError);
  });

  it("checks perms on the revision's branch", async () => {
    const fake = mkFakeMgr([{ id: "rev1", revision: 1, branchId: "branch1" }]);
    await fake.mgr.getProjectRevRefByIdForProject("proj1", "rev1");
    expect(fake.checkBranchPerms).toHaveBeenCalledWith(
      "branch1",
      "viewer",
      expect.any(String),
    );
  });

  it("checks project perms before querying", async () => {
    const fake = mkFakeMgr([{ id: "rev1", revision: 1, branchId: null }]);
    fake.checkProjectPerms.mockRejectedValue(new Error("forbidden"));
    await expect(
      fake.mgr.getProjectRevRefByIdForProject("proj1", "rev1"),
    ).rejects.toThrow("forbidden");
    expect(fake.calls).toEqual([]);
  });
});

describe("DbMgr.getProjectRevByIdForProject", () => {
  it("loads the full revision with the same ownership and soft-delete filters", async () => {
    const row = { id: "rev1", revision: 1, branchId: null, data: "{}" };
    const fake = mkFakeMgr([row]);

    expect(await fake.mgr.getProjectRevByIdForProject("proj1", "rev1")).toBe(
      row,
    );
    expect(fake.selects()).toEqual([]);
    expect(fake.wheres()).toEqual([
      "rev.id = :revisionId",
      "rev.projectId = :projectId",
      "rev.deletedAt IS NULL",
    ]);
  });
});
