import {
  ANON_USER,
  Actor,
  DbMgr,
  ForbiddenError,
  NotFoundError,
  SUPER_USER,
  normalActor,
  teamActor,
} from "@/wab/server/db/DbMgr";
import {
  Permission,
  Project,
  Team,
  User,
  Workspace,
} from "@/wab/server/entities/Entities";
import { UnauthorizedError } from "@/wab/shared/ApiErrors/errors";
import {
  ProjectId,
  ProjectIdAndToken,
  TeamId,
  UserId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { AccessLevel } from "@/wab/shared/EntUtil";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { EntityManager } from "typeorm";
import { mock } from "vitest-mock-extended";

const projectId = "project" as ProjectId;
const userId = "user" as UserId;
const teamId = "team" as TeamId;
const workspaceId = "workspace" as WorkspaceId;
// Explicit order keeps the expected authorization matrix independent of the
// production rank helper.
const levels: AccessLevel[] = [
  "blocked",
  "viewer",
  "commenter",
  "content",
  "designer",
  "editor",
  "owner",
];
const actors: [string, Actor][] = [
  ["anonymous", ANON_USER],
  ["user", normalActor(userId)],
  ["team", teamActor(teamId)],
];

const originalPermissionLookup = DbMgr.prototype["getPermissionsForResources"];

// Only persistence boundaries are mocked. The real sudo managers, permission
// inheritance, actor descriptions, token checks, and memoization all run.
function fixture(
  actor: Actor = ANON_USER,
  tokens?: ProjectIdAndToken[],
  fields: Partial<Project> = {},
  permissions: Partial<Permission>[] = [],
) {
  const project = Object.assign(
    new Project(),
    {
      id: projectId,
      createdById: "owner" as UserId,
      inviteOnly: true,
      readableByPublic: false,
      defaultAccessLevel: "viewer",
      projectApiToken: "public-token",
      secretApiToken: "secret-token",
    },
    fields,
  );
  const em = mock<EntityManager>();
  em.getRepository.mockImplementation(() => {
    throw new Error("Unexpected database access");
  });
  const lookup = vi
    .spyOn(DbMgr.prototype, "getProjectById")
    .mockResolvedValue(project);
  const lookups = vi
    .spyOn(DbMgr.prototype, "getProjectsById")
    .mockResolvedValue([project]);
  const perms = vi
    .fn<typeof originalPermissionLookup>()
    .mockResolvedValue(
      permissions.map((p) =>
        Object.assign(
          new Permission(),
          { projectId: null, workspaceId: null, teamId: null, userId: null },
          p,
        ),
      ),
    );
  DbMgr.prototype["getPermissionsForResources"] = perms;
  const user = vi
    .spyOn(DbMgr.prototype, "getUserById")
    .mockResolvedValue(
      Object.assign(new User(), { id: userId, email: "reader@example.test" }),
    );
  const mgr = new DbMgr(
    em,
    actor,
    tokens === undefined ? undefined : { projectIdsAndTokens: tokens },
  );
  return { mgr, project, em, lookup, lookups, perms, user };
}
const token = (projectApiToken: string, id = projectId): ProjectIdAndToken => ({
  projectId: id,
  projectApiToken,
});

// Invalid anonymous credentials are authentication failures; a valid user,
// team identity, or project token with insufficient access is forbidden.
function expectedDenial(mgr: DbMgr) {
  const authenticated =
    mgr.actor.type !== "AnonUser" ||
    mgr.projectIdsAndTokens?.some(
      (p) =>
        p.projectId === projectId &&
        ["public-token", "secret-token"].includes(p.projectApiToken),
    );
  return authenticated ? ForbiddenError : UnauthorizedError;
}

async function expectDecision(
  mgr: DbMgr,
  level: AccessLevel,
  allowed: boolean,
) {
  const result = mgr.checkProjectPerms(projectId, level, "inspect");
  if (allowed) {
    await expect(result).resolves.toBeUndefined();
  } else {
    await expect(result).rejects.toBeInstanceOf(expectedDenial(mgr));
    if (expectedDenial(mgr) === UnauthorizedError) {
      await expect(result).rejects.toThrow(
        "Project ID and/or project API token are missing or incorrect",
      );
    }
  }
}

afterEach(() => {
  DbMgr.prototype["getPermissionsForResources"] = originalPermissionLookup;
  vi.restoreAllMocks();
});

describe("checkProjectPerms without a database", () => {
  it.each(levels)("superusers bypass every lookup at %s", async (level) => {
    const { mgr, lookup, lookups, user, perms } = fixture(SUPER_USER);
    await expectDecision(mgr, level, true);
    for (const spy of [lookup, lookups, user, perms]) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  describe.each(actors)("%s", (_name, actor) => {
    const credentials: [string, ProjectIdAndToken[] | undefined, number][] = [
      ["no tokens", undefined, 0],
      ["empty token list", [], 0],
      ["invalid token", [token("wrong")], 0],
      ["public token", [token("public-token")], 1],
      ["secret token", [token("secret-token")], 5],
      [
        "wrong project public token",
        [token("public-token", "other" as ProjectId)],
        0,
      ],
      [
        "wrong project secret token",
        [token("secret-token", "other" as ProjectId)],
        0,
      ],
      [
        "valid token after invalid ones",
        [token("wrong"), token("public-token")],
        1,
      ],
      ["both tokens", [token("public-token"), token("secret-token")], 5],
    ];
    describe.each(credentials)("%s", (_label, tokens, maxRank) => {
      it.each(levels)("checks %s", async (level) => {
        const { mgr } = fixture(actor, tokens);
        await expectDecision(mgr, level, levels.indexOf(level) <= maxRank);
      });
    });

    describe.each([true, false])("inviteOnly=%s", (inviteOnly) => {
      describe.each(levels.filter((level) => level !== "blocked"))(
        "default access %s",
        (defaultAccessLevel) => {
          it.each(levels)("checks %s", async (level) => {
            const { mgr } = fixture(actor, [token("wrong")], {
              inviteOnly,
              defaultAccessLevel,
            });
            await expectDecision(
              mgr,
              level,
              level === "blocked" ||
                (!inviteOnly &&
                  levels.indexOf(level) <= levels.indexOf(defaultAccessLevel)),
            );
          });
        },
      );
    });

    it.each(levels)(
      "public projects with an owner grant only read access: %s",
      async (level) => {
        const { mgr } = fixture(actor, [token("wrong")], {
          readableByPublic: true,
        });
        await expectDecision(
          mgr,
          level,
          levels.indexOf(level) <= (actor.type === "TeamApiUser" ? 0 : 1),
        );
      },
    );

    it.each(levels)(
      "public projects without an owner grant %s",
      async (level) => {
        const { mgr } = fixture(actor, [token("wrong")], {
          createdById: null,
          readableByPublic: true,
        });
        await expectDecision(mgr, level, true);
      },
    );

    it.each(levels)(
      "private projects without an owner do not grant extra access: %s",
      async (level) => {
        const { mgr } = fixture(actor, undefined, { createdById: null });
        await expectDecision(mgr, level, level === "blocked");
      },
    );
  });

  it.each([null, ""])(
    "absent stored tokens (%s) do not grant access",
    async (storedToken) => {
      const { mgr } = fixture(ANON_USER, [token("wrong")], {
        projectApiToken: storedToken,
        secretApiToken: storedToken,
      });
      await expectDecision(mgr, "viewer", false);
    },
  );

  it.each(["public token", "secret token", "default access"])(
    "%s bypasses actor lookup",
    async (source) => {
      const { mgr, user, perms } = fixture(
        normalActor(userId),
        source === "default access"
          ? undefined
          : [
              token(
                source === "public token" ? "public-token" : "secret-token",
              ),
            ],
        source === "default access"
          ? { inviteOnly: false, defaultAccessLevel: "editor" }
          : {},
      );
      user.mockRejectedValue(new Error("unavailable user"));
      perms.mockRejectedValue(new Error("unavailable permissions"));
      await expectDecision(
        mgr,
        source === "public token" ? "viewer" : "editor",
        true,
      );
      expect(user).not.toHaveBeenCalled();
      expect(perms).not.toHaveBeenCalled();
    },
  );

  describe.each(levels)("user permission %s", (accessLevel) => {
    it.each(levels)(
      "checks required %s despite an invalid token",
      async (level) => {
        const { mgr } = fixture(normalActor(userId), [token("wrong")], {}, [
          { projectId, userId, accessLevel },
        ]);
        await expectDecision(
          mgr,
          level,
          levels.indexOf(accessLevel) >= levels.indexOf(level),
        );
      },
    );
  });

  it.each(["project", "workspace", "team", "parent team"])(
    "inherits %s permissions",
    async (source) => {
      const workspace = Object.assign(new Workspace(), {
        id: workspaceId,
        teamId,
        team: Object.assign(new Team(), { id: teamId, parentTeamId: "parent" }),
      });
      const permission = {
        userId,
        accessLevel: "editor" as AccessLevel,
        ...(source === "project"
          ? { projectId }
          : source === "workspace"
            ? { workspaceId }
            : { teamId: (source === "team" ? teamId : "parent") as TeamId }),
      };
      const { mgr } = fixture(
        normalActor(userId),
        [token("wrong")],
        { workspace, workspaceId },
        [permission],
      );
      await expectDecision(mgr, "editor", true);
      await expectDecision(mgr, "owner", false);
    },
  );

  it("ignores permissions for other users and unrelated resources", async () => {
    const { mgr } = fixture(normalActor(userId), undefined, {}, [
      { projectId, userId: "other" as UserId, accessLevel: "owner" },
      { projectId: "other" as ProjectId, userId, accessLevel: "owner" },
    ]);
    await expectDecision(mgr, "viewer", false);
  });

  it("chooses the strongest permission and preserves higher default access", async () => {
    const { mgr } = fixture(
      normalActor(userId),
      undefined,
      { inviteOnly: false, defaultAccessLevel: "designer" },
      [
        { projectId, userId, accessLevel: "viewer" },
        { projectId, userId, accessLevel: "content" },
      ],
    );
    await expectDecision(mgr, "designer", true);
    await expectDecision(mgr, "editor", false);
  });

  it.each([true, false])("team ownership matches=%s", async (matches) => {
    const workspace = Object.assign(new Workspace(), {
      id: workspaceId,
      teamId: matches ? teamId : "other",
    });
    const { mgr } = fixture(teamActor(teamId), [token("wrong")], {
      workspace,
      workspaceId,
    });
    await expectDecision(mgr, "owner", matches);
  });

  it("loads the workspace when it was not joined", async () => {
    const { mgr } = fixture(teamActor(teamId), undefined, { workspaceId });
    const lookup = vi
      .spyOn(DbMgr.prototype, "getWorkspaceById")
      .mockResolvedValue(
        Object.assign(new Workspace(), { id: workspaceId, teamId }),
      );
    await expectDecision(mgr, "owner", true);
    expect(lookup).toHaveBeenCalledWith(workspaceId);
  });

  it("admin users retain editor access", async () => {
    const { mgr, user } = fixture(normalActor(userId));
    user.mockResolvedValue(
      Object.assign(new User(), {
        id: userId,
        email: `test@${DEVFLAGS.adminTeamDomain}`,
      }),
    );
    await expectDecision(mgr, "editor", true);
    await expectDecision(mgr, "owner", false);
  });

  it.each([undefined, "Ask the owner."])(
    "describes denied access with suggestion %s",
    async (suggestion) => {
      const { mgr } = fixture(normalActor(userId), undefined, {}, [
        { projectId, userId, accessLevel: "content" },
      ]);
      await expect(
        mgr.checkProjectPerms(projectId, "editor", "edit", suggestion),
      ).rejects.toThrow(
        `reader@example.test tried to edit project project, but their access level content creator didn't meet required level developer. ${suggestion ?? ""}`,
      );
    },
  );

  it("describes denied write access with a public token", async () => {
    const { mgr } = fixture(ANON_USER, [token("public-token")]);
    await expect(
      mgr.checkProjectPerms(projectId, "editor", "edit"),
    ).rejects.toThrow(
      "Anonymous User tried to edit project project, but their access level viewer didn't meet required level developer.",
    );
  });

  it.each([false, true])(
    "forwards includeDeleted=%s and preserves lookup failures",
    async (includeDeleted) => {
      const { mgr, lookup } = fixture();
      const error = new NotFoundError("missing project");
      lookup.mockRejectedValue(error);
      await expect(
        mgr.checkProjectPerms(
          projectId,
          "viewer",
          "read",
          undefined,
          includeDeleted,
        ),
      ).rejects.toBe(error);
      expect(lookup).toHaveBeenCalledWith(projectId, includeDeleted);
    },
  );

  it("propagates permission lookup failures", async () => {
    const { mgr, perms } = fixture(normalActor(userId));
    const error = new Error("permission lookup failed");
    perms.mockRejectedValue(error);
    await expect(
      mgr.checkProjectPerms(projectId, "editor", "edit"),
    ).rejects.toBe(error);
  });

  it("memoizes concurrent checks independent of action and suggestion", async () => {
    const { mgr, lookup } = fixture(ANON_USER, [token("public-token")]);
    const first = mgr.checkProjectPerms(projectId, "viewer", "read", "first");
    const second = mgr.checkProjectPerms(
      projectId,
      "viewer",
      "inspect",
      "second",
    );
    expect(second).toBe(first);
    await expect(first).resolves.toBeUndefined();
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("caches authentication failures", async () => {
    const { mgr, lookup } = fixture();
    const first = mgr.checkProjectPerms(projectId, "editor", "edit", "first");
    const second = mgr.checkProjectPerms(
      projectId,
      "editor",
      "delete",
      "second",
    );
    expect(second).toBe(first);
    await expect(first).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(second).rejects.toBeInstanceOf(UnauthorizedError);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("separates cache entries by project, level, and includeDeleted", async () => {
    const { mgr, lookup } = fixture(ANON_USER, [
      token("secret-token"),
      token("secret-token", "other" as ProjectId),
    ]);
    await mgr.checkProjectPerms(projectId, "viewer", "read");
    await mgr.checkProjectPerms(projectId, "editor", "edit");
    await mgr.checkProjectPerms("other", "viewer", "read");
    await mgr.checkProjectPerms(projectId, "viewer", "read", undefined, true);
    expect(lookup).toHaveBeenCalledTimes(4);
  });

  it("never shares cached authorization between managers", async () => {
    const { mgr, em } = fixture(ANON_USER, [token("secret-token")]);
    await expectDecision(mgr, "editor", true);
    await expectDecision(new DbMgr(em, ANON_USER), "editor", false);
  });
});
