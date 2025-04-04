/** @jest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { CmsTable, User } from "@/wab/server/entities/Entities";
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { APIRequestContext, request } from "playwright";

import { CmsRow } from "@/wab/server/entities/Entities";
import {
  CmsMetaType,
  CmsRowId,
  CmsTableId,
  CmsText,
  UniqueFieldCheck,
} from "@/wab/shared/ApiSchema";
import { Dict } from "@/wab/shared/collections";

class UniqueCheckApiTester extends ApiTester {
  constructor(
    api: APIRequestContext,
    baseURL: string,
    extraHeaders: { [name: string]: string } = {}
  ) {
    super(api, baseURL, extraHeaders);
  }

  async checkUniqueFields(
    tableId: CmsTableId,
    data: {
      rowId: CmsRowId;
      uniqueFieldsData: Dict<unknown>;
    }
  ): Promise<UniqueFieldCheck> {
    return await this.req(
      "post",
      `/cmse/tables/${tableId}/check-unique-fields`,
      data
    );
  }
}

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

describe("unique-check Api", () => {
  let apiRequestContext: APIRequestContext;
  let api: UniqueCheckApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let userToken: string;
  let user: User;

  let table: CmsTable;
  let rows: CmsRow[];

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
        schema: { fields: [createUniqueTextField("field")] },
      });
      rows = await db.createCmsRows(table.id, [
        { data: { "": { field: 0 } } },
        { data: { "": { field: 1 } } },
        { data: { "": { field: 2 } } },
      ]);
    });

    const { host, cleanup: cleanupBackend } = await createBackend(dburi);
    baseURL = `${host}/api/v1`;
    cleanup = async () => {
      await cleanupBackend();
      await cleanupDatabase();
    };
  });

  beforeEach(async () => {
    apiRequestContext = await request.newContext({
      baseURL,
    });
    api = new UniqueCheckApiTester(apiRequestContext, baseURL, {
      "x-plasmic-api-user": user.email,
      "x-plasmic-api-token": userToken,
    });
    await api.refreshCsrfToken();
    await api.login({
      email: "user@example.com",
      password: "!53kr3tz!",
    });
  });

  afterEach(async () => {
    await apiRequestContext.dispose();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("should check uniqueness violation", async () => {
    const noConflict = await api.checkUniqueFields(table.id, {
      rowId: rows[0].id,
      uniqueFieldsData: { field: 10 },
    });
    const conflict = await api.checkUniqueFields(table.id, {
      rowId: rows[0].id,
      uniqueFieldsData: { field: 1 },
    });
    expect(noConflict).toEqual([
      { fieldIdentifier: "field", value: 10, ok: true, conflictRowIds: [] },
    ]);
    expect(conflict).toEqual([
      {
        fieldIdentifier: "field",
        value: 1,
        ok: false,
        conflictRowIds: [rows[1].id],
      },
    ]);
  });
});
