import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { LOADER_CODEGEN_OPTS_DEFAULTS } from "@/wab/server/loader/gen-code-bundle";
import { resolveProjectDeps } from "@/wab/server/loader/resolve-projects";
import { withTimeSpent } from "@/wab/server/util/apm-util";
import { doGenCode } from "@/wab/server/workers/codegen";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { EntityManager } from "typeorm";

export async function profileCodegen(em: EntityManager, projectId: ProjectId) {
  const dbMgr = new DbMgr(em, SUPER_USER);

  const allProjectVersions = {
    ...(await resolveProjectDeps(dbMgr, {
      [projectId]: { version: "latest", indirect: false },
    })),
    [projectId]: { version: "latest", indirect: false },
  };

  console.log("Codegen for: ", allProjectVersions);

  const codegenIt = async () => {
    for (const [pid, version] of Object.entries(allProjectVersions)) {
      console.log("Codegen ", pid);
      const { result, spentTime } = await withTimeSpent(async () => {
        await doGenCode(dbMgr, {
          scheme: "blackbox",
          projectId: pid,
          indirect: version.indirect,
          maybeVersionOrTag: version.version,
          exportOpts: {
            ...LOADER_CODEGEN_OPTS_DEFAULTS,
            platform: "nextjs",
            platformOptions: {},
            defaultExportHostLessComponents: false,
            useComponentSubstitutionApi: true,
            useGlobalVariantsSubstitutionApi: true,
            useCodeComponentHelpersRegistry: true,
          },
        });
      });
      console.log("TOOK", spentTime);
    }
  };

  console.log("====================== FIRST TIME ===========================");
  await codegenIt();

  debugger;
  console.log("====================== SECOND TIME ===========================");
  await codegenIt();
  debugger;
}
