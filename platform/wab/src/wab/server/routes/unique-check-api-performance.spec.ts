/** @jest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { CmsTable, User } from "@/wab/server/entities/Entities";
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { APIRequestContext, request } from "playwright";

import { CmsRow } from "@/wab/server/entities/Entities";
import { CmsMetaType, CmsText } from "@/wab/shared/ApiSchema";

const createUniqueTextField = (fieldIdentifier: string): CmsText => ({
  identifier: fieldIdentifier,
  name: "",
  helperText: "",
  required: false,
  hidden: false,
  localized: false,
  unique: true,
  type: CmsMetaType.TEXT,
  defaultValueByLocale: {},
});

let apiRequestContext: APIRequestContext;
let api: ApiTester;
let baseURL: string;
let cleanup: () => Promise<void>;

let userToken: string;
let user: User;
let table: CmsTable;
let firstRow: CmsRow;
let lastRow: CmsRow;
let checkingRow: CmsRow;

beforeAll(async () => {
  const {
    dburi,
    dbname,
    cleanup: cleanupDatabase,
  } = await createDatabase("unique_test");
  const con = await ensureDbConnection(dburi, dbname);
  await con.synchronize();
  await con.transaction(async (em) => {
    const userAndProjects = await seedTestUserAndProjects(
      em,
      {
        email: "user@example.com",
      },
      4
    );
    user = userAndProjects.user;

    const db = new DbMgr(em, normalActor(user.id));
    const pat = await db.createPersonalApiToken(user.id);
    userToken = pat.token;

    const team = await db.createTeam("team");
    const workspace = await db.createWorkspace({
      name: "workspace",
      description: "description",
      teamId: team.id,
    });
    const database = await db.createCmsDatabase({
      name: "database",
      workspaceId: workspace.id,
    });
    table = await db.createCmsTable({
      identifier: "tableIdentifier",
      name: "tableName",
      databaseId: database.id,
      schema: {
        fields: [
          createUniqueTextField("field1"),
          createUniqueTextField("field2"),
        ],
      },
    });
    const numOfRows = 1000;
    firstRow = await db.createCmsRow(table.id, {
      data: { "": { field1: 0, field2: 0 } },
    });
    for (let i = 1; i <= numOfRows; i++) {
      await db.createCmsRow(table.id, {
        data: { "": { field1: i, field2: i } },
      });
    }
    lastRow = await db.createCmsRow(table.id, {
      data: { "": { field1: 0, field2: 0 } },
    });
    checkingRow = await db.createCmsRow(table.id, {});
  });
  const { host, cleanup: cleanupBackend } = await createBackend(dburi);
  baseURL = `${host}/api/v1`;
  cleanup = async () => {
    await cleanupBackend();
    await cleanupDatabase();
  };
});

describe("unique-check performance test", () => {
  beforeEach(async () => {
    apiRequestContext = await request.newContext({
      baseURL,
    });
    api = new ApiTester(apiRequestContext, baseURL, {
      "x-plasmic-api-user": user.email,
      "x-plasmic-api-token": userToken,
    });
    await api.refreshCsrfToken();
    await api.login({
      email: "user@example.com",
      password: "!53kr3tz!",
    });
  });

  test("with many rows", async () => {
    const start = Date.now();
    const result = await api.checkUniqueFields(table.id, {
      rowId: checkingRow.id,
      uniqueFieldsData: { field1: 0 },
    });
    const end = Date.now();
    console.log(start, "->", end);
    console.log("it takes: ", end - start);
    expect(result).toEqual([
      {
        fieldIdentifier: "field1",
        value: 0,
        ok: false,
        conflictRowIds: [firstRow.id, lastRow.id],
      },
    ]);
  });
});
