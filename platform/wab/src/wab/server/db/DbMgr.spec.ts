import { seedTestDb } from "@/wab/server/db/DbInit";
import {
  ANON_USER,
  DbMgr,
  normalActor,
  SkipSafeDelete,
} from "@/wab/server/db/DbMgr";
import {
  CmsRow,
  FeatureTier,
  Team,
  User,
} from "@/wab/server/entities/Entities";
import { getTeamAndWorkspace, withDb } from "@/wab/server/test/backend-util";
import { ApiCmsQuery, CmsMetaType, CmsTableId } from "@/wab/shared/ApiSchema";
import { ensure, filterMapTruthy } from "@/wab/shared/common";
import { AccessLevel } from "@/wab/shared/EntUtil";
import L from "lodash";

describe("DbMgr.CMS", () => {
  it("can duplicate the database", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const database1 = await db1().createCmsDatabase({
        name: "database1",
        workspaceId: workspace.id,
      });

      const postsTable = await db1().createCmsTable({
        databaseId: database1.id,
        identifier: "posts",
        name: "Posts",
        schema: {
          fields: [
            {
              name: "",
              type: CmsMetaType.TEXT,
              label: "Post title",
              hidden: false,
              required: true,
              localized: false,
              helperText: "",
              identifier: "title",
              defaultValueByLocale: {},
            },
            {
              name: "",
              type: CmsMetaType.TEXT,
              hidden: false,
              required: false,
              localized: false,
              helperText: "",
              identifier: "description",
              defaultValueByLocale: {},
            },
          ],
        },
      });
      const usersTable = await db1().createCmsTable({
        databaseId: database1.id,
        identifier: "users",
        name: "Users",
        schema: {
          fields: [
            {
              name: "",
              type: CmsMetaType.TEXT,
              hidden: false,
              required: false,
              localized: false,
              helperText: "",
              identifier: "username",
              defaultValueByLocale: {},
            },
          ],
        },
      });
      const commentsTable = await db1().createCmsTable({
        databaseId: database1.id,
        identifier: "comments",
        name: "Comments",
        schema: {
          fields: [
            {
              name: "",
              type: CmsMetaType.LONG_TEXT,
              hidden: false,
              required: true,
              localized: false,
              helperText: "",
              identifier: "comment",
              defaultValueByLocale: {},
            },
            {
              name: "",
              type: CmsMetaType.REF,
              hidden: false,
              tableId: postsTable.id,
              required: true,
              localized: false,
              helperText: "",
              identifier: "postId",
              defaultValueByLocale: {},
            },
            {
              name: "",
              type: CmsMetaType.LIST,
              fields: [
                {
                  name: "",
                  type: CmsMetaType.REF,
                  hidden: false,
                  tableId: usersTable.id,
                  required: false,
                  localized: false,
                  helperText: "",
                  identifier: "username",
                  defaultValueByLocale: {},
                },
                {
                  name: "",
                  type: CmsMetaType.OBJECT,
                  fields: [
                    {
                      name: "",
                      type: CmsMetaType.REF,
                      hidden: false,
                      tableId: postsTable.id,
                      required: false,
                      localized: false,
                      helperText: "",
                      identifier: "postId",
                      defaultValueByLocale: {},
                    },
                    {
                      name: "",
                      type: CmsMetaType.DATE_TIME,
                      hidden: false,
                      required: false,
                      localized: false,
                      helperText: "",
                      identifier: "likedAt",
                      defaultValueByLocale: {},
                    },
                  ],
                  hidden: false,
                  required: false,
                  localized: false,
                  helperText: "",
                  identifier: "metadata",
                  defaultValueByLocale: {},
                },
              ],
              hidden: false,
              required: false,
              localized: false,
              helperText: "",
              identifier: "likes",
              defaultValueByLocale: {},
            },
          ],
        },
      });

      const duplicatedDb = await db1().cloneCmsDatabase(
        database1.id,
        "database2"
      );
      const duplicatedPostsTable = await db1().getCmsTableByIdentifier(
        duplicatedDb.id,
        postsTable.identifier
      );
      const duplicatedUsersTable = await db1().getCmsTableByIdentifier(
        duplicatedDb.id,
        usersTable.identifier
      );
      const duplicatedCommentsTable = await db1().getCmsTableByIdentifier(
        duplicatedDb.id,
        commentsTable.identifier
      );

      expect(duplicatedDb.name).toEqual("database2");
      expect(duplicatedDb.workspaceId).toEqual(database1.workspaceId);

      expect(duplicatedPostsTable.identifier).toEqual(postsTable.identifier);
      expect(duplicatedPostsTable.name).toEqual(postsTable.name);
      expect(duplicatedPostsTable.description).toEqual(postsTable.description);

      expect(duplicatedUsersTable.identifier).toEqual(usersTable.identifier);
      expect(duplicatedUsersTable.name).toEqual(usersTable.name);
      expect(duplicatedUsersTable.description).toEqual(usersTable.description);

      expect(duplicatedCommentsTable.identifier).toEqual(
        commentsTable.identifier
      );
      expect(duplicatedCommentsTable.name).toEqual(commentsTable.name);
      expect(duplicatedCommentsTable.description).toEqual(
        commentsTable.description
      );

      // Check that the schema is the same. No refs used in the Posts and Users tables
      expect(duplicatedPostsTable.schema).toEqual(postsTable.schema);
      expect(duplicatedUsersTable.schema).toEqual(usersTable.schema);

      // Check that the ref fields are updated in Comments table to point to the new tables
      expect(duplicatedCommentsTable.schema.fields).toEqual([
        expect.objectContaining({
          name: "",
          type: "long-text",
          hidden: false,
          required: true,
          localized: false,
          helperText: "",
          identifier: "comment",
          defaultValueByLocale: {},
        }),
        expect.objectContaining({
          name: "",
          type: "ref",
          hidden: false,
          tableId: duplicatedPostsTable.id,
          required: true,
          localized: false,
          helperText: "",
          identifier: "postId",
          defaultValueByLocale: {},
        }),
        expect.objectContaining({
          name: "",
          type: "list",
          fields: [
            expect.objectContaining({
              name: "",
              type: "ref",
              hidden: false,
              tableId: duplicatedUsersTable.id,
              required: false,
              localized: false,
              helperText: "",
              identifier: "username",
              defaultValueByLocale: {},
            }),
            expect.objectContaining({
              name: "",
              type: "object",
              fields: [
                expect.objectContaining({
                  name: "",
                  type: "ref",
                  hidden: false,
                  tableId: duplicatedPostsTable.id,
                  required: false,
                  localized: false,
                  helperText: "",
                  identifier: "postId",
                  defaultValueByLocale: {},
                }),
                expect.objectContaining({
                  name: "",
                  type: "date-time",
                  hidden: false,
                  required: false,
                  localized: false,
                  helperText: "",
                  identifier: "likedAt",
                  defaultValueByLocale: {},
                }),
              ],
              hidden: false,
              required: false,
              localized: false,
              helperText: "",
              identifier: "metadata",
              defaultValueByLocale: {},
            }),
          ],
          hidden: false,
          required: false,
          localized: false,
          helperText: "",
          identifier: "likes",
          defaultValueByLocale: {},
        }),
      ]);
    }));

  it("allows crud on database", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const database = await db1().createCmsDatabase({
        name: "my db",
        workspaceId: workspace.id,
      });
      expect(database.name).toEqual("my db");

      const database2 = await db1().createCmsDatabase({
        name: "my db 2",
        workspaceId: workspace.id,
      });
      expect(database2.name).toEqual("my db 2");

      const databases = await db1().listCmsDatabases(workspace.id);
      expect(databases.length).toEqual(2);
      expect(new Set(databases.map((d) => d.id))).toEqual(
        new Set([database.id, database2.id])
      );

      const database3 = await db1().getCmsDatabaseById(database2.id);
      expect(database3.id).toEqual(database2.id);
    }));

  it("allows crud on tables", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const database = await db1().createCmsDatabase({
        name: "my db",
        workspaceId: workspace.id,
      });
      const database2 = await db1().createCmsDatabase({
        name: "my db 2",
        workspaceId: workspace.id,
      });

      const table = await db1().createCmsTable({
        databaseId: database.id,
        identifier: "quotes",
        name: "Quotes",
        schema: {
          fields: [
            {
              identifier: "quote",
              name: "Quote",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
          ],
        },
      });

      expect(table.name).toEqual("Quotes");

      const table1__2 = await db1().getCmsTableById(table.id);
      expect(table1__2.id).toEqual(table.id);

      const table1__3 = await db1().getCmsTableByIdentifier(
        database.id,
        "quotes"
      );
      expect(table1__3.id).toEqual(table.id);

      await expect(
        db1().getCmsTableByIdentifier(database2.id, "quotes")
      ).rejects.toThrow();

      const table2 = await db1().createCmsTable({
        databaseId: database.id,
        identifier: "my users",
        name: "Users",
      });
      expect(table2.identifier).toEqual("myUsers");
      const table3 = await db1().createCmsTable({
        databaseId: database2.id,
        identifier: "users",
        name: "Users",
      });
      const tables = await db1().listCmsTables(database.id);
      expect(new Set(tables.map((t) => t.id))).toEqual(
        new Set([table.id, table2.id])
      );

      const table2__2 = await db1().updateCmsTable(table2.id, {
        name: "My Users",
        description: "Howdy",
        schema: {
          fields: [
            {
              identifier: "firstName",
              name: "First Name",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
          ],
        },
      });

      expect(table2__2.id).toEqual(table2.id);
      expect(table2__2.description).toEqual("Howdy");
      expect(table2__2.schema.fields[0].identifier).toEqual("firstName");
    }));

  it("allows crud on rows", () =>
    withDb(async (sudo, [_], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const database = await db1().createCmsDatabase({
        name: "my db",
        workspaceId: workspace.id,
      });
      const quotes = await db1().createCmsTable({
        databaseId: database.id,
        identifier: "quotes",
        name: "Quotes",
        schema: {
          fields: [
            {
              identifier: "quote",
              name: "Quote",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
          ],
        },
      });
      const users = await db1().createCmsTable({
        databaseId: database.id,
        identifier: "users",
        name: "Users",
        schema: {
          fields: [
            {
              identifier: "firstName",
              name: "First Name",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
            {
              identifier: "lastName",
              name: "Last Name",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
          ],
        },
      });

      const quote1 = await db1().createCmsRow(quotes.id, {
        identifier: "quote1",
        data: {
          "": {
            quote: "OHHAI",
          },
        },
      });
      expect(quote1.data).toEqual({ "": { quote: "OHHAI" } });
      const quote1__2 = await db1().getCmsRowById(quote1.id);
      expect(quote1__2.data).toEqual({ "": { quote: "OHHAI" } });

      const usr1 = await db1().createCmsRow(users.id, {
        identifier: "user1",
        data: {
          "": {
            firstName: "Thom",
            lastName: "Yorke",
            rando: "What",
          },
        },
      });

      const usr1__2 = await db1().getCmsRowById(usr1.id);
      expect(usr1__2.id).toEqual(usr1.id);
      expect(usr1__2.data).toEqual({
        "": { firstName: "Thom", lastName: "Yorke" },
      });

      const usr1__4 = await db1().updateCmsRow(usr1.id, {
        data: {
          "": {
            firstName: "Jonny",
          },
        },
      });
      // We merge with existing data (lastName)
      expect(usr1__4.data).toEqual({
        "": { firstName: "Jonny", lastName: "Yorke" },
      });
      const usr1__5 = await db1().getCmsRowById(usr1.id);
      expect(usr1__5.data).toEqual({
        "": { firstName: "Jonny", lastName: "Yorke" },
      });
    }));

  const expectCmsRows = async (
    db: DbMgr,
    tableId: CmsTableId,
    query: ApiCmsQuery,
    expected: CmsRow[],
    ordered: boolean,
    opts?: { useDraft?: boolean }
  ) => {
    const results = await db.queryCmsRows(tableId, query, opts);
    if (ordered) {
      expect(results.map((p) => p.identifier)).toEqual(
        expected.map((p) => p.identifier)
      );
    } else {
      expect(new Set(results.map((p) => p.identifier))).toEqual(
        new Set(expected.map((p) => p.identifier))
      );
    }

    const count = await db.countCmsRows(tableId, query, opts);
    expect(count).toEqual(expected.length);
  };

  it("can query for rows", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const database = await db1().createCmsDatabase({
        name: "my db",
        workspaceId: workspace.id,
      });

      const people = await db1().createCmsTable({
        databaseId: database.id,
        identifier: "people",
        name: "People",
        schema: {
          fields: [
            {
              identifier: "name",
              name: "Name",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
            {
              identifier: "age",
              name: "Age",
              type: CmsMetaType.NUMBER,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
            {
              identifier: "gender",
              name: "Gender",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
            {
              identifier: "title",
              name: "Job Title",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
            {
              identifier: "color",
              name: "Favorite Color",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
          ],
        },
      });

      const p1 = await db1().createCmsRow(people.id, {
        identifier: "p1",
        data: {
          "": {
            name: "Thom Yorke",
            age: 28,
            gender: "M",
            title: "Singer",
            color: "Blue",
          },
        },
      });

      const p2 = await db1().createCmsRow(people.id, {
        identifier: "p2",
        data: {
          "": {
            name: "Jonny Greenwood",
            age: 32,
            gender: "M",
            title: "Guitarist",
            color: "Blue",
          },
        },
      });

      const p3 = await db1().createCmsRow(people.id, {
        identifier: "p3",
        data: {
          "": {
            name: "Taylor Swift",
            age: 18,
            gender: "F",
            title: "Singer",
            color: "Yellow",
          },
        },
      });

      const p4 = await db1().createCmsRow(people.id, {
        identifier: "p4",
        data: {
          "": {
            name: "Bob Dylan",
            age: 67,
            gender: "M",
            title: "Singer",
            color: "Orange",
          },
        },
      });

      const p5 = await db1().createCmsRow(people.id, {
        identifier: "p5",
        data: {
          "": {
            name: "Aretha Franklin",
            age: 87,
            gender: "F",
            title: "Singer",
            color: "Green",
          },
        },
      });

      await expectCmsRows(
        db1(),
        people.id,
        {
          where: {
            title: "Singer",
          },
        },
        [p1, p3, p4, p5],
        false
      );

      await expectCmsRows(
        db1(),
        people.id,
        {
          where: {
            _id: p5.id,
          },
        },
        [p5],
        false
      );

      await expectCmsRows(
        db1(),
        people.id,
        {
          where: {
            title: "Singer",
            age: {
              $gt: 20,
            },
          },
        },
        [p1, p4, p5],
        false
      );

      await expectCmsRows(
        db1(),
        people.id,
        {
          where: {
            title: "Singer",
            age: {
              $gt: 20,
            },
            color: {
              $in: ["Blue", "Orange"],
            },
          },
        },
        [p1, p4],
        false
      );

      await expectCmsRows(
        db1(),
        people.id,
        {
          where: {
            $or: [
              {
                $and: [
                  {
                    age: {
                      $gt: 30,
                    },
                  },
                  {
                    age: {
                      $lt: 70,
                    },
                  },
                ],
              },
              {
                color: {
                  $in: ["Blue"],
                },
              },
            ],
          },
        },
        [p1, p2, p4],
        false
      );

      await expectCmsRows(
        db1(),
        people.id,
        {
          where: {
            $or: [
              {
                $and: [
                  {
                    age: {
                      $gt: 30,
                    },
                  },
                  {
                    age: {
                      $lt: 70,
                    },
                  },
                ],
              },
              {
                color: {
                  $in: ["Blue"],
                },
              },
            ],
          },
          order: [{ field: "age", dir: "desc" }],
        },
        [p4, p2, p1],
        true
      );
    }));

  it("can publish rows", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const database = await db1().createCmsDatabase({
        name: "my db",
        workspaceId: workspace.id,
      });

      const people = await db1().createCmsTable({
        databaseId: database.id,
        identifier: "people",
        name: "People",
        schema: {
          fields: [
            {
              identifier: "name",
              name: "Name",
              type: CmsMetaType.TEXT,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
            {
              identifier: "age",
              name: "Age",
              type: CmsMetaType.NUMBER,
              helperText: "",
              required: false,
              hidden: false,
              localized: false,
              defaultValueByLocale: {},
            },
          ],
        },
      });

      const p1 = await db1().createCmsRow(people.id, {
        identifier: "p1",
        draftData: {
          "": {
            name: "Thom Yorke",
            age: 28,
          },
        },
      });

      const p2 = await db1().createCmsRow(people.id, {
        identifier: "p2",
        draftData: {
          "": {
            name: "Jonny Greenwood",
            age: 32,
          },
        },
      });

      // Unpublished rows don't show up
      expect(await db1().queryCmsRows(people.id, {})).toEqual([]);

      await db1().publishCmsRow(p1.id);
      await db1().publishCmsRow(p2.id);

      // Published rows show up
      await expectCmsRows(db1(), people.id, {}, [p1, p2], false);

      const queryAge30 = {
        where: {
          age: {
            $ge: 30,
          },
        },
      };

      await expectCmsRows(db1(), people.id, queryAge30, [p2], false);

      // Update p1 with age 30
      await db1().updateCmsRow(p1.id, {
        draftData: {
          "": {
            name: "Thom Yorke",
            age: 30,
          },
        },
      });

      // But draft updates don't show up
      await expectCmsRows(db1(), people.id, queryAge30, [p2], false);

      // Unless you specify the "useDraft" flag
      await expectCmsRows(db1(), people.id, queryAge30, [p1, p2], false, {
        useDraft: true,
      });

      // But once you publish, it shows up without useDraft
      await db1().publishCmsRow(p1.id);

      await expectCmsRows(db1(), people.id, queryAge30, [p1, p2], false);

      // It also shows up WITH useDraft
      await expectCmsRows(db1(), people.id, queryAge30, [p1, p2], false, {
        useDraft: true,
      });

      // Neither p1 nor p2 right now has draft data
      expect((await db1().getCmsRowById(p1.id)).draftData).toBeNull();
      expect((await db1().getCmsRowById(p2.id)).draftData).toBeNull();
    }));
});

describe("DbMgr", () => {
  it("when creating user, should create a team and workspace", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const allTeams = await sudo.listAllTeams();
      expect(allTeams.length).toBe(6);
      const teams = (await db1().getAffiliatedTeams()).filter(
        (it) => !it.personalTeamOwnerId
      );
      expect(teams.length).toBe(1);
      const workspaces = await db1().getWorkspacesByTeams(
        teams.map((t) => t.id)
      );
      expect(workspaces.length).toBe(1);
    }));

  it("can get indirectly associated users for a team", () =>
    withDb(async (sudo, [user1, user2, user3], [db1], project) => {
      async function expectEffectiveTeam(users: User[]) {
        const effectiveUserIds = filterMapTruthy(
          await db1().getEffectiveUsersForTeam(team.id, false),
          (u) => u.userId
        );
        const effectiveUsers = await db1().getUsersById(effectiveUserIds);
        expect(L.sortBy(effectiveUsers.map((u) => u.email))).toEqual(
          L.sortBy(users.map((u) => u.email))
        );
      }

      const { team, workspace } = await getTeamAndWorkspace(db1());

      // Owners should count
      await expectEffectiveTeam([user1]);

      // Invite user2 to workspace
      await db1().grantWorkspacePermissionByEmail(
        workspace.id,
        user2.email,
        "editor"
      );
      await expectEffectiveTeam([user1, user2]);

      // Invite user3 to project
      await db1().grantProjectPermissionByEmail(
        project.id,
        user3.email,
        "editor"
      );
      await expectEffectiveTeam([user1, user2, user3]);

      // Should dedupe
      await db1().grantProjectPermissionByEmail(
        project.id,
        user2.email,
        "editor"
      );
      await expectEffectiveTeam([user1, user2, user3]);
      await db1().grantTeamPermissionByEmail(team.id, user2.email, "editor");
      await expectEffectiveTeam([user1, user2, user3]);

      // Revocations drop the count
      await db1().revokeProjectPermissionsByEmails(project.id, [
        user2.email,
        user3.email,
      ]);
      await expectEffectiveTeam([user1, user2]);

      // Direct team members should count!
      await db1().grantTeamPermissionByEmail(team.id, user3.email, "commenter");
      await expectEffectiveTeam([user1, user2, user3]);

      // Can revoke on teams and workspaces as well
      await db1().revokeTeamPermissionsByEmails(team.id, [
        user2.email,
        user3.email,
      ]);
      await db1().revokeWorkspacePermissionsByEmails(workspace.id, [
        user2.email,
      ]);
      await expectEffectiveTeam([user1]);
    }));

  it("cascades permissions from team to workspace to project", () =>
    withDb(async (sudo, [user1, user2, user3], [db1, db2], project) => {
      async function expectPerms(
        accessLevelPromise: Promise<AccessLevel>,
        expectedAccessLevel: string
      ) {
        const actualAccessLevel = await accessLevelPromise;
        expect(actualAccessLevel).toBe(expectedAccessLevel);
      }

      const { team, workspace } = await getTeamAndWorkspace(db1());

      await db1().grantProjectPermissionByEmail(
        project.id,
        user2.email,
        "commenter"
      );
      await expectPerms(
        db2().getActorAccessLevelToProject(project.id),
        "commenter"
      );

      await db1().grantWorkspacePermissionByEmail(
        workspace.id,
        user2.email,
        "editor"
      );
      await expectPerms(
        db2().getActorAccessLevelToProject(project.id),
        "editor"
      );
      await expectPerms(
        db2().getActorAccessLevelToWorkspace(workspace.id),
        "editor"
      );

      await db1().grantTeamPermissionByEmail(team.id, user2.email, "commenter");
      await expectPerms(
        db2().getActorAccessLevelToProject(project.id),
        "editor"
      );
      await expectPerms(
        db2().getActorAccessLevelToWorkspace(workspace.id),
        "editor"
      );
    }));

  it("cascades permissions from team to sub teams", () =>
    withDb(async (sudo, [user1, user2], [db1]) => {
      const teams = await db1().getAffiliatedTeams();
      const rootTeam = ensure(
        teams.find((t) => (t.id as string) !== (user1.id as string)),
        ""
      );
      const subTeam = await sudo.sudoUpdateTeam({
        id: (await db1().createTeam("Sub Team")).id,
        parentTeamId: rootTeam.id,
      });

      expect(await sudo.getTeamAccessLevelByUser(subTeam.id, user2.id)).toBe(
        "blocked"
      );
      expect(await sudo.getTeamAccessLevelByUser(rootTeam.id, user2.id)).toBe(
        "blocked"
      );

      await db1().grantTeamPermissionByEmail(
        rootTeam.id,
        user2.email,
        "editor"
      );

      expect(await sudo.getTeamAccessLevelByUser(subTeam.id, user2.id)).toBe(
        "editor"
      );
      expect(await sudo.getTeamAccessLevelByUser(rootTeam.id, user2.id)).toBe(
        "editor"
      );
    }));

  // TODO This should probably change to be based on the specific invite so as not to be tied to the email. Esp. without email verification. But this is the current behavior.
  it.skip("when creating user, should claim pending invites by email", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
    }));

  it("when deleting/restoring team or workspace, should delete/restore sub-resources", () =>
    withDb(async (sudo, [user1], [db1], project) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      // project2 is always deleted.
      const { project: project2 } = await db1().createProject({
        name: "My project 2",
        workspaceId: workspace.id,
      });
      await db1().deleteProject(project2.id, SkipSafeDelete);
      await expect(db1().getProjectById(project2.id)).toReject();

      await db1().deleteTeam(team.id);
      await expect(db1().getTeamById(team.id)).toReject();
      await expect(db1().getWorkspaceById(workspace.id)).toReject();
      await expect(db1().getProjectById(project.id)).toReject();
      expect(await db1().listProjectsForSelf()).toMatchObject([]);
      await db1().restoreTeam(team.id);
      await db1().getTeamById(team.id);
      await db1().getWorkspaceById(workspace.id);
      await db1().getProjectById(project.id);
      await expect(db1().getProjectById(project2.id)).toReject();
      expect(await db1().listProjectsForSelf()).toMatchObject([
        { id: project.id },
      ]);

      await db1().deleteWorkspace(workspace.id);
      await expect(db1().getWorkspaceById(workspace.id)).toReject();
      await expect(db1().getProjectById(project.id)).toReject();
      expect(await db1().listProjectsForSelf()).toMatchObject([]);
      await db1().restoreWorkspace(workspace.id);
      await db1().getWorkspaceById(workspace.id);
      await db1().getProjectById(project.id);
      await expect(db1().getProjectById(project2.id)).toReject();
      expect(await db1().listProjectsForSelf()).toMatchObject([
        { id: project.id },
      ]);
    }));

  it("supports deleting/restoring workspace-less projects as normal", () =>
    withDb(async (sudo, [user1], [db1], project) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      // project2 is always deleted.
      const { project: project2 } = await db1().createProject({
        name: "My project 2",
      });
      await db1().getProjectById(project2.id);
      await db1().deleteProject(project2.id, SkipSafeDelete);
      await expect(db1().getProjectById(project2.id)).toReject();
      await db1().restoreProject(project2.id);
      await db1().getProjectById(project2.id);
    }));

  it("ensures only owner can delete a team/workspace/project", () =>
    withDb(async (sudo, [user1, user2], [db1, db2], project) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      await db1().grantTeamPermissionByEmail(team.id, user2.email, "editor");
      await expect(db2().deleteProject(project.id, SkipSafeDelete)).toReject();
      await expect(db2().deleteWorkspace(workspace.id)).toReject();
      await expect(db2().deleteTeam(team.id)).toReject();
    }));

  describe("users can grant/revoke up to own access level", () => {
    it("commenters can grant only other commenters and never revoke", () =>
      withDb(async (sudo, [user1, user2, user3], [db1, db2, db3], project) => {
        const { team, workspace } = await getTeamAndWorkspace(db1());

        await db1().grantTeamPermissionByEmail(
          team.id,
          user2.email,
          "commenter"
        );

        // Cannot grant permissions higher than yourself.
        await expect(
          db2().grantProjectPermissionByEmail(project.id, user3.email, "editor")
        ).toReject();
        await expect(
          db2().grantWorkspacePermissionByEmail(
            workspace.id,
            user3.email,
            "editor"
          )
        ).toReject();
        await expect(
          db2().grantTeamPermissionByEmail(team.id, user3.email, "editor")
        ).toReject();

        // Commenters can grant other commenters.
        await db1().grantTeamPermissionByEmail(
          team.id,
          user2.email,
          "commenter"
        );
        await db2().grantProjectPermissionByEmail(
          project.id,
          user3.email,
          "commenter"
        );
        await db2().grantWorkspacePermissionByEmail(
          workspace.id,
          user3.email,
          "commenter"
        );
        await db2().grantTeamPermissionByEmail(
          team.id,
          user3.email,
          "commenter"
        );

        // Commenters cannot revoke, even other commenters XXX
        await expect(
          db2().revokeProjectPermissionsByEmails(project.id, [user3.email])
        ).toReject();
      }));

    it("editors can grant and revoke, but not on owners", () =>
      withDb(async (sudo, [user1, user2, user3], [db1, db2, db3], project) => {
        const { team, workspace } = await getTeamAndWorkspace(db1());

        await db1().updateProject({ id: project.id, inviteOnly: true });
        await db1().grantTeamPermissionByEmail(team.id, user2.email, "editor");

        // Editors can grant other editors.
        await db1().grantTeamPermissionByEmail(team.id, user2.email, "editor");
        await db2().grantProjectPermissionByEmail(
          project.id,
          user3.email,
          "editor"
        );
        await db2().grantWorkspacePermissionByEmail(
          workspace.id,
          user3.email,
          "editor"
        );
        await db2().grantTeamPermissionByEmail(team.id, user3.email, "editor");

        // Editors can promote
        await db1().grantProjectPermissionByEmail(
          project.id,
          user3.email,
          "commenter"
        );
        await db2().grantProjectPermissionByEmail(
          project.id,
          user3.email,
          "editor"
        );

        // Editors can demote
        await db2().grantProjectPermissionByEmail(
          project.id,
          user3.email,
          "commenter"
        );

        // Editors can't set permissions on owner
        await expect(
          db2().grantProjectPermissionByEmail(project.id, user1.email, "editor")
        ).toReject();

        // Editors can revoke
        await db2().revokeProjectPermissionsByEmails(project.id, [user3.email]);
        await db2().revokeWorkspacePermissionsByEmails(workspace.id, [
          user3.email,
        ]);
        await db2().revokeTeamPermissionsByEmails(team.id, [user3.email]);
        await expect(db3().getProjectById(project.id)).toReject();

        // Editors can't revoke owner
        await expect(
          db2().revokeProjectPermissionsByEmails(project.id, [user1.email])
        ).toReject();

        await expect(
          db2().revokeWorkspacePermissionsByEmails(workspace.id, [user1.email])
        ).toReject();

        await expect(
          db2().revokeTeamPermissionsByEmails(team.id, [user1.email])
        ).toReject();
      }));
  });

  it('ensures users can join "open" (link-shared) projects by themselves, but workspaces/teams are always closed', () =>
    withDb(async (sudo, [user1, user2], [db1, db2, db3], project) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());

      await expect(db2().getTeamById(team.id)).toReject();
      await expect(db2().getWorkspaceById(workspace.id)).toReject();

      await sudo.updateProject({ id: project.id, inviteOnly: false });

      await db2().getLatestProjectRev(project.id);
      const perms = await db2().getPermissionsForProject(project.id);
      expect(perms.find((perm) => perm.userId === user2.id)).toMatchObject({
        accessLevel: "commenter",
      });
    }));

  it("enforces permissions", () =>
    withDb(async (sudo, [user1, user2, user3], [db1, db2, db3], project) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const pid = project.id;

      // Close membership on the project
      await db1().updateProject({
        id: pid,
        inviteOnly: true,
      });
      await expect(db2().getProjectById(pid)).toReject();

      // Now grant some permissions
      await db1().grantProjectPermissionByEmail(pid, user2.email, "commenter");
      await db1().grantProjectPermissionByEmail(pid, user3.email, "editor");

      // Commenters can read but not write
      await db2().getProjectById(pid);
      await expect(db2().updateProject({ id: pid, name: "" })).toReject();

      // Editors can write, including changing link sharing open/closed membership
      await db3().updateProject({
        id: pid,
        name: project.name + "!",
        inviteOnly: false,
      });

      // Verify that cascading affects enforced permissions.
      await db1().grantTeamPermissionByEmail(team.id, user2.email, "editor");
      await db2().updateProject({ id: pid, name: project.name + "!!" });
    }));

  it("resources should have owner as one of the permissions", () =>
    withDb(async (sudo, [user1], [db1]) => {
      const { team, workspace } = await getTeamAndWorkspace(db1());
      const teamPerms = await db1().getPermissionsForTeams([team.id]);
      const workspacePerms = await db1().getPermissionsForWorkspaces(
        [workspace.id],
        true
      );
      const expected = [{ userId: user1.id, accessLevel: "owner" }];
      expect(teamPerms).toMatchObject(expected);
      expect(workspacePerms).toMatchObject(expected);
    }));

  it("API tokens work", () =>
    withDb(async (sudo, [user1, user2], [db1, db2, db3], project, entMgr) => {
      const dbNo0 = new DbMgr(entMgr, ANON_USER, { projectIdsAndTokens: [] });
      await expect(dbNo0.getProjectById(project.id)).toReject();
      const dbNo1 = new DbMgr(entMgr, ANON_USER, {
        projectIdsAndTokens: [
          {
            projectId: "A",
            projectApiToken: "B",
          },
        ],
      });
      await expect(dbNo1.getProjectById(project.id)).toReject();
      const dbYes = new DbMgr(entMgr, ANON_USER, {
        projectIdsAndTokens: [
          {
            projectId: project.id,
            projectApiToken: ensure(project.projectApiToken, ""),
          },
        ],
      });
      expect((await dbYes.getProjectById(project.id)).id).toBe(project.id);
    }));

  // TODO implement this (currently not the case) - important for e.g. PlasmicLoader
  it.skip("API token for just root project is sufficient to access dependencies", () =>
    withDb(async (sudo, [user1, user2], [db1, db2, db3], project, entMgr) => {
      // TODO need to be able to create a project that has dependencies
    }));

  it("Can get team associated with project", () =>
    withDb(async (sudo, [user1], [db1], project) => {
      const { team } = await getTeamAndWorkspace(db1());
      const team2 = await db1().getTeamByProjectId(project.id);
      expect(team2!.id).toEqual(team.id);
    }));

  it("can update UI config if team is on enterprise tier", () =>
    withDb(async (sudo, [user1], [db1], _project, em) => {
      await seedTestDb(em);
      const { team } = await getTeamAndWorkspace(db1());

      // cannot update UI config on free tier
      await expect(
        db1().updateTeam({
          id: team.id,
          uiConfig: {
            hideDefaultPageTemplates: true,
          },
        })
      ).toReject();

      // cannot update UI config on team/scale tier
      const teamFt = await em.getRepository(FeatureTier).findOne({
        where: {
          name: "Team",
          deletedAt: null,
        },
      });
      await em.getRepository(Team).update(team.id, {
        featureTierId: teamFt!.id,
      });
      await expect(
        db1().updateTeam({
          id: team.id,
          uiConfig: {
            hideDefaultPageTemplates: true,
          },
        })
      ).toReject();

      // can update UI config on enterprise tier
      const enterpriseFt = await em.getRepository(FeatureTier).findOne({
        where: {
          name: "Enterprise",
          deletedAt: null,
        },
      });
      await em.getRepository(Team).update(team.id, {
        featureTierId: enterpriseFt!.id,
      });
      const updatedTeam = await db1().updateTeam({
        id: team.id,
        uiConfig: {
          hideDefaultPageTemplates: true,
        },
      });
      expect(updatedTeam.uiConfig?.hideDefaultPageTemplates).toBe(true);
    }));

  it("can update UI config if parent team is on enterprise tier", () =>
    withDb(async (sudo, [user1], [db1], _project, em) => {
      await seedTestDb(em);
      const { team } = await getTeamAndWorkspace(db1());

      // cannot update UI config on free tier
      await expect(
        db1().updateTeam({
          id: team.id,
          uiConfig: {
            hideDefaultPageTemplates: true,
          },
        })
      ).toReject();

      // can update UI config if parent team is on enterprise tier
      const enterpriseTeam = await em.getRepository(Team).findOne({
        where: {
          name: "Test Enterprise Org",
        },
      });
      await em.getRepository(Team).update(team.id, {
        parentTeamId: enterpriseTeam!.id,
      });
      const updatedTeam = await db1().updateTeam({
        id: team.id,
        uiConfig: {
          hideDefaultPageTemplates: true,
        },
      });
      expect(updatedTeam.uiConfig?.hideDefaultPageTemplates).toBe(true);
    }));
});

describe("DbMgr.user", () => {
  it("creates user with 2 teams/workspaces if needsTeamCreationPrompt: false", async () => {
    await withDb(async (sudo, _users, _dbs, _project, em) => {
      const user = await sudo.createUser({
        email: "user@domain.com",
        password: "!53kr3tz!",
        firstName: "Firstname",
        lastName: "Lastname",
        needsTeamCreationPrompt: false,
      });

      // matches getUserById
      const userDbMgr = new DbMgr(em, normalActor(user.id));
      const getUser = await userDbMgr.getUserById(user.id);
      expect(getUser).toEqual(user);

      // creates 2 teams: personal team and organization
      const teams = await userDbMgr.getAffiliatedTeams();
      expect(teams).toHaveLength(2);
      const personalTeam = teams.find(
        (t) => t.personalTeamOwnerId === user.id
      )!;
      expect(personalTeam.name).toEqual("Personal team");
      const orgTeam = teams.find((t) => t.personalTeamOwnerId === null)!;
      expect(orgTeam.name).toEqual("Firstname's First Organization");

      // team permissions should match
      const teamPermissions = await userDbMgr.getAffiliatedTeamPermissions();
      expect(teamPermissions).toHaveLength(2);
      expect(teamPermissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: user.id,
            teamId: personalTeam.id,
            accessLevel: "owner",
          }),
          expect.objectContaining({
            userId: user.id,
            teamId: orgTeam.id,
            accessLevel: "owner",
          }),
        ])
      );

      // check workspaces
      const workspaces = await userDbMgr.getAffiliatedWorkspaces();
      expect(workspaces).toHaveLength(2);
      expect(workspaces).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "My playground",
            teamId: personalTeam.id,
          }),
          expect.objectContaining({
            name: "Firstname's First Workspace",
            teamId: orgTeam.id,
          }),
        ])
      );
    });
  });
});
