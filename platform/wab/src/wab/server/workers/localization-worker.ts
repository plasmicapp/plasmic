import { DbMgr } from "@/wab/server/db/DbMgr";
import { TraceCarrier, withSpan } from "@/wab/server/util/apm-util";
import { getWorkerDbMgr } from "@/wab/server/workers/worker-utils";
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
  traceCarrier?: TraceCarrier,
) {
  const ctx = traceCarrier
    ? propagation.extract(context.active(), traceCarrier)
    : context.active();

  return await context.with(ctx, () =>
    withSpan("worker-localization", async () => {
      const mgr = await getWorkerDbMgr(opts.connectionOptions);
      return await doGenLocalizationStringsForProject(mgr, opts);
    }),
  );
}

async function doGenLocalizationStringsForProject(
  mgr: DbMgr,
  { projectId, maybeVersion, keyScheme, tagPrefix }: LocalizationStringsOpts,
): Promise<Record<string, string>> {
  const bundler = new Bundler();
  const { site } = await mgr.tryGetPkgVersionByProjectVersionOrTag(
    bundler,
    projectId,
    maybeVersion,
  );
  return genLocalizationStringsForProject(projectId, site, {
    keyScheme,
    tagPrefix,
  });
}
