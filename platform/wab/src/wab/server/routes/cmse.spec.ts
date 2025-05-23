/** @jest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { CmsRow, CmsTable, User } from "@/wab/server/entities/Entities";
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { isUniqueViolationError } from "@/wab/shared/ApiErrors/cms-errors";
import { CmsMetaType, CmsRowId } from "@/wab/shared/ApiSchema";
import { APIRequestContext, request } from "playwright";

const ROWS = 10;

describe("unique violation check", () => {
  let apiRequestContext: APIRequestContext;
  let api: ApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let userToken: string;
  let user: User;
  let table: CmsTable;
  let published: CmsRow[];
  let published0Duplicate: CmsRow;
  let draft: CmsRow;
  let check: CmsRow;

  /** Test checkUniqueFields and updateCmsRow (publish) have the same behavior. */
  async function testCheckAndPublish(
    rowId: CmsRowId,
    data: { numField: number | null; textField: string | null }
  ) {
    const uniqueFieldChecks = await api.checkUniqueFields(table.id, {
      rowId,
      uniqueFieldsData: data,
    });

    const publishResult = await api.updateCmsRow(rowId, {
      data: { "": data },
    });

    if (uniqueFieldChecks.some((fieldCheck) => !!fieldCheck.conflictRowId)) {
      expect(isUniqueViolationError((publishResult as any).error)).toBe(true);
      expect((publishResult as any).error.violations).toEqual(
        uniqueFieldChecks
      );
    } else {
      expect(publishResult).toMatchObject({
        id: rowId,
        data: { "": data },
      });
    }

    return uniqueFieldChecks;
  }

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
        0
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
            {
              identifier: "numField",
              name: "",
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              unique: true,
              type: CmsMetaType.NUMBER,
              defaultValueByLocale: {},
            },
            {
              identifier: "textField",
              name: "",
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              unique: true,
              type: CmsMetaType.TEXT,
              defaultValueByLocale: {},
            },
          ],
        },
      });
      published = await db.createCmsRows(
        table.id,
        new Array(ROWS)
          .fill(0)
          .map((_, i) => ({ data: { "": { numField: i, textField: `${i}` } } }))
      );
      published0Duplicate = await db.createCmsRow(table.id, {
        data: { "": { numField: 0, textField: "0" } },
      });
      draft = await db.createCmsRow(table.id, {
        draftData: { "": { numField: -1, textField: "draft" } },
      });
      check = await db.createCmsRow(table.id, {
        draftData: { "": {} },
      });
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

  afterEach(async () => {
    await apiRequestContext.dispose();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("responds with 400 if missing unique fields", async () => {
    expect(
      await api.checkUniqueFields(table.id, {
        rowId: check.id,
        uniqueFieldsData: {},
      })
    ).toMatchObject({
      error: {
        statusCode: 400,
        name: "BadRequestError",
        message: "No unique fields to check",
      },
    });
  });

  it("responds with 400 if unique fields data not set", async () => {
    expect(
      await api.checkUniqueFields(table.id, {
        rowId: check.id,
        uniqueFieldsData: {
          numField: null,
          textField: undefined,
        },
      })
    ).toMatchObject({
      error: {
        statusCode: 400,
        name: "BadRequestError",
        message: "No unique fields to check",
      },
    });
  });

  it("allows unique data", async () => {
    expect(
      await api.checkUniqueFields(table.id, {
        rowId: check.id,
        uniqueFieldsData: { numField: ROWS * 2 },
      })
    ).toEqual([
      {
        fieldIdentifier: "numField",
        value: ROWS * 2,
        conflictRowId: null,
      },
    ]);
    expect(
      await api.checkUniqueFields(table.id, {
        rowId: check.id,
        uniqueFieldsData: { textField: "unique" },
      })
    ).toEqual([
      {
        fieldIdentifier: "textField",
        value: "unique",
        conflictRowId: null,
      },
    ]);
    expect(
      await testCheckAndPublish(check.id, {
        numField: ROWS * 2,
        textField: "unique",
      })
    ).toEqual([
      {
        fieldIdentifier: "numField",
        value: ROWS * 2,
        conflictRowId: null,
      },
      {
        fieldIdentifier: "textField",
        value: "unique",
        conflictRowId: null,
      },
    ]);
  });

  it("allows multiple null values", async () => {
    expect(
      await testCheckAndPublish(check.id, {
        numField: null,
        textField: "unique1",
      })
    ).toEqual([
      {
        fieldIdentifier: "numField",
        value: null,
        conflictRowId: null,
      },
      {
        fieldIdentifier: "textField",
        value: "unique1",
        conflictRowId: null,
      },
    ]);
    expect(
      await testCheckAndPublish(draft.id, {
        numField: null,
        textField: "unique2",
      })
    ).toEqual([
      {
        fieldIdentifier: "numField",
        value: null,
        conflictRowId: null,
      },
      {
        fieldIdentifier: "textField",
        value: "unique2",
        conflictRowId: null,
      },
    ]);
  });

  it("only allows conflicts with draft data", async () => {
    const result = await testCheckAndPublish(check.id, {
      numField: 1,
      textField: "draft",
    });
    expect(result).toEqual([
      {
        fieldIdentifier: "numField",
        value: 1,
        conflictRowId: published[1].id,
      },
      {
        fieldIdentifier: "textField",
        value: "draft",
        conflictRowId: null,
      },
    ]);
  });

  it("only allows conflicts with same row id", async () => {
    const result = await testCheckAndPublish(published[1].id, {
      numField: 1,
      textField: "2",
    });
    expect(result).toEqual([
      { fieldIdentifier: "numField", value: 1, conflictRowId: null },
      {
        fieldIdentifier: "textField",
        value: "2",
        conflictRowId: published[2].id,
      },
    ]);
  });

  it("rejects and returns one conflicting row, even if there are multiple", async () => {
    const result = await api.checkUniqueFields(table.id, {
      rowId: check.id,
      uniqueFieldsData: { numField: 0 },
    });
    expect(result).toEqual([
      {
        fieldIdentifier: "numField",
        value: 0,
        conflictRowId: expect.toBeOneOf([
          published[0].id,
          published0Duplicate.id,
        ]),
      },
    ]);
  });

  it("works for all ROWS", async () => {
    const start = Date.now();
    let requestCount = 0;
    for (let i = 0; i <= ROWS; i++) {
      const numResult = await api.checkUniqueFields(table.id, {
        rowId: check.id,
        uniqueFieldsData: { numField: i },
      });
      ++requestCount;
      expect(numResult).toEqual([
        {
          fieldIdentifier: "numField",
          value: i,
          conflictRowId: i === ROWS ? null : published[i].id,
        },
      ]);

      const textResult = await api.checkUniqueFields(table.id, {
        rowId: check.id,
        uniqueFieldsData: { textField: `${i}` },
      });
      ++requestCount;
      expect(textResult).toEqual([
        {
          fieldIdentifier: "textField",
          value: `${i}`,
          conflictRowId: i === ROWS ? null : published[i].id,
        },
      ]);
    }
    const end = Date.now();
    console.log(
      `Average response time with ${ROWS} rows: ${
        (end - start) / requestCount
      }ms`
    );
  });
});
