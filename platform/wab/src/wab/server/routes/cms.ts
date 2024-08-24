import { toOpaque } from "@/wab/commons/types";
import { DbMgr } from "@/wab/server/db/DbMgr";
import { CmsRow } from "@/wab/server/entities/Entities";
import { makeApiDatabase } from "@/wab/server/routes/cmse";
import { userAnalytics, userDbMgr } from "@/wab/server/routes/util";
import {
  denormalizeCmsData,
  makeFieldMetaMap,
  normalizeCmsData,
  projectCmsData,
} from "@/wab/server/util/cms-util";
import {
  ApiCmsQuery,
  ApiCmsTable,
  CmsDatabaseId,
  CmsFieldMeta,
  CmsRowId,
  CmsTableSchema,
} from "@/wab/shared/ApiSchema";
import { ensure, ensureString } from "@/wab/shared/common";
import { NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import { differenceBy } from "lodash";

function toApiCmsRow(
  row: CmsRow,
  useDraft: boolean,
  fieldMetaMap: Record<string, CmsFieldMeta>,
  locale: string
) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    identifier: row.identifier,
    data: projectCmsData(
      (useDraft ? row.draftData ?? row.data : row.data) ?? {},
      fieldMetaMap,
      locale
    ),
  };
}

async function getTableByIdentifier(mgr: DbMgr, req: Request) {
  return await mgr.getCmsTableByIdentifier(
    req.params.dbId as CmsDatabaseId,
    req.params.tableIdentifier
  );
}

export async function queryTable(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const table = await getTableByIdentifier(mgr, req);

  // Query is encoded as the q= query param, a JSON string
  const query = JSON.parse(ensureString(req.query.q ?? "{}")) as ApiCmsQuery;
  const locale = fixLocale((req.query.locale ?? "") as string);
  const useDraft = shouldUseDraft(req);
  const rows = await mgr.queryCmsRows(table.id, query, { useDraft });
  const metaMap = makeFieldMetaMap(table.schema, query.fields);
  res.json({
    rows: rows.map((r) => toApiCmsRow(r, useDraft, metaMap, locale)),
  });
}

export async function countTable(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const table = await getTableByIdentifier(mgr, req);

  // Query is encoded as the q= query param, a JSON string
  const query = JSON.parse(ensureString(req.query.q ?? "{}"));
  const useDraft = shouldUseDraft(req);
  const count = await mgr.countCmsRows(table.id, query, { useDraft });
  res.json({
    count,
  });
}

export async function getDatabase(req: Request, res: Response) {
  const databaseId = req.params.dbId;
  const mgr = userDbMgr(req);
  const database = await mgr.getCmsDatabaseById(databaseId as CmsDatabaseId);
  res.json(await makeApiDatabase(mgr, database));
}

export async function upsertDatabaseTables(req: Request, res: Response) {
  const databaseId: CmsDatabaseId = toOpaque(req.params.dbId);
  const deleteUnspecified = req.body.deleteUnspecified as boolean;
  const tables: ApiCmsTable[] = req.body.tables;
  const mgr = userDbMgr(req);
  const database = await mgr.getCmsDatabaseById(databaseId);
  const existingTables = await mgr.listCmsTables(databaseId);
  if (deleteUnspecified) {
    const toDrop = differenceBy(existingTables, tables, (t) => t.identifier);
    for (const table of toDrop) {
      await mgr.deleteCmsTable(table.id);
    }
  }
  for (const table of tables) {
    const existingTable = existingTables.find(
      (t) => t.identifier === table.identifier
    );
    if (existingTable) {
      await mgr.updateCmsTable(existingTable.id, table);
    } else {
      await mgr.createCmsTable({
        ...table,
        databaseId,
      });
    }
  }

  const updatedDb = await mgr.getCmsDatabaseById(databaseId as CmsDatabaseId);
  res.json(await makeApiDatabase(mgr, updatedDb));
}

export async function cloneDatabase(req: Request, res: Response) {
  const databaseId: CmsDatabaseId = toOpaque(req.params.dbId);
  const databaseName = req.body.name as string;

  const mgr = userDbMgr(req);
  const newDb = await mgr.cloneCmsDatabase(databaseId, databaseName);
  const updatedDb = await mgr.getCmsDatabaseById(newDb.id);
  res.json(await makeApiDatabase(mgr, updatedDb));
}

function toWriteApiCmsRow(
  row: CmsRow,
  tableSchema: CmsTableSchema,
  locales?: string[]
) {
  return {
    id: row.id,
    tableId: row.tableId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    identifier: row.identifier,
    data: denormalizeCmsData(row.data, tableSchema.fields, locales),
    draftData: denormalizeCmsData(row.draftData, tableSchema.fields, locales),
  };
}

export async function publicPublishRow(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const row = await mgr.publishCmsRow(req.params.rowId as CmsRowId);
  const table = await mgr.getCmsTableById(row.tableId);
  const db = await mgr.getCmsDatabaseById(table.databaseId);
  userAnalytics(req).track({
    event: "Publish cms row",
    properties: {
      rowId: row.id as CmsRowId,
      tableId: row.tableId,
      tableName: table.name,
      databaseId: table.databaseId,
    },
  });
  res.json(toWriteApiCmsRow(row, table.schema, db.extraData.locales));
}

export async function publicDeleteRow(req: Request, res: Response) {
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

export async function publicUpdateRow(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const row = await mgr.getCmsRowById(req.params.rowId as CmsRowId);
  const table = await mgr.getCmsTableById(row.tableId);
  const db = await mgr.getCmsDatabaseById(table.databaseId);

  let updatedRow = await mgr.updateCmsRow(row.id as CmsRowId, {
    identifier: req.body.identifier,
    draftData: normalizeCmsData(
      req.body.data,
      makeFieldMetaMap(table.schema),
      db.extraData.locales
    ),
  });
  if (shouldPublish(req)) {
    /* update draft data and publish instead of just updating data to avoid
    removing non-published draft data */
    updatedRow = await mgr.publishCmsRow(row.id);
  }
  userAnalytics(req).track({
    event: "Update cms row",
    properties: {
      rowId: row.id as CmsRowId,
      tableId: row.tableId,
      tableName: table.name,
      databaseId: table.databaseId,
    },
  });
  res.json(toWriteApiCmsRow(updatedRow, table.schema, db.extraData.locales));
}

export async function publicCreateRows(req: Request, res: Response) {
  const mgr = userDbMgr(req);
  const table = await getTableByIdentifier(mgr, req);
  const db = await mgr.getCmsDatabaseById(table.databaseId);
  ensure(req.body.rows, "'rows' should exist to create rows");
  const rows = await mgr.createCmsRows(
    table.id,
    req.body.rows.map((row) => {
      const normalizedData = normalizeCmsData(
        row.data,
        makeFieldMetaMap(table.schema),
        db.extraData.locales
      );
      return shouldPublish(req)
        ? { data: normalizedData, identifier: row.identifier }
        : { draftData: normalizedData, identifier: row.identifier };
    })
  );
  rows.forEach((row) => {
    userAnalytics(req).track({
      event: "Create cms row",
      properties: {
        rowId: row.id as CmsRowId,
        tableId: row.tableId,
        tableName: table.name,
        databaseId: table.databaseId,
      },
    });
  });
  res.json({
    rows: rows.map((row) =>
      toWriteApiCmsRow(row, table.schema, db.extraData.locales)
    ),
  });
}

function shouldPublish(req: Request) {
  return req.query.publish === "1";
}

function shouldUseDraft(req: Request) {
  return req.query.draft === "1";
}

function fixLocale(locale: string) {
  return locale === "undefined" ? "" : locale;
}

export function cachePublicCmsRead(
  req: Request,
  res: Response | null,
  next: NextFunction
) {
  // Instruct cloudfront to cache reads for 1 minute for
  // now to avoid huge spikes.  But we make an exception for
  // when we are requesting the "draft" version, as that should
  // always return the freshest draft data.
  if (req.query.draft !== "1") {
    res?.setHeader("Cache-Control", `max-age=${60}`);
  }
  return next();
}
