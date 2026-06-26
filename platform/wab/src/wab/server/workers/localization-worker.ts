import {
  ensureDbConnections,
  getDefaultConnection,
} from "@/wab/server/db/DbCon";
import { DbMgr, SUPER_USER } from "@/wab/server/db/DbMgr";
import { TraceCarrier, withSpan } from "@/wab/server/util/apm-util";
import { ensureDevFlags } from "@/wab/server/workers/worker-utils";
import { ProjectId } from "@/wab/shared/ApiSchema";
import { Bundler } from "@/wab/shared/bundler";
import {
  LocalizationKeyScheme,
  genLocalizationStringsForProject,
} from "@/wab/shared/localization";
import { context, propagation } from "@opentelemetry/api";
import { ConnectionOptions } from "typeorm";

interface LocalizationStringsOpts {
  connectionOptions: ConnectionOptions;
  projectId: ProjectId;
  maybeVersion?: string;
  keyScheme: LocalizationKeyScheme;
  tagPrefix: string | undefined;
}

export async function workerLocalizationStrings(
  opts: LocalizationStringsOpts,
  traceCarrier?: TraceCarrier
) {
  const ctx = traceCarrier
    ? propagation.extract(context.active(), traceCarrier)
    : context.active();

  return await context.with(ctx, async () => {
    await ensureDbConnections(opts.connectionOptions);
    const connection = await withSpan(
      "worker-localization-db-connect",
      async () => {
        return await getDefaultConnection();
      }
    );
    try {
      return await withSpan("worker-localization-db-transaction", async () => {
        return await connection.transaction(async () => {
          // Note that we are assuming SUPER_USER, so any permission
          // checks should've already happened before this worker is
          // invoked.
          const mgr = new DbMgr(connection.createEntityManager(), SUPER_USER);
          await ensureDevFlags(mgr);
          return await doGenLocalizationStringsForProject(mgr, opts);
        });
      });
    } finally {
      if (connection.isConnected) {
        await connection.close();
      }
    }
  });
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
