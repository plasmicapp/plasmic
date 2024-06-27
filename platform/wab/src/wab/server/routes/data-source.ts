import { ensureType, hackyCast } from "@/wab/shared/common";
import { fetchBases } from "@/wab/server/data-sources/airtable-fetcher";
import {
  executeDataSourceOperation,
  makeDataSourceOperationId,
  makeFetcher,
} from "@/wab/server/data-sources/data-source-utils";
import { DataSource } from "@/wab/server/entities/Entities";
import { superDbMgr, userDbMgr } from "@/wab/server/routes/util";
import { mkApiWorkspace } from "@/wab/server/routes/workspaces";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/wab/shared/ApiErrors/errors";
import {
  ApiCreateDataSourceRequest,
  ApiDataSource,
  ApiExecuteDataSourceStudioOpRequest,
  ApiUpdateDataSourceRequest,
  DataSourceId,
  ListDataSourceBasesResponse,
  ListDataSourcesResponse,
  ProjectId,
  UserId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import {
  GenericDataSource,
  getAllDataSourceTypes,
  getDataSourceMeta,
} from "@/wab/shared/data-sources-meta/data-source-registry";
import {
  coerceArgStringToType,
  OperationTemplate,
  SettingFieldMeta,
} from "@/wab/shared/data-sources-meta/data-sources";
import { dropFakeDatabase } from "@/wab/shared/data-sources-meta/fake-meta";
import { DATA_SOURCE_LOWER } from "@/wab/shared/Labels";
import * as Sentry from "@sentry/node";
import assert from "assert";
import { Request, Response } from "express-serve-static-core";

export function mkApiDataSource(
  dataSource: DataSource,
  reqUserId?: UserId,
  excludeSettings?: boolean
): ApiDataSource {
  const meta = getDataSourceMeta(dataSource.source);
  return {
    id: dataSource.id,
    name: dataSource.name,
    workspaceId: dataSource.workspaceId,
    source: dataSource.source,
    settings:
      !excludeSettings && dataSource.createdById === reqUserId
        ? dataSource.settings
        : Object.fromEntries(
            Object.entries(dataSource.settings).filter(
              ([key, _]) => meta.settings[key].public
            )
          ),
    ownerId: dataSource.createdById ?? undefined,
  } as const;
}

export async function listDataSources(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const maybeWorkspaceId = req.query.workspaceId
    ? (JSON.parse(req.query.workspaceId as string) as WorkspaceId)
    : undefined;
  const workspaces = maybeWorkspaceId
    ? [await mgr.getWorkspaceById(maybeWorkspaceId)]
    : await mgr.getAffiliatedWorkspaces();
  const sources = await Promise.all(
    workspaces.map(async (workspace) => ({
      workspace: mkApiWorkspace(workspace),
      dataSources: (
        await mgr.getWorkspaceDataSources(workspace.id)
      ).map((dataSource) => mkApiDataSource(dataSource, req.user!.id)),
    }))
  );
  res.json(ensureType<ListDataSourcesResponse>(sources));
}

export async function createDataSource(req: Request, res: Response) {
  const mgr = userDbMgr(req);

  const fields = req.body as ApiCreateDataSourceRequest;

  if (!fields.name) {
    throw new BadRequestError(`Missing ${DATA_SOURCE_LOWER} name`);
  }
  if (!fields.source || !getAllDataSourceTypes().includes(fields.source)) {
    throw new BadRequestError(
      `Invalid ${DATA_SOURCE_LOWER} type ${fields.source}`
    );
  }
  let workspaceId: WorkspaceId | undefined = fields.workspaceId;
  if (!workspaceId) {
    workspaceId = (await mgr.getPersonalWorkspace())?.id;
  }
  if (!workspaceId) {
    throw new BadRequestError(`Missing workspace id`);
  }
  const sourceMeta = getDataSourceMeta(fields.source);
  ensureDataSourceSettings(fields.credentials, sourceMeta.credentials);
  ensureDataSourceSettings(fields.settings, sourceMeta.settings);
  const dataSource = await mgr.createDataSource(workspaceId, {
    name: fields.name,
    credentials: fields.credentials,
    source: fields.source,
    settings: fields.settings,
  });
  res.json(
    ensureType<ApiDataSource>(mkApiDataSource(dataSource, req.user!.id))
  );
}

export async function testDataSourceConnection(req: Request, res: Response) {
  const mgr = userDbMgr(req);

  const fields = req.body as ApiCreateDataSourceRequest;

  let workspaceId: WorkspaceId | undefined = fields.workspaceId;
  if (!workspaceId) {
    workspaceId = (await mgr.getPersonalWorkspace())?.id;
  }

  if (!fields.source || !getAllDataSourceTypes().includes(fields.source)) {
    throw new BadRequestError(
      `Invalid ${DATA_SOURCE_LOWER} type ${fields.source}`
    );
  }

  if (!workspaceId) {
    throw new BadRequestError(`Missing workspace id`);
  }

  const sourceMeta = getDataSourceMeta(fields.source);
  ensureDataSourceSettings(fields.credentials, sourceMeta.credentials);
  ensureDataSourceSettings(fields.settings, sourceMeta.settings);

  const tmpDataSource = (await mgr.createUnsavedDataSource(workspaceId, {
    name: fields.name,
    credentials: fields.credentials,
    source: fields.source,
    settings: fields.settings,
  })) as GenericDataSource;

  try {
    const fecher = await makeFetcher(req.con, tmpDataSource);
    if ("getSchema" in fecher) {
      await hackyCast(fecher).getSchema();
    }
    res.json({
      result: {
        connected: true,
      },
    });
  } catch (err) {
    Sentry.captureException(err);
    res.json({
      result: {
        connected: false,
        error: err.message,
      },
    });
  }
}

function ensureDataSourceSettings(
  settings: Record<string, string>,
  metas: Record<string, SettingFieldMeta>,
  opts?: {
    skipRequiredCheck: boolean;
  }
) {
  for (const [key, fieldMeta] of Object.entries(metas)) {
    if (!opts?.skipRequiredCheck && fieldMeta.required && !settings[key]) {
      throw new BadRequestError(`Missing required field ${key}`);
    }
    if (key in settings) {
      settings[key] = coerceArgStringToType(settings[key], fieldMeta);
    }
  }
  return settings;
}

export async function updateDataSource(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const id: string = req.params.dataSourceId;
  const fields = { ...req.body } as ApiUpdateDataSourceRequest;

  let dataSource = await mgr.getDataSourceById(id);
  const sourceMeta = getDataSourceMeta(dataSource.source);

  if (fields.settings) {
    ensureDataSourceSettings(fields.settings, sourceMeta.settings);
  }
  if (fields.credentials) {
    ensureDataSourceSettings(fields.credentials, sourceMeta.credentials, {
      skipRequiredCheck: true,
    });
  }

  dataSource = await mgr.updateDataSource(id, fields);
  res.json(
    ensureType<ApiDataSource>(mkApiDataSource(dataSource, req.user!.id))
  );
}

export async function deleteDataSource(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const id: string = req.params.dataSourceId;
  const deletedDataSource = await mgr.deleteDataSource(id);
  if (deletedDataSource.source === "fake") {
    dropFakeDatabase(id);
  }
  res.json({});
}

export async function getDataSourceOperationId(req: Request, res: Response) {
  const dataSourceId = req.params.dataSourceId;
  const mgr = userDbMgr(req);
  // Make sure permission checks out
  const dataSource = await mgr.getDataSourceById(dataSourceId, {
    columns: ["id"],
  });
  const projectId = req.body.projectId;

  // This check is required so that we don't ever allow a malicious project
  // to issue an operation id for a data source that it is not allowed to use.
  const isAllowedToIssueOpId = await mgr.isProjectAllowedToUseDataSource(
    projectId,
    dataSourceId as DataSourceId
  );

  if (!isAllowedToIssueOpId) {
    throw new ForbiddenError(
      `Project ${projectId} is not allowed to use data source ${dataSourceId}`
    );
  }

  const op: OperationTemplate = {
    name: req.body.name,
    templates: req.body.templates,
    roleId: req.body.roleId,
  };
  const opId = await makeDataSourceOperationId(mgr, dataSource.id, op);
  res.json({
    opId,
  });
}

export async function executeDataSourceStudioOperationHandler(
  req: Request,
  res: Response
) {
  const dataSourceId = req.params.dataSourceId;
  const mgr = userDbMgr(req);
  const dataSource = await mgr.getDataSourceById(dataSourceId);
  const request: ApiExecuteDataSourceStudioOpRequest = req.body;

  const projectId = req.body.projectId;

  const isAllowedToIssueOpId = await mgr.isProjectAllowedToUseDataSource(
    projectId as ProjectId,
    dataSourceId as DataSourceId
  );

  // If a project is not allowed to issue an operation id, it shouldn't be allowed
  // to execute studio operations either.
  if (!isAllowedToIssueOpId) {
    throw new ForbiddenError(
      `Project ${projectId} is not allowed to use data source ${dataSourceId}`
    );
  }

  const op: OperationTemplate = {
    name: request.name,
    templates: request.args ?? {},
  };
  const userArgs = req.body.userArgs ?? undefined;
  const data = await executeDataSourceOperation(
    req.con,
    dataSource as GenericDataSource,
    op,
    userArgs,
    {
      paginate: request.paginate,
    },
    undefined,
    true
  );
  res.header("Access-Control-Allow-Origin", "*");
  res.json(data);
}

/*
export async function generateTemporaryToken(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const token = await mgr.createTemporaryTeamApiToken();
  res.json({ token: token.token });
}

export async function revokeTemporaryToken(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  await mgr.revokeTemporaryTeamApiToken();
  res.json({});
}
*/

export async function getDataSourceById(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const dataSourceId = req.params.dataSourceId as WorkspaceId;
  const dataSource = await mgr.getDataSourceById(dataSourceId);
  const excludeSettings = req.query.excludeSettings
    ? (JSON.parse(req.query.excludeSettings as string) as boolean)
    : undefined;
  res.json(mkApiDataSource(dataSource, req.user!.id, excludeSettings));
}

// Data Source endpoint to fetch bases metadata

export async function listAirtableBases(req: Request, res: Response) {
  const mgr = superDbMgr(req);
  assert(req.user, "Unexpected undefined user");
  const tokenData = await mgr.tryGetOauthToken(req.user?.id, "airtable");
  if (!tokenData) {
    throw new NotFoundError("Oauth token not found");
  }
  res.json({
    bases: await fetchBases(tokenData),
  } as ListDataSourceBasesResponse);
}

export async function allowProjectToDataSource(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const dataSourceId = req.params.dataSourceId as DataSourceId;
  const projectId = req.body.projectId as ProjectId;
  await mgr.allowProjectToDataSources(projectId, [dataSourceId]);
  res.json({});
}
