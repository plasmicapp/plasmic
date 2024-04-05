import { getMigratedBundle } from "@/wab/server/db/BundleMigrator";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { EntityManager } from "typeorm";

export async function fixInvalidImplicitStates(
  em: EntityManager,
  projectId: string
) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const rev = await dbMgr.getLatestProjectRev(projectId);
  const bundle = await getMigratedBundle(rev);

  const addRef = (inst: any) => {
    const ref = inst.__ref;
    refCount.set(ref, (refCount.get(ref) ?? 0) + 1);
  };
  const refCount = new Map<string, number>();
  for (const inst of Object.values(bundle.map)) {
    for (const [field, value] of Object.entries(inst)) {
      if (typeof value === "object" && Array.isArray(value)) {
        for (const item of value) {
          addRef(item);
        }
      } else if (typeof value === "object" && value != null) {
        addRef(value);
      }
    }
  }
  for (const [iid, inst] of Object.entries(bundle.map)) {
    if (inst.__type !== "NamedState" && inst.__type !== "State") {
      continue;
    }
    if (!inst.tplNode) {
      continue;
    }
    const ref = inst.tplNode.__ref;
    // dangling implicit state
    if (refCount.get(ref) === 1) {
      delete bundle.map[ref];
      inst.tplNode = null;
      inst.implicitState = null;
    }
  }
  await dbMgr.saveProjectRev({
    projectId,
    branchId: undefined,
    data: JSON.stringify(bundle),
    revisionNum: rev.revision + 1,
  });
}
