import { DbMgr } from "@/wab/server/db/DbMgr";
import {
  EndUser,
  EndUserDirectory,
  Project,
  Team,
  Workspace,
} from "@/wab/server/entities/Entities";
import {
  canCurrentUserExecuteOperation,
  getAppUserInfo,
  getUserRoleForApp,
  getUsersWithGroups,
} from "@/wab/server/routes/end-user";
import { withDb } from "@/wab/server/test/backend-util";
import { Connection } from "typeorm";

async function setupEndUsers(mgr: DbMgr) {
  const team = await mgr.createTeam("My team");
  const workspace = await mgr.createWorkspace({
    name: "My workspace",
    description: "My workspace",
    teamId: team.id,
  });
  const { project } = await mgr.createProject({
    name: "My Project",
    workspaceId: workspace.id,
  });

  const directory = await mgr.createEndUserDirectory(team.id, "My directory");

  const HRGroup = await mgr.createDirectoryGroup(directory.id, "HR");
  const DevGroup = await mgr.createDirectoryGroup(directory.id, "Dev");
  const OpsGroup = await mgr.createDirectoryGroup(directory.id, "Ops");
  const FunGroup = await mgr.createDirectoryGroup(directory.id, "Fun");

  const endUsersEmails = [
    "hr1@company.com",
    "hr2@company.com",
    "dev1@company.com",
    "dev2@company.com",
    "ops1@ops-company.com",
    "other@company.com",
  ];
  const endUsers = await mgr.addDirectoryEndUsers(directory.id, endUsersEmails);

  await mgr.addEndUserToGroups(directory.id, endUsers[0].id, [
    HRGroup.id,
    FunGroup.id,
  ]);
  await mgr.addEndUserToGroups(directory.id, endUsers[1].id, [HRGroup.id]);
  await mgr.addEndUserToGroups(directory.id, endUsers[2].id, [
    DevGroup.id,
    FunGroup.id,
  ]);
  await mgr.addEndUserToGroups(directory.id, endUsers[3].id, [DevGroup.id]);
  await mgr.addEndUserToGroups(directory.id, endUsers[4].id, [OpsGroup.id]);

  await mgr.upsertAppAuthConfig(project.id, {
    directoryId: directory.id,
  });

  // After creating appAuthConfig, we should have roels: Admin, Normal User
  // Edit the roles to be: Super Admin, Admin, Normal User, Viewer for the setup
  await mgr.createAppRole(project.id, "Super Admin");
  await mgr.createAppRole(project.id, "Viewer");
  const preConfigRoles = await mgr.listAppRoles(project.id);

  await mgr.changeAppRolesOrder(project.id, {
    [preConfigRoles[0].id]: 1,
    [preConfigRoles[1].id]: 4,
    [preConfigRoles[2].id]: 3,
    [preConfigRoles[3].id]: 2,
  });

  await mgr.upsertAppAuthConfig(project.id, {
    registeredRoleId: preConfigRoles[0].id,
  });

  const appRoles = await mgr.listAppRoles(project.id);

  await mgr.createAccessRules(
    project.id,
    {
      emails: [],
      directoryEndUserGroupIds: [HRGroup.id],
      domains: [],
      externalIds: [],
    },
    appRoles[0].id
  );

  await mgr.createAccessRules(
    project.id,
    {
      emails: [],
      directoryEndUserGroupIds: [DevGroup.id],
      domains: [],
      externalIds: [],
    },
    appRoles[1].id
  );

  await mgr.createAccessRules(project.id, {
    emails: ["random@co.co"],
    directoryEndUserGroupIds: [FunGroup.id],
    domains: ["@ops-company.com"],
    externalIds: [],
  });

  /**
  HR Group is Super Admin
  Dev Group is Admin
  Ops Group is not in the access rules
  Fun Group is Viewer

  @ops.company.com is Viewer

  "hr1@company.com" belongs to HR and Fun, and is a Super Admin
  "hr2@company.com" belongs to HR, and is a Super Admin
  "dev1@company.com" belongs to Dev and Fun, and is an Admin
  "dev2@company.com" belongs to Dev, and is an Admin
  "ops1@ops-company.com" belongs to Ops, and is a Viewer
  "other@company.com" is a Viewer, by the registeredRoleId of the project
   */

  return {
    team,
    workspace,
    project,
    directory,
    emails: endUsersEmails,
    endUsers,
  };
}
async function withEndUserMngSetup(
  f: (args: {
    sudo: DbMgr;
    dbCon: Connection;
    team: Team;
    workspace: Workspace;
    project: Project;
    directory: EndUserDirectory;
    emails: string[];
    endUsers: EndUser[];
    userDb: () => DbMgr;
    userDb2: () => DbMgr;
  }) => Promise<void>
) {
  await withDb(async (sudo, [user], [userDb, userDb2], _project, em) => {
    const { team, workspace, project, directory, emails, endUsers } =
      await setupEndUsers(userDb());

    await f({
      sudo,
      dbCon: em.connection,
      team,
      workspace,
      project,
      directory,
      emails,
      endUsers,
      userDb,
      userDb2,
    });
  });
}

describe("end-user", () => {
  describe("Role operations", () => {
    it("should properly manage roles", async () => {
      await withEndUserMngSetup(async ({ sudo, project }) => {
        expect(await sudo.listAppRoles(project.id)).toMatchObject([
          {
            name: "Super Admin",
            order: 4,
          },
          {
            name: "Admin",
            order: 3,
          },
          {
            name: "Normal User",
            order: 2,
          },
          {
            name: "Viewer",
            order: 1,
          },
          {
            name: "Anonymous",
            order: 0,
          },
        ]);

        await sudo.deleteAppRole((await sudo.listAppRoles(project.id))[2].id);

        expect(await sudo.listAppRoles(project.id)).toMatchObject([
          {
            name: "Super Admin",
            order: 3,
          },
          {
            name: "Admin",
            order: 2,
          },
          {
            name: "Viewer",
            order: 1,
          },
          {
            name: "Anonymous",
            order: 0,
          },
        ]);

        await sudo.createAppRole(project.id, "High Admin");

        expect(await sudo.listAppRoles(project.id)).toMatchObject([
          {
            name: "High Admin",
            order: 4,
          },
          {
            name: "Super Admin",
            order: 3,
          },
          {
            name: "Admin",
            order: 2,
          },
          {
            name: "Viewer",
            order: 1,
          },
          {
            name: "Anonymous",
            order: 0,
          },
        ]);

        await sudo.updateAppRole(
          (
            await sudo.listAppRoles(project.id)
          )[0].id,
          "Low Admin"
        );

        expect(await sudo.listAppRoles(project.id)).toMatchObject([
          {
            name: "Low Admin",
            order: 4,
          },
          {
            name: "Super Admin",
            order: 3,
          },
          {
            name: "Admin",
            order: 2,
          },
          {
            name: "Viewer",
            order: 1,
          },
          {
            name: "Anonymous",
            order: 0,
          },
        ]);

        const roles = await sudo.listAppRoles(project.id);

        await sudo.changeAppRolesOrder(project.id, {
          [roles[0].id]: 3,
          [roles[1].id]: 4,
          [roles[2].id]: 2,
        });

        expect(await sudo.listAppRoles(project.id)).toMatchObject([
          {
            name: "Super Admin",
            order: 4,
          },
          {
            name: "Low Admin",
            order: 3,
          },
          {
            name: "Admin",
            order: 2,
          },
          {
            name: "Viewer",
            order: 1,
          },
          {
            name: "Anonymous",
            order: 0,
          },
        ]);
      });
    });
  });

  describe("Access operations", () => {
    it("should properly manage access rules", async () => {
      await withEndUserMngSetup(async ({ sudo, project, directory }) => {
        const groups = await sudo.getDirectoryGroups(directory.id);
        const roles = await sudo.listAppRoles(project.id);

        const HRGroup = groups.find((g) => g.name === "HR")!;
        const DevGroup = groups.find((g) => g.name === "Dev")!;
        const OpsGroup = groups.find((g) => g.name === "Ops")!;
        const FunGroup = groups.find((g) => g.name === "Fun")!;

        const accessRules = await sudo.listAppAccessRules(project.id);

        expect(accessRules.length).toBe(5);
        expect(accessRules).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              directoryEndUserGroupId: HRGroup.id,
              roleId: roles[0].id,
            }),
            expect.objectContaining({
              directoryEndUserGroupId: DevGroup.id,
              roleId: roles[1].id,
            }),
            expect.objectContaining({
              directoryEndUserGroupId: FunGroup.id,
              roleId: roles[3].id,
            }),
            expect.objectContaining({
              domain: "@ops-company.com",
              roleId: roles[3].id,
            }),
            expect.objectContaining({
              email: "random@co.co",
              roleId: roles[3].id,
            }),
          ])
        );

        // Deletes Fun Group Access
        await sudo.deleteAccessRule(
          project.id,
          accessRules.find((r) => r.directoryEndUserGroupId === FunGroup.id)!.id
        );

        // Deletes HR Group Access
        await sudo.deleteAccessRule(
          project.id,
          accessRules.find((r) => r.directoryEndUserGroupId === HRGroup.id)!.id
        );

        const _accessRules = await sudo.listAppAccessRules(project.id);
        expect(_accessRules.length).toBe(3);
        expect(_accessRules).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              directoryEndUserGroupId: DevGroup.id,
              roleId: roles[1].id,
            }),
            expect.objectContaining({
              domain: "@ops-company.com",
              roleId: roles[3].id,
            }),
            expect.objectContaining({
              email: "random@co.co",
              roleId: roles[3].id,
            }),
          ])
        );

        await sudo.updateAccessRule(
          project.id,
          _accessRules.find((r) => r.domain === "@ops-company.com")!.id,
          roles[0].id
        );

        const _accessRules2 = await sudo.listAppAccessRules(project.id);
        expect(_accessRules2.length).toBe(3);
        expect(_accessRules2).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              directoryEndUserGroupId: DevGroup.id,
              roleId: roles[1].id,
            }),
            expect.objectContaining({
              domain: "@ops-company.com",
              roleId: roles[0].id,
            }),
            expect.objectContaining({
              email: "random@co.co",
              roleId: roles[3].id,
            }),
          ])
        );
      });
    });
  });

  describe("getUserRoleForApp", () => {
    it("should return the highest role an user", async () => {
      await withEndUserMngSetup(
        async ({ sudo, emails, project, directory }) => {
          const roles = await sudo.listAppRoles(project.id);

          const SUPER_ADMIN = roles[0];
          const ADMIN = roles[1];
          const NORMAL = roles[2];
          const VIEWER = roles[3];

          // Should get super admin through HR group
          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: emails[0],
            })
          ).toMatchObject(SUPER_ADMIN);

          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: emails[1],
            })
          ).toMatchObject(SUPER_ADMIN);

          // Should get admin through Dev group
          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: emails[2],
            })
          ).toMatchObject(ADMIN);

          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: emails[3],
            })
          ).toMatchObject(ADMIN);

          // Should get viewer through domain invite
          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: emails[4],
            })
          ).toMatchObject(VIEWER);

          // Should get viewer through registered user role
          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: emails[5],
            })
          ).toMatchObject(VIEWER);

          // Should get viewer through email invite
          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: "random@co.co",
            })
          ).toMatchObject(VIEWER);

          await sudo.upsertAppAuthConfig(project.id, {
            directoryId: directory.id,
            registeredRoleId: null,
          });

          // Should have lost access because of registeredRoleId change
          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: emails[5],
            })
          ).toBeUndefined();
          expect(
            await getUserRoleForApp(sudo, project.id, {
              email: "fake@co.co",
            })
          ).toBeUndefined();
        }
      );
    });
  });

  describe("getUsersWithGroups", () => {
    it("should return users with groups", async () => {
      await withEndUserMngSetup(async ({ sudo, emails, directory }) => {
        const users = await sudo.getDirectoryUsers(directory.id);
        const groups = await sudo.getDirectoryGroups(directory.id);

        const HRGroup = groups.find((g) => g.name === "HR")!;
        const DevGroup = groups.find((g) => g.name === "Dev")!;
        const OpsGroup = groups.find((g) => g.name === "Ops")!;
        const FunGroup = groups.find((g) => g.name === "Fun")!;

        expect(HRGroup).toBeDefined();
        expect(DevGroup).toBeDefined();
        expect(OpsGroup).toBeDefined();
        expect(FunGroup).toBeDefined();

        const usersWithGroups = await getUsersWithGroups(
          sudo,
          directory.id,
          users
        );

        expect(usersWithGroups).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              email: emails[0],
              groups: expect.arrayContaining([
                {
                  id: HRGroup.id,
                  name: HRGroup.name,
                },
                {
                  id: FunGroup.id,
                  name: FunGroup.name,
                },
              ]),
            }),
            expect.objectContaining({
              email: emails[1],
              groups: expect.arrayContaining([
                {
                  id: HRGroup.id,
                  name: HRGroup.name,
                },
              ]),
            }),
            expect.objectContaining({
              email: emails[2],
              groups: expect.arrayContaining([
                {
                  id: DevGroup.id,
                  name: DevGroup.name,
                },
                {
                  id: FunGroup.id,
                  name: FunGroup.name,
                },
              ]),
            }),
            expect.objectContaining({
              email: emails[3],
              groups: expect.arrayContaining([
                {
                  id: DevGroup.id,
                  name: DevGroup.name,
                },
              ]),
            }),
            expect.objectContaining({
              email: emails[4],
              groups: expect.arrayContaining([
                {
                  id: OpsGroup.id,
                  name: OpsGroup.name,
                },
              ]),
            }),
            expect.objectContaining({
              email: emails[5],
              groups: [],
            }),
          ])
        );
      });
    });
  });

  describe("canCurrentUserExecuteOperation", () => {
    it("should return true if user can execute operation", async () => {
      await withEndUserMngSetup(async ({ sudo, dbCon, endUsers, project }) => {
        const roles = await sudo.listAppRoles(project.id);

        const SUPER_ADMIN = roles[0];
        const ADMIN = roles[1];
        const NORMAL = roles[2];
        const VIEWER = roles[3];
        const ANONYMOUS = roles[4];

        // endUsers are: Super Admin, Super Admin, Admin, Admin, Viewer, Viewer

        const SUPER_USER = await getAppUserInfo(dbCon, sudo, {
          appId: project.id,
          endUserId: endUsers[0].id,
        });

        const ADMIN_USER = await getAppUserInfo(dbCon, sudo, {
          appId: project.id,
          endUserId: endUsers[2].id,
        });

        const VIEWER_USER = await getAppUserInfo(dbCon, sudo, {
          appId: project.id,
          endUserId: endUsers[4].id,
        });

        const ANON_USER = {};

        // Unconfigured roleId should allow all operations
        expect(
          await canCurrentUserExecuteOperation(
            sudo,
            "invalid-project-id",
            SUPER_USER,
            {
              name: "operation",
              templates: {},
            }
          )
        ).toBeTrue();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ANON_USER, {
            name: "operation",
            templates: {},
          })
        ).toBeTrue();

        // Uncofigured apps should block operations if roleId is configured
        expect(
          await canCurrentUserExecuteOperation(
            sudo,
            "invalid-project-id",
            SUPER_USER,
            {
              name: "operation",
              templates: {},
              roleId: ANONYMOUS.id,
            }
          )
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(
            sudo,
            "invalid-project-id-2",
            VIEWER_USER,
            {
              name: "operation",
              templates: {},
              roleId: VIEWER.id,
            }
          )
        ).toBeFalse();

        // Invalid roleId should block operations
        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, SUPER_USER, {
            name: "operation",
            templates: {},
            roleId: "invalid",
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, VIEWER_USER, {
            name: "operation",
            templates: {},
            roleId: "another invalid",
          })
        ).toBeFalse();

        // Operations with anonymous role should be allowed
        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, SUPER_USER, {
            name: "operation",
            templates: {},
            roleId: ANONYMOUS.id,
          })
        ).toBeTrue();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ANON_USER, {
            name: "operation",
            templates: {},
          })
        ).toBeTrue();

        // Super Admin should be able to execute any operation
        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, SUPER_USER, {
            name: "operation",
            templates: {},
            roleId: SUPER_ADMIN.id,
          })
        ).toBeTrue();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, SUPER_USER, {
            name: "operation",
            templates: {},
            roleId: ADMIN.id,
          })
        ).toBeTrue();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, SUPER_USER, {
            name: "operation",
            templates: {},
            roleId: NORMAL.id,
          })
        ).toBeTrue();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, SUPER_USER, {
            name: "operation",
            templates: {},
            roleId: VIEWER.id,
          })
        ).toBeTrue();

        // Admin should be able to execute all operations except SUPER_ADMIN
        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ADMIN_USER, {
            name: "operation",
            templates: {},
            roleId: SUPER_ADMIN.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ADMIN_USER, {
            name: "operation",
            templates: {},
            roleId: ADMIN.id,
          })
        ).toBeTrue();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ADMIN_USER, {
            name: "operation",
            templates: {},
            roleId: NORMAL.id,
          })
        ).toBeTrue();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ADMIN_USER, {
            name: "operation",
            templates: {},
            roleId: VIEWER.id,
          })
        ).toBeTrue();

        // Viewer should be able to execute only Viewer operations
        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, VIEWER_USER, {
            name: "operation",
            templates: {},
            roleId: SUPER_ADMIN.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, VIEWER_USER, {
            name: "operation",
            templates: {},
            roleId: ADMIN.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, VIEWER_USER, {
            name: "operation",
            templates: {},
            roleId: NORMAL.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, VIEWER_USER, {
            name: "operation",
            templates: {},
            roleId: VIEWER.id,
          })
        ).toBeTrue();

        // Anonymous user should be able to execute only ANONYMOUS operations
        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ANON_USER, {
            name: "operation",
            templates: {},
            roleId: SUPER_ADMIN.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ANON_USER, {
            name: "operation",
            templates: {},
            roleId: ADMIN.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ANON_USER, {
            name: "operation",
            templates: {},
            roleId: NORMAL.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ANON_USER, {
            name: "operation",
            templates: {},
            roleId: VIEWER.id,
          })
        ).toBeFalse();

        expect(
          await canCurrentUserExecuteOperation(sudo, project.id, ANON_USER, {
            name: "operation",
            templates: {},
            roleId: ANONYMOUS.id,
          })
        ).toBeTrue();
      });
    });

    it("should block cross-project roleId requirements", async () => {
      await withEndUserMngSetup(
        async ({ sudo, dbCon, endUsers, project, userDb2 }) => {
          const roles = await sudo.listAppRoles(project.id);

          const SUPER_ADMIN = roles[0];
          const ADMIN = roles[1];
          const NORMAL = roles[2];
          const VIEWER = roles[3];
          const ANONYMOUS = roles[4];

          const { endUsers: fakeUsers, project: fakeProject } =
            await setupEndUsers(userDb2());

          const FAKE_SUPER_USER = await getAppUserInfo(dbCon, sudo, {
            appId: fakeProject.id,
            endUserId: fakeUsers[0].id,
          });

          const FAKE_ADMIN_USER = await getAppUserInfo(dbCon, sudo, {
            appId: fakeProject.id,
            endUserId: fakeUsers[2].id,
          });

          const FAKE_VIEWER_USER = await getAppUserInfo(dbCon, sudo, {
            appId: fakeProject.id,
            endUserId: fakeUsers[4].id,
          });

          // All fake users should be blocked in all operations except when there is no roleId requirement
          expect(
            await canCurrentUserExecuteOperation(
              sudo,
              fakeProject.id,
              FAKE_SUPER_USER,
              {
                name: "operation",
                templates: {},
                roleId: SUPER_ADMIN.id,
              }
            )
          ).toBeFalse();

          expect(
            await canCurrentUserExecuteOperation(
              sudo,
              fakeProject.id,
              FAKE_ADMIN_USER,
              {
                name: "operation",
                templates: {},
                roleId: ADMIN.id,
              }
            )
          ).toBeFalse();

          expect(
            await canCurrentUserExecuteOperation(
              sudo,
              fakeProject.id,
              FAKE_SUPER_USER,
              {
                name: "operation",
                templates: {},
                roleId: NORMAL.id,
              }
            )
          ).toBeFalse();

          expect(
            await canCurrentUserExecuteOperation(
              sudo,
              fakeProject.id,
              FAKE_VIEWER_USER,
              {
                name: "operation",
                templates: {},
                roleId: VIEWER.id,
              }
            )
          ).toBeFalse();

          expect(
            await canCurrentUserExecuteOperation(
              sudo,
              fakeProject.id,
              FAKE_SUPER_USER,
              {
                name: "operation",
                templates: {},
                roleId: ANONYMOUS.id,
              }
            )
          ).toBeFalse();
        }
      );
    });
  });
});
