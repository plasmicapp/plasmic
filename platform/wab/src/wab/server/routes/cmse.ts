import { Dict } from "@/wab/collections";
import { ensureArray, ensureString, ensureType } from "@/wab/common";
import { uploadDataUriToS3 } from "@/wab/server/cdn/images";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { CmsDatabase } from "@/wab/server/entities/Entities";
import { triggerWebhookOnly } from "@/wab/server/trigger-webhooks";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import {
  ApiCmsDatabase,
  ApiCmsDatabaseMeta,
  ApiCmseRow,
  ApiCreateCmsRowsResponse,
  CmsDatabaseId,
  CmsRowId,
  CmsRowRevisionId,
  CmsTableId,
  CmsUploadedFile,
  ListCmsDatabasesMetaResponse,
  TeamId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { UploadedFile } from "express-fileupload";
import { Request, Response } from "express-serve-static-core";
import { imageSize } from "image-size";
import { flatten, mapValues, pick } from "lodash";
import { userAnalytics, userDbMgr } from "./util";
import { mkApiWorkspace } from "./workspaces";

export async function listDatabases(req: Request, res: Response) {
  if (req.query.workspaceId) {
    const workspaceId = req.query.workspaceId as WorkspaceId;
    const mgr = userDbMgr(req);
    const databases = await mgr.listCmsDatabases(workspaceId as WorkspaceId);
    res.json({ databases: await makeApiDatabases(mgr, databases) });
  } else if (req.query.teamId) {
    const teamId = req.query.teamId as TeamId;
    const mgr = userDbMgr(req);
    const workspaces = await mgr.getAffiliatedWorkspaces(teamId);
    const databases = flatten(
      await Promise.all(
        workspaces.map(async (w) => await mgr.listCmsDatabases(w.id))
      )
    );
    res.json({ databases: await makeApiDatabases(mgr, databases) });
  } else {
    throw new BadRequestError(
      "Can only fetch databases for a specific workspace"
    );
  }
}

export async function getCmsDatabaseAndSecretTokenById(
  req: Request,
  res: Response
) {
  const databaseId = req.params.dbId;
  const mgr = userDbMgr(req);
  const database = await mgr.getCmsDatabaseAndSecretTokenById(
    databaseId as CmsDatabaseId
  );
  res.json(await makeApiDatabase(mgr, database));
}

export async function getDatabaseMeta(req: Request, res: Response) {
  const databaseId = req.params.dbId;
  const mgr = userDbMgr(req);
  const database = await mgr.getCmsDatabaseById(databaseId as CmsDatabaseId);
  res.json(
    ensureType<ApiCmsDatabaseMeta>(pick(database, "id", "name", "publicToken"))
  );
}

export async function listDatabasesMeta(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const workspaces = await mgr.getAffiliatedWorkspaces();
  const data = await Promise.all(
    workspaces.map(async (workspace) => {
      return {
        workspace: mkApiWorkspace(workspace),
        databases: await mgr.listCmsDatabases(workspace.id),
      };
    })
  );
  res.json(ensureType<ListCmsDatabasesMetaResponse>(data));
}

export async function updateDatabase(req: Request, res: Response) {
  const databaseId = req.params.dbId;
  const mgr = userDbMgr(req);
  const database = await mgr.updateCmsDatabaseById(
    databaseId as CmsDatabaseId,
    req.body
  );
  userAnalytics(req).track({
    event: "Update cms database",
    properties: {
      workspaceId: database.workspaceId,
      databaseName: database.name,
      databaseId: database.id as CmsDatabaseId,
    },
  });
  res.json(await makeApiDatabase(mgr, database));
}

export async function deleteDatabase(req: Request, res: Response) {
  const databaseId = req.params.dbId;
  const mgr = userDbMgr(req);
  const db = await mgr.getCmsDatabaseById(databaseId as CmsDatabaseId);
  userAnalytics(req).track({
    event: "Delete cms database",
    properties: {
      workspaceId: db.workspaceId,
      databaseName: db.name,
      databaseId: db.id as CmsDatabaseId,
    },
  });
  await mgr.deleteCmsDatabase(databaseId as CmsDatabaseId);
  res.json({});
}

export async function makeApiDatabases(mgr: DbMgr, databases: CmsDatabase[]) {
  return await Promise.all(databases.map(async (d) => makeApiDatabase(mgr, d)));
}

export async function makeApiDatabase(
  mgr: DbMgr,
  database: CmsDatabase
): Promise<ApiCmsDatabase> {
  const tables = await mgr.listCmsTables(database.id);
  return {
    ...database,
    tables,
  };
}

export async function createDatabase(req: Request, res: Response) {
  const name = ensureString(req.body.name);
  const workspaceId = ensureString(req.body.workspaceId);
  const mgr = userDbMgr(req);
  const db = await mgr.createCmsDatabase({
    name,
    workspaceId: workspaceId as WorkspaceId,
  });
  userAnalytics(req).track({
    event: "Create cms database",
    properties: {
      workspaceId: workspaceId as WorkspaceId,
      databaseName: name,
      databaseId: db.id as CmsDatabaseId,
    },
  });
  res.json(await makeApiDatabase(mgr, db));
}

export async function createTable(req: Request, res: Response) {
  const databaseId = req.params.dbId;
  const name = ensureString(req.body.name);
  const identifier = ensureString(req.body.identifier);
  const schema = req.body.schema as any;
  const mgr = userDbMgr(req);
  const table = await mgr.createCmsTable({
    name,
    identifier,
    databaseId: databaseId as CmsDatabaseId,
    schema,
  });
  userAnalytics(req).track({
    event: "Create cms table",
    properties: {
      tableId: table.id as CmsTableId,
      tableName: name,
      databaseId: databaseId,
    },
  });
  res.json(table);
}

export async function updateTable(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const table = await mgr.updateCmsTable(
    req.params.tableId as CmsTableId,
    req.body
  );
  userAnalytics(req).track({
    event: "Update cms table",
    properties: {
      tableId: table.id as CmsTableId,
      tableName: table.name,
      databaseId: table.databaseId,
    },
  });
  res.json(table);
}

export async function deleteTable(req: Request, res: Response) {
  const tableId = req.params.tableId;
  const mgr = userDbMgr(req);
  const table = await mgr.getCmsTableById(tableId as CmsTableId);
  userAnalytics(req).track({
    event: "Delete cms table",
    properties: {
      tableId: table.id as CmsTableId,
      tableName: table.name,
      databaseId: table.databaseId,
    },
  });
  await mgr.deleteCmsTable(tableId as CmsTableId);
  res.json({});
}

export async function listRows(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const rows = await mgr.queryCmsRows(
    req.params.tableId as CmsTableId,
    {
      limit: 5000,
    },
    { useDraft: true }
  );
  const fields = ensureArray(req.query.fields ?? []) as string[];
  if (fields && fields.length > 0) {
    const projectedRows = projectRows(rows, fields);
    res.json({ rows: projectedRows });
  } else {
    res.json({ rows });
  }
}

function projectRows(rows: ApiCmseRow[], fields: string[]) {
  return rows.map((row) => ({
    ...row,
    data: row.data ? projectRowData(row.data, fields) : row.data,
    draftData: row.draftData
      ? projectRowData(row.draftData, fields)
      : row.draftData,
  }));
}

function projectRowData(data: Dict<Dict<unknown>>, fields: string[]) {
  return mapValues(data, (langData) => pick(langData, ...fields));
}

export async function deleteRow(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const row = await mgr.getCmsRowById(req.params.rowId as CmsRowId);
  userAnalytics(req).track({
    event: "Delete cms row",
    properties: {
      rowId: row.id as CmsRowId,
      tableId: row.tableId,
      tableName: row.table?.name,
      databaseId: row.table?.databaseId,
    },
  });
  await mgr.deleteCmsRow(req.params.rowId as CmsRowId);
  res.json({});
}

export async function updateRow(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const row = await mgr.updateCmsRow(req.params.rowId as CmsRowId, req.body);
  userAnalytics(req).track({
    event: "Update cms row",
    properties: {
      rowId: row.id as CmsRowId,
      tableId: row.tableId,
      tableName: row.table?.name,
      databaseId: row.table?.databaseId,
    },
  });
  res.json(row);
}

export async function triggerTableWebhooks(req: Request, res: Response) {
  const event = req.query.event as string;
  const mgr = userDbMgr(req);
  const table = await mgr.getCmsTableById(req.params.tableId as CmsTableId);
  const webhooks = table.settings?.webhooks?.filter(
    (hook) => hook.event === event
  );
  if (webhooks && webhooks.length > 0) {
    const responses = await Promise.all(
      webhooks.map((hook) => triggerWebhookOnly(hook))
    );
    res.json({ responses });
  } else {
    res.json({ responses: [] });
  }
}

export async function createRows(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const rows = await mgr.createCmsRows(
    req.params.tableId as CmsTableId,
    req.body.rows
  );
  rows.forEach((row) => {
    userAnalytics(req).track({
      event: "Create cms row",
      properties: {
        rowId: row.id as CmsRowId,
        tableId: row.tableId,
        tableName: row.table?.name,
        databaseId: row.table?.databaseId,
      },
    });
  });
  res.json(ensureType<ApiCreateCmsRowsResponse>({ rows: rows }));
}

export async function getRow(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const row = await mgr.getCmsRowById(req.params.rowId as CmsRowId);
  res.json(row);
}

export async function listRowRevisions(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const revisions = await mgr.listCmsRowRevisionsByRowId(
    req.params.rowId as CmsRowId
  );
  res.json({ revisions });
}

export async function getRowRevision(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const revision = await mgr.getCmsRowRevisionById(
    req.params.revId as CmsRowRevisionId
  );
  res.json({ revision });
}

function mkDataUri(mime: string, charset: string, data: Buffer) {
  const encodedData = data.toString("base64");
  return `data:${mime};charset=${charset};base64,${encodedData}`;
}

async function upload(file: UploadedFile): Promise<CmsUploadedFile> {
  const dataUri = mkDataUri(file.mimetype, file.encoding, file.data);
  const result = await uploadDataUriToS3(dataUri, { imageOnly: false });
  if (result.result.isError) {
    throw result.result.error;
  }

  const size = file.mimetype.startsWith("image/")
    ? imageSize(file.data)
    : undefined;
  const imageMeta =
    size?.width && size?.height
      ? { width: size.width, height: size.height }
      : undefined;

  return {
    name: file.name,
    url: result.result.value,
    mimetype: file.mimetype,
    size: file.size,
    imageMeta,
  };
}

export async function cmsFileUpload(req: Request, res: Response) {
  if (!req.files || Object.keys(req.files).length === 0) {
    res.status(400).send("No files were uploaded.");
    return;
  }

  const promises = Promise.all(
    Object.entries(req.files).flatMap(([_, files]) =>
      Array.isArray(files) ? files.map((f) => upload(f)) : [upload(files)]
    )
  );
  const files = ensureType<CmsUploadedFile[]>(await promises);

  res.json({ files });
}
