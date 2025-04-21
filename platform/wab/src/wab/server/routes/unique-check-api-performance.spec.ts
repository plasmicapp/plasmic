/** @jest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { CmsTable, User } from "@/wab/server/entities/Entities";
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { CmsMetaType, CmsRowId, CmsText } from "@/wab/shared/ApiSchema";
import { APIRequestContext, request } from "playwright";

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
let numOfRows: number;
let count: number;

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
  });
  numOfRows = 100;
  const tempDate = new Date().toISOString();
  for (let i = 0; i < numOfRows; i++) {
    const sql = `insert into cms_row (id, "tableId", "createdAt", "updatedAt", data, rank) values ('${i}', '${table.id}', '${tempDate}', '${tempDate}', '{"": {"field1": ${i}, "field2": ${i}}}', '');`;
    await con.query(sql);
  }
  count = await con.query("SELECT COUNT(*) FROM cms_row");
  const { host, cleanup: cleanupBackend } = await createBackend(dburi);
  baseURL = `${host}/api/v1`;
  cleanup = async () => {
    await cleanupBackend();
    await cleanupDatabase();
  };
}, 600000);

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
      rowId: "1" as CmsRowId,
      uniqueFieldsData: { field1: 0 },
    });
    const end = Date.now();
    console.log(
      "Result... ",
      count,
      " rows : (",
      start,
      "->",
      end,
      ") duration: ",
      end - start
    );
    expect(result).toEqual([
      {
        fieldIdentifier: "field1",
        value: 0,
        ok: false,
        conflictRowIds: ["0"],
      },
    ]);
  });
});
