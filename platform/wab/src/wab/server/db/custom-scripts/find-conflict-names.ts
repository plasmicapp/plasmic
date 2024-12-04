import { getMigratedBundle } from "@/wab/server/db/BundleMigrator";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { unbundleSite } from "@/wab/server/db/bundle-migration-utils";
import { isSlot } from "@/wab/shared/SlotUtils";
import { Bundler } from "@/wab/shared/bundler";
import { makeNodeNamer } from "@/wab/shared/codegen/react-p";
import { paramToVarName } from "@/wab/shared/codegen/util";
import { assert } from "@/wab/shared/common";
import {
  getParamNames,
  getRealParams,
  getVariantParams,
} from "@/wab/shared/core/components";
import { flattenTplsWithoutThrowawayNodes } from "@/wab/shared/core/tpls";
import { EntityManager } from "typeorm";

enum CONFLICT_TYPE {
  NODE_AND_SLOT,
  NODE_AND_VARIANT,
  NODE_AND_PROP,
}

export async function findConflictNames(em: EntityManager) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const conflictCounter: number[] = [];
  conflictCounter[CONFLICT_TYPE.NODE_AND_PROP] = 0;
  conflictCounter[CONFLICT_TYPE.NODE_AND_SLOT] = 0;
  conflictCounter[CONFLICT_TYPE.NODE_AND_VARIANT] = 0;
  const projectsWithConflicts: string[] = [];
  let processedProjects = 0;
  const numberOfProjects = await dbMgr.countAllProjects();

  const printData = () => {
    console.log("....................");
    console.log(
      numberOfProjects === processedProjects
        ? "FINISHED"
        : `${((100 * processedProjects) / numberOfProjects).toFixed(2)}%`
    );
    console.log("# of projects to check", numberOfProjects);
    console.log("# of processed projects", processedProjects);
    console.log("# of projects with conflicts", projectsWithConflicts.length);
    console.log(
      "Tpl node name and Slots = ",
      conflictCounter[CONFLICT_TYPE.NODE_AND_SLOT]
    );
    console.log(
      "Tpl node name and Variants = ",
      conflictCounter[CONFLICT_TYPE.NODE_AND_VARIANT]
    );
    console.log(
      "Tpl node name and Prop = ",
      conflictCounter[CONFLICT_TYPE.NODE_AND_PROP]
    );
    console.log(projectsWithConflicts);
    console.log("....................");
  };

  for (const project of await dbMgr.listAllProjects()) {
    try {
      const rev = await dbMgr.getLatestProjectRev(project.id);
      const bundle = await getMigratedBundle(rev);
      const bundler = new Bundler();
      const { site } = await unbundleSite(bundler, bundle, dbMgr, rev);

      let projectHasConflict = false;
      for (const component of site.components) {
        const namer = makeNodeNamer(component);
        const realParamsName = getParamNames(
          component,
          getRealParams(component, { includeSlots: true })
        ); //slots and meta-props
        const realParams = getRealParams(component, { includeSlots: true }); //slots and meta-props
        const variantParamsName = getParamNames(
          component,
          getVariantParams(component)
        );

        flattenTplsWithoutThrowawayNodes(component).forEach((node) => {
          const name = namer(node);
          if (!name) {
            return;
          }

          const addConflictFound = (conflictType: CONFLICT_TYPE) => {
            conflictCounter[conflictType]++;
            console.log(
              conflictType === CONFLICT_TYPE.NODE_AND_PROP
                ? "prop"
                : conflictType === CONFLICT_TYPE.NODE_AND_SLOT
                ? "slot"
                : "variant",
              "conflict found",
              component.name,
              name
            );
            projectHasConflict = true;
          };

          if (variantParamsName.includes(name)) {
            addConflictFound(CONFLICT_TYPE.NODE_AND_VARIANT);
          } else if (realParamsName.includes(name)) {
            const param = realParams.find(
              (p) => paramToVarName(component, p) === name
            );
            assert(param, "param not found");
            if (isSlot(param)) {
              addConflictFound(CONFLICT_TYPE.NODE_AND_SLOT);
            } else {
              addConflictFound(CONFLICT_TYPE.NODE_AND_PROP);
            }
          }
        });
      }
      if (projectHasConflict) {
        projectsWithConflicts.push(project.id);
      }
      processedProjects++;
      if (processedProjects % 100 === 0) {
        printData();
      }
    } catch (e) {
      console.log(`Unbundle failed on project ${project.id}`, e);
    }
  }
  printData();
}
