/** @jest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { CmsTable, User } from "@/wab/server/entities/Entities";
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { APIRequestContext, APIResponse, request } from "playwright";

import { CmsRow } from "@/wab/server/entities/Entities";
import {
  CmsMetaType,
  CmsRowId,
  CmsTableId,
  CmsText,
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
  ): Promise<APIResponse> {
    return this.rawReq(
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

describe("unique-check API", () => {
  let apiRequestContext: APIRequestContext;
  let api: UniqueCheckApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let userToken: string;
  let user: User;

  let table: CmsTable;
  let rows: CmsRow[];
  const numberOfRequests = 100;

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
        { data: { "": { field: 1 } } },
        { data: { "": { field: 2 } } },
        { data: { "": { field: 3 } } },
        { data: { "": { field: 4 } } },
        { data: { "": { field: 5 } } },
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

  it("should response to unique-check API call in less than 20 ms", async () => {
    const checkingRow = rows[0];
    const requests: Promise<APIResponse>[] = [];
    for (let i = 0; i < numberOfRequests; i++) {
      requests.push(
        api.checkUniqueFields(table.id, {
          rowId: checkingRow.id,
          uniqueFieldsData: { field: 10 },
        })
      );
    }
    const startTime = Date.now();
    await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;
    const averageResponseTime = duration / numberOfRequests;

    console.log(`All requests completed in ${duration} ms`);
    console.log(`Average response time is ${duration / numberOfRequests}`);
    expect(averageResponseTime).toBeLessThan(20);
  });
});
