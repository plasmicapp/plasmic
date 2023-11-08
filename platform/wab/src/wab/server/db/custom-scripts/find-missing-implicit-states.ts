import { EntityManager } from "typeorm";
import { TplComponent, isKnownTplComponent } from "../../../classes";
import { Bundler } from "../../../shared/bundler";
import { getMigratedBundle } from "../BundleMigrator";
import { DbMgr, SUPER_USER } from "../DbMgr";
import { unbundleSite } from "../bundle-migration-utils";

export async function findMissingImplicitStates(em: EntityManager) {
  const dbMgr = new DbMgr(em, SUPER_USER);
  const badProjects: string[] = [];
  let processedProjects = 0;
  let numberOfProjects = await dbMgr.countAllProjects();

  const printData = () => {
    console.log("....................");
    console.log(
      numberOfProjects === processedProjects
        ? "FINISHED"
        : `${((100 * processedProjects) / numberOfProjects).toFixed(2)}%`
    );
    console.log("# of projects to check", numberOfProjects);
    console.log("# of processed projects", processedProjects);
    console.log(
      "# of projects with missing implicit states",
      badProjects.length
    );
    console.log(badProjects);
    console.log("....................");
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
      console.log(`Unbundle failed on project ${project.id}`, e);
    }
  }
  printData();
}
