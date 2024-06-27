import { assert, ensure, jsonClone, maybeOne } from "@/wab/shared/common";
import {
  getLastBundleVersion,
  getMigratedBundle,
  getMigrationsToExecute,
} from "@/wab/server/db/BundleMigrator";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { PkgVersion, ProjectRevision } from "@/wab/server/entities/Entities";
import {
  checkBundleFields,
  checkExistingReferences,
  checkRefsInBundle,
  removeUnreachableNodesFromBundle,
} from "@/wab/shared/bundler";
import { Bundle, parseBundle } from "@/wab/shared/bundles";
import { EntityManager } from "typeorm";

function fixBundle(bundle: Bundle) {
  checkRefsInBundle(bundle, {
    onWeakRefToUnreachableInst: ({
      referencedIid,
      strongRefParents,
      weakRefParents,
    }) => {
      assert(
        bundle.map[referencedIid].__type === "TplComponent",
        `Referenced instance is ${bundle.map[referencedIid].__type}`
      );
      const stateIid = maybeOne(
        ensure(
          weakRefParents.get(referencedIid),
          `No parent for referencedIid ${referencedIid}`
        )
      )!.iid;
      assert(
        bundle.map[stateIid].__type === "State",
        `Parent instance is ${bundle.map[stateIid].__type}`
      );
      const paramIid = ensure(
        bundle.map[stateIid].param.__ref,
        `No param in State[${stateIid}].param`
      );
      const componentIid = maybeOne(
        ensure(
          strongRefParents.get(stateIid),
          `No parent for parentIid ${stateIid}`
        )
      )!.iid;
      assert(
        bundle.map[componentIid].__type === "Component",
        `State parent instance is ${bundle.map[componentIid].__type}`
      );
      assert(
        bundle.map[componentIid].states.some((s: any) => s.__ref === stateIid),
        `State ${stateIid} is not in component.states for Component ${componentIid}`
      );
      assert(
        bundle.map[componentIid].params.some((p: any) => p.__ref === paramIid),
        `Param ${paramIid} is not in component.params for Component ${componentIid}`
      );
      bundle.map[componentIid].states = bundle.map[componentIid].states.filter(
        (s: any) => s.__ref !== stateIid
      );
      bundle.map[componentIid].params = bundle.map[componentIid].params.filter(
        (p: any) => p.__ref !== paramIid
      );
    },
  });
  removeUnreachableNodesFromBundle(bundle);
  return bundle;
}

async function checkIfBundleIsFixed(bundle: Bundle, dbMgr: DbMgr) {
  const currentVersion = bundle.version;
  const migrations = await getMigrationsToExecute(currentVersion);
  for (const migration of migrations) {
    if (migration.type === "bundled") {
      await migration.migrate(bundle, { id: "id" } as
        | PkgVersion
        | ProjectRevision);
    } else {
      await migration.migrate(bundle, dbMgr, { id: "id" } as
        | PkgVersion
        | ProjectRevision);
    }
    bundle.version = migration.name;
  }

  bundle.version = await getLastBundleVersion();
  checkExistingReferences(bundle);
  checkBundleFields(bundle);
  checkRefsInBundle(bundle);
}

export async function findDanglingWeakRefs(em: EntityManager) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  for (const project of await dbMgr.listAllProjects()) {
    try {
      const rev = await dbMgr.getLatestProjectRev(project.id);
      try {
        await getMigratedBundle(rev);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Unexpected Bundle dependencies")
        ) {
          console.log(`Trying to fix project ${project.id}...`);
          try {
            const fixedBundle = fixBundle(parseBundle(rev) as Bundle);
            const throwAwayBundle = jsonClone(fixedBundle);

            // Check if bundle is fixed
            await checkIfBundleIsFixed(throwAwayBundle, dbMgr);
            console.log(
              `Successfully fixed project ${project.id}! Actually saving it...`
            );

            // We first check if the changes indeed fixed the bundle. Now we
            // actually migrate and save it:

            // (TODO: Gonna test first before commit anything)
            // rev.data = JSON.stringify(fixedBundle);
            // await getMigratedBundle(rev);
            // console.log(`Successfully saved project ${project.id}`);
          } catch (err2) {
            console.log(`Failed to fix project ${project.id}`);
            console.log(err2);
          }
        }
      }
    } catch (err) {
      console.log(`Error in project ${project.id}:`);
      console.log(err);
    }
  }
  for (const pkgVersionId of await dbMgr.listAllPkgVersionIds()) {
    try {
      const pkgVersion = await dbMgr.getPkgVersionById(pkgVersionId.id);
      try {
        await getMigratedBundle(pkgVersion);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.includes("Unexpected Bundle dependencies")
        ) {
          console.log(`Trying to fix PkgVersion ${pkgVersionId}...`);
          try {
            const fixedBundle = fixBundle(parseBundle(pkgVersion) as Bundle);
            const throwAwayBundle = jsonClone(fixedBundle);

            // Check if bundle is fixed
            await checkIfBundleIsFixed(throwAwayBundle, dbMgr);

            console.log(
              `Successfully fixed PkgVersion ${pkgVersionId}! Actually saving it...`
            );

            // We first check if the changes indeed fixed the bundle. Now we
            // actually migrate and save it:

            // (TODO: Gonna test first before commit anything)
            // pkgVersion.model = JSON.stringify(fixedBundle);
            // await getMigratedBundle(pkgVersion);
            // console.log(`Successfully saved PkgVersion ${pkgVersionId}`);
          } catch (err2) {
            console.log(`Failed to fix PkgVersion ${pkgVersionId}`);
            console.log(err2);
          }
        }
      }
    } catch (err) {
      console.log(`Error in PkgVersion ${pkgVersionId}:`);
      console.log(err);
    }
  }
}
