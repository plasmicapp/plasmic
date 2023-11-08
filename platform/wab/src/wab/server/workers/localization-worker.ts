import { ConnectionOptions } from "typeorm";
import { ProjectId } from "../../shared/ApiSchema";
import { Bundler } from "../../shared/bundler";
import {
  genLocalizationStringsForProject,
  LocalizationKeyScheme,
} from "../../shared/localization";
import { ensureDbConnections, getDefaultConnection } from "../db/DbCon";
import { DbMgr, SUPER_USER } from "../db/DbMgr";
import { ensureDevFlags } from "./worker-utils";

interface LocalizationStringsOpts {
  connectionOptions: ConnectionOptions;
  projectId: ProjectId;
  maybeVersion?: string;
  keyScheme: LocalizationKeyScheme;
  tagPrefix: string | undefined;
}

export async function workerLocalizationStrings(opts: LocalizationStringsOpts) {
  await ensureDbConnections(opts.connectionOptions);
  const connection = await getDefaultConnection();
  try {
    return await connection.transaction(async () => {
      // Note that we are assuming SUPER_USER, so any permission
      // checks should've already happened before this worker is
      // invoked.
      const mgr = new DbMgr(connection.createEntityManager(), SUPER_USER);
      await ensureDevFlags(mgr);
      return await doGenLocalizationStringsForProject(mgr, opts);
    });
  } finally {
    if (connection.isConnected) {
      await connection.close();
    }
  }
}

async function doGenLocalizationStringsForProject(
  mgr: DbMgr,
  { projectId, maybeVersion, keyScheme, tagPrefix }: LocalizationStringsOpts
): Promise<Record<string, string>> {
  const bundler = new Bundler();
  const { site } = await mgr.tryGetPkgVersionByProjectVersionOrTag(
    bundler,
    projectId,
    maybeVersion
  );
  return genLocalizationStringsForProject(projectId, site, {
    keyScheme,
    tagPrefix,
  });
}
