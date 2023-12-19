import {
  getLastBundleVersion,
  getMigrationsToExecute,
} from "@/wab/server/db/BundleMigrator";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { ProjectRevision } from "@/wab/server/entities/Entities";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundle } from "@/wab/shared/bundles";

export async function getMigratedUserPropsOpBundle(
  mgr: DbMgr,
  projectId: string,
  opBundleStr: string
) {
  const bundle = JSON.parse(opBundleStr) as Bundle;
  const currentBundleVersion = bundle.version;
  const latestBundleVersion = await getLastBundleVersion();

  if (currentBundleVersion === latestBundleVersion) {
    return bundle;
  }

  const migrations = await getMigrationsToExecute(bundle.version);
  for (const migration of migrations) {
    if (migration.type === "bundled") {
      await migration.migrate(bundle, {
        id: projectId,
      } as ProjectRevision);
    }
  }

  bundle.version = latestBundleVersion;

  await mgr.upsertAppAuthConfig(
    projectId as ProjectId,
    {
      userPropsBundledOp: JSON.stringify(bundle),
    },
    true
  );

  return bundle;
}
