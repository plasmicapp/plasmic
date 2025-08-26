/** @jest-environment node */
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import {
  CmsDatabase,
  CmsRow,
  CmsTable,
  User,
} from "@/wab/server/entities/Entities";
import {
  PublicApiTester,
  SharedApiTester,
  expectStatus,
} from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { CmsMetaType } from "@/wab/shared/ApiSchema";

describe("CMS public routes", () => {
  let api: SharedApiTester;
  let publicApi: PublicApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let user: User;
  let database: CmsDatabase;
  let table: CmsTable;
  let dbRows: CmsRow[];

  beforeAll(async () => {
    const {
      dburi,
      con,
      cleanup: cleanupDatabase,
    } = await createDatabase("unique_test");
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

      const team = await db.createTeam("team");
      const workspace = await db.createWorkspace({
        name: "workspace",
        description: "description",
        teamId: team.id,
      });
      database = await db.createCmsDatabase({
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
              identifier: "num",
              name: "",
              helperText: "",
              required: true,
              hidden: false,
              localized: false,
              unique: false,
              type: CmsMetaType.NUMBER,
              defaultValueByLocale: {},
            },
            {
              identifier: "draft",
              name: "",
              helperText: "",
              required: true,
              hidden: false,
              localized: false,
              unique: false,
              type: CmsMetaType.BOOLEAN,
              defaultValueByLocale: {},
            },
            {
              identifier: "fizzbuzz",
              name: "",
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              unique: false,
              type: CmsMetaType.TEXT,
              defaultValueByLocale: {},
            },
            {
              identifier: "secretNum",
              name: "",
              helperText: "",
              required: false,
              hidden: true,
              localized: false,
              unique: false,
              type: CmsMetaType.NUMBER,
              defaultValueByLocale: {},
            },
          ],
        },
      });
      dbRows = await db.createCmsRows(
        table.id,
        new Array(150).fill(0).map((_, num) => {
          // 0-120 have published data and draft data
          // 121-150 have draft data only
          return {
            data:
              num < 120
                ? {
                    "": {
                      num: num,
                      fizzbuzz:
                        num % 15 === 0
                          ? "fizzbuzz"
                          : num % 3 === 0
                          ? "fizz"
                          : num % 5 === 0
                          ? "buzz"
                          : null,
                      draft: false,
                      secretNum: 120 - num,
                    },
                    caps: {
                      fizzbuzz:
                        num % 15 === 0
                          ? "FIZZBUZZ"
                          : num % 3 === 0
                          ? "FIZZ"
                          : num % 5 === 0
                          ? "BUZZ"
                          : null,
                    },
                  }
                : undefined,
            draftData: {
              "": {
                num: num,
                fizzbuzz:
                  num % 15 === 0
                    ? "fizzbuzz"
                    : num % 3 === 0
                    ? "fizz"
                    : num % 5 === 0
                    ? "buzz"
                    : null,
                draft: true,
              },
            },
          };
        })
      );
    });

    const { host, cleanup: cleanupBackend } = await createBackend(dburi);
    baseURL = host;
    cleanup = async () => {
      await cleanupBackend();
      await cleanupDatabase();
    };
  });

  beforeEach(async () => {
    api = new SharedApiTester(`${baseURL}/api/v1`);
    await api.refreshCsrfToken();
    await api.login({
      email: "user@example.com",
      password: "!53kr3tz!",
    });

    publicApi = new PublicApiTester(baseURL, {
      "x-plasmic-api-cms-tokens": `${database.id}:${database.publicToken}`,
    });
  });

  afterEach(async () => {
    await api.dispose();
    await publicApi.dispose();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe("queryTable", () => {
    it("responds 401 if x-plasmic-api-cms-tokens is missing", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          extraHeaders: {
            "x-plasmic-api-cms-tokens": undefined, // delete header
          },
        });
      const {
        body: { error },
      } = expectStatus(res, 401);
      expect(error).toMatchObject({
        statusCode: 401,
      });
    });

    it("responds 403 if x-plasmic-api-cms-tokens is invalid", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          extraHeaders: {
            "x-plasmic-api-cms-tokens": "bad:token",
          },
        });
      const {
        body: { error },
      } = expectStatus(res, 403);
      expect(error).toMatchObject({
        statusCode: 403,
      });
    });

    it("responds 400 if limit is negative", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({ limit: -10 }),
          },
        });
      const {
        body: { error },
      } = expectStatus(res, 400);
      expect(error).toMatchObject({
        statusCode: 400,
        issues: {
          query: [expect.stringContaining("q.limit:")],
        },
      });
    });

    it("responds 400 if offset is negative", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({ offset: -1 }),
          },
        });
      const {
        body: { error },
      } = expectStatus(res, 400);
      expect(error).toMatchObject({
        statusCode: 400,
        issues: {
          query: [expect.stringContaining("q.offset:")],
        },
      });
    });

    it("defaults to return 100 rows, published data, non-hidden fields", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows).toHaveLength(100); // check 100 rows
      for (const row of rows) {
        // check fields:
        // - secretNum not returned because it's hidden
        // - fizzbuzz not returned if null
        expect(Object.keys(row.data)).toIncludeAllMembers(["num", "draft"]);

        expect(row.data.draft).toBeFalse(); // check published data only
      }
    });

    it("defaults to return rows ordered by createdAt desc", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              where: {
                num: { $in: [0, 105] }, // separation to ensure createdAt is different
                fizzbuzz: "fizzbuzz",
              },
            }),
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows.map((r) => r.data.num)).toEqual([105, 0]);
    });

    it("can return draft data only if using secret token", async () => {
      const draftRequest = {
        params: {
          dbId: database.id,
          tableIdentifier: table.identifier,
        },
        query: {
          q: JSON.stringify({
            where: {
              num: { $ge: 100 },
            },
            order: ["num"],
          }),
          draft: "1",
        },
      } as const;

      const publicTokenRes =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable(
          draftRequest
        );
      const {
        body: { error },
      } = expectStatus(publicTokenRes, 403);
      expect(error).toMatchObject({
        statusCode: 403,
        message: "Cannot access database as a content creator",
      });

      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          ...draftRequest,
          extraHeaders: {
            "x-plasmic-api-cms-tokens": `${database.id}:${database.secretToken}`,
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows).toHaveLength(50);
      for (const row of rows) {
        expect(row.data.draft).toBeTrue();
      }
    });

    it("can return different locale", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            locale: "caps",
            q: JSON.stringify({
              where: {
                num: { $lt: 4 },
              },
              order: ["num"],
            }),
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows.map((r) => r.data)).toEqual([
        { num: 0, draft: false, fizzbuzz: "FIZZBUZZ" },
        { num: 1, draft: false },
        { num: 2, draft: false },
        { num: 3, draft: false, fizzbuzz: "FIZZ" },
      ]);
    });

    it("can return hidden fields", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              fields: ["num", "secretNum"],
              where: {
                num: { $lt: 4 },
              },
              order: ["num"],
            }),
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows.map((r) => r.data)).toEqual([
        { num: 0, secretNum: 120 },
        { num: 1, secretNum: 119 },
        { num: 2, secretNum: 118 },
        { num: 3, secretNum: 117 },
      ]);
    });

    it("sorts ascending (with shorthand)", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              order: ["num"],
              limit: 3,
            }),
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows.map((r) => r.data.num)).toEqual([0, 1, 2]);
    });

    it("can sort descending", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              order: [{ field: "num", dir: "desc" }],
              limit: 3,
            }),
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows.map((r) => r.data.num)).toEqual([119, 118, 117]);
    });

    it("can sort multiple fields (nulls are considered greatest value)", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              where: {
                num: { $lt: 20 },
              },
              order: [
                { field: "fizzbuzz", dir: "desc" },
                { field: "num", dir: "asc" },
              ],
            }),
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows.map((r) => r.data.num)).toEqual([
        // fizzbuzz: null
        1, 2, 4, 7, 8, 11, 13, 14, 16, 17, 19,
        // fizzbuzz: "fizzbuzz"
        0, 15,
        // fizzbuzz: "fizz"
        3, 6, 9, 12, 18,
        // fizzbuzz: "buzz"
        5, 10,
      ]);
    });

    it("queries with complex where clause", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              where: {
                fizzbuzz: "fizzbuzz",
                $not: {
                  _id: dbRows[0].id, // not 0
                },
                $or: [
                  {
                    num: 15, // 15
                  },
                  {
                    $and: [
                      { num: { $ge: 30 } }, // 30,
                      { num: { $lt: 46 } }, // 45
                    ],
                  },
                  {
                    num: { $in: [45, 50, 55, 60] }, // 45, 60
                  },
                  {
                    num: { $gt: 90 }, // 105, not 90
                  },
                ],
              },
              order: ["num"],
            }),
          },
        });
      const {
        body: { rows },
      } = expectStatus(res, 200);
      expect(rows.map((r) => r.data.num)).toEqual([15, 30, 45, 60, 105]);
    });
    it("responds with 400 for invalid arguments", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              where: {
                num: { $unknown: "invalid operator" },
                textField: { $in: "value" },
                $and: "should be FilterClause array",
                $or: "should be FilterClause array",
                $not: "should be FilterCond object",
              },
            }),
          },
        });
      const {
        body: { error },
      } = expectStatus(res, 400);
      expect(error).toMatchObject({
        statusCode: 400,
        message: "Request validation failed. See issues.",
        issues: {
          query: [
            expect.stringContaining("q.where.$and:"),
            expect.stringContaining("q.where.$or:"),
            expect.stringContaining("q.where.$not:"),
            expect.stringContaining("q.where.num:"),
            expect.stringContaining("q.where.textField:"),
          ],
        },
      });
    });
    it("responds with 400 for non-existent field", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.queryTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              where: {
                unknownField: "non-existent",
              },
            }),
          },
        });
      const {
        body: { error },
      } = expectStatus(res, 400);
      expect(error).toMatchObject({
        statusCode: 400,
        message: 'Unknown field or logical operator "unknownField"',
      });
    });
  });

  describe("countTable", () => {
    it("counts rows", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.countTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              limit: 1, // ignored
            }),
          },
        });
      const {
        body: { count },
      } = expectStatus(res, 200);
      expect(count).toEqual(120);
    });
    it("counts with where clause", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.countTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              where: {
                $and: [
                  {
                    num: { $ge: 1 },
                  },
                  {
                    num: { $le: 50 },
                  },
                ],
              },
              limit: 20, // ignored
            }),
          },
        });
      const {
        body: { count },
      } = expectStatus(res, 200);
      expect(count).toEqual(50);
    });
    it("can return count drafts only if using secret token", async () => {
      const draftRequest = {
        params: {
          dbId: database.id,
          tableIdentifier: table.identifier,
        },
        query: {
          draft: "1",
        },
      } as const;

      const publicTokenRes =
        await publicApi.tsRestClient.publicCmsReadsContract.countTable(
          draftRequest
        );
      const {
        body: { error },
      } = expectStatus(publicTokenRes, 403);
      expect(error).toMatchObject({
        statusCode: 403,
        message: "Cannot access database as a content creator",
      });

      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.countTable({
          ...draftRequest,
          extraHeaders: {
            "x-plasmic-api-cms-tokens": `${database.id}:${database.secretToken}`,
          },
        });
      const {
        body: { count },
      } = expectStatus(res, 200);
      expect(count).toEqual(150);
    });
    it("responds with 400 for invalid arguments", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.countTable({
          params: {
            dbId: database.id,
            tableIdentifier: table.identifier,
          },
          query: {
            q: JSON.stringify({
              where: {
                num: { $unknown: "invalid operator" },
                textField: { $in: "value" },
                $and: "should be FilterClause array",
                $or: "should be FilterClause array",
                $not: "should be FilterCond object",
              },
            }),
          },
        });
      const {
        body: { error },
      } = expectStatus(res, 400);
      expect(error).toMatchObject({
        statusCode: 400,
        message: "Request validation failed. See issues.",
        issues: {
          query: [
            expect.stringContaining("q.where.$and:"),
            expect.stringContaining("q.where.$or:"),
            expect.stringContaining("q.where.$not:"),
            expect.stringContaining("q.where.num:"),
            expect.stringContaining("q.where.textField:"),
          ],
        },
      });
    });
  });

  describe("getDatabase", () => {
    it("returns public database info", async () => {
      const res =
        await publicApi.tsRestClient.publicCmsReadsContract.getDatabase({
          params: {
            dbId: database.id,
          },
        });
      const { body } = expectStatus(res, 200);
      expect(body).toMatchObject({
        name: "database",
        tables: [
          expect.objectContaining({
            name: "tableName",
            identifier: "tableIdentifier",
            schema: {
              fields: expect.toBeArrayOfSize(4),
            },
          }),
        ],
      });
      expect(body).toHaveProperty("publicToken");
      expect(body).not.toHaveProperty("secretToken");
    });
  });
});
