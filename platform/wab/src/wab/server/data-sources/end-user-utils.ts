import { ProjectId } from "../../shared/ApiSchema";
import { Bundle } from "../../shared/bundles";
import {
  getLastBundleVersion,
  getMigrationsToExecute,
} from "../db/BundleMigrator";
import { DbMgr } from "../db/DbMgr";
import { ProjectRevision } from "../entities/Entities";

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

  await mgr.upsertAppAuthConfig(projectId as ProjectId, {
    userPropsBundledOp: JSON.stringify(bundle),
  });

  return bundle;
}
