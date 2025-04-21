/** @jest-environment node */
import { ensureDbConnection } from "@/wab/server/db/DbCon";
import { seedTestUserAndProjects } from "@/wab/server/db/DbInit";
import { DbMgr, normalActor } from "@/wab/server/db/DbMgr";
import { CmsTable, User } from "@/wab/server/entities/Entities";
import { ApiTester } from "@/wab/server/test/api-tester";
import { createBackend, createDatabase } from "@/wab/server/test/backend-util";
import { APIRequestContext, request } from "playwright";

import { CmsRow } from "@/wab/server/entities/Entities";
import { isUniqueViolationError } from "@/wab/shared/ApiErrors/cms-errors";
import { CmsMetaType, CmsText, UniqueFieldCheck } from "@/wab/shared/ApiSchema";

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

describe("unique violation check", () => {
  let apiRequestContext: APIRequestContext;
  let api: ApiTester;
  let baseURL: string;
  let cleanup: () => Promise<void>;

  let userToken: string;
  let user: User;
  let table: CmsTable;
  let published: CmsRow[];
  let notPublished: CmsRow[];
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
      published = await db.createCmsRows(table.id, [
        { data: { "": { field1: 0, field2: 10 } } },
        { data: { "": { field1: 1, field2: 11 } } },
        { data: { "": { field1: 2, field2: 12 } } },
        { data: { "": { field1: 2, field2: 12 } } },
      ]);
      notPublished = await db.createCmsRows(table.id, [
        { draftData: { "": { field1: 0, field2: 10 } } },
      ]);
      checkingRow = await db.createCmsRow(table.id, {});
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

  describe("unique-check Api", () => {
    it("should return the right type", async () => {
      const result = await api.checkUniqueFields(table.id, {
        rowId: checkingRow.id,
        uniqueFieldsData: { field1: 0 },
      });
      result.forEach((fieldCheck: UniqueFieldCheck) => {
        expect(fieldCheck.fieldIdentifier).toBeDefined();
        expect(fieldCheck.value).toBeDefined();
        expect(fieldCheck.ok).toBeDefined();
        expect(fieldCheck.conflictRowIds).toBeDefined();
      });
    });

    it("should only compare with the values from the published rows", async () => {
      const result = await api.checkUniqueFields(table.id, {
        rowId: checkingRow.id,
        uniqueFieldsData: { field1: 3 },
      });
      expect(result).toEqual([
        { fieldIdentifier: "field1", value: 3, ok: true, conflictRowIds: [] },
      ]);
    });

    it("should check all the fields requested", async () => {
      const result = await api.checkUniqueFields(table.id, {
        rowId: checkingRow.id,
        uniqueFieldsData: { field1: 0, field2: 0 },
      });
      expect(result).toEqual([
        {
          fieldIdentifier: "field1",
          value: 0,
          ok: false,
          conflictRowIds: [published[0].id],
        },
        {
          fieldIdentifier: "field2",
          value: 0,
          ok: true,
          conflictRowIds: [],
        },
      ]);
    });

    it("should return all conflicting rows", async () => {
      const result = await api.checkUniqueFields(table.id, {
        rowId: checkingRow.id,
        uniqueFieldsData: { field1: 2 },
      });
      expect(result).toEqual([
        {
          fieldIdentifier: "field1",
          value: 2,
          ok: false,
          conflictRowIds: [published[2].id, published[3].id],
        },
      ]);
    });
  });

  describe("publish Api", () => {
    it("should throw a UniqueViolationError when there is a conflict.", async () => {
      const response = (await api.updateCmsRow(checkingRow.id, {
        data: { "": { field1: 0, field2: 0 } },
      })) as { error? };
      expect("error" in response && isUniqueViolationError(response.error))
        .toBeTrue;
      expect(response.error.violations).toEqual([
        {
          fieldIdentifier: "field1",
          value: 0,
          ok: false,
          conflictRowIds: [published[0].id],
        },
        {
          fieldIdentifier: "field2",
          value: 0,
          ok: true,
          conflictRowIds: [],
        },
      ]);
    });
  });
});
