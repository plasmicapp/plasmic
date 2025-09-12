import { getMigratedBundle } from "@/wab/server/db/BundleMigrator";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { unbundleSite } from "@/wab/server/db/bundle-migration-utils";
import { logger } from "@/wab/server/observability";
import { Bundler } from "@/wab/shared/bundler";
import { TplComponent, isKnownTplComponent } from "@/wab/shared/model/classes";
import { EntityManager } from "typeorm";

export async function findMissingImplicitStates(em: EntityManager) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const badProjects: string[] = [];
  let processedProjects = 0;
  const numberOfProjects = await dbMgr.countAllProjects();

  const printData = () => {
    logger().info(
      numberOfProjects === processedProjects
        ? "FINISHED"
        : `${((100 * processedProjects) / numberOfProjects).toFixed(2)}%`
    );
    logger().info(`# of projects to check ${numberOfProjects}`);
    logger().info(`# of processed projects ${processedProjects}`);
    logger().info(
      `# of projects with missing implicit states: ${badProjects.length}`
    );
    logger().info("Bad projects", { badProjectsSummary: badProjects });
  };

  for (const project of await dbMgr.listAllProjects()) {
    try {
      const rev = await dbMgr.getLatestProjectRev(project.id);
      const bundle = await getMigratedBundle(rev);
      const bundler = new Bundler();
      const { site } = await unbundleSite(bundler, bundle, dbMgr, rev);

      let projectHasMissingImplicitState = false;
      for (const component of site.components) {
        for (const state of component.states) {
          if (state.implicitState && isKnownTplComponent(state.tplNode)) {
            const originalComp = state.tplNode as TplComponent;
            if (!originalComp.component.states.includes(state.implicitState)) {
              projectHasMissingImplicitState = true;
            }
          }
        }
      }
      if (projectHasMissingImplicitState) {
        badProjects.push(project.id);
      }
      processedProjects++;
      if (processedProjects % 100 === 0) {
        printData();
      }
    } catch (e) {
      logger().error(`Unbundle failed on project ${project.id}`, e as any);
    }
  }
  printData();
}
