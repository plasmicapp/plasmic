import { AppCtx } from "@/wab/client/app-ctx";
import { promptTeamUpgrade } from "@/wab/client/components/modals/PricingModal";
import {
  getMoveDestinationOrgs,
  moveProjectToDestination,
} from "@/wab/client/components/modals/ProjectDestinationModal";
import {
  ApiPermission,
  ApiTeam,
  ApiWorkspace,
  FeatureTierId,
  ProjectId,
  TeamId,
  UserId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { AccessLevel } from "@/wab/shared/EntUtil";

vi.mock(
  "@/wab/client/components/modals/PricingModal",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/wab/client/components/modals/PricingModal")
    >()),
    promptTeamUpgrade: vi.fn(),
  }),
);

const USER_ID = "user-1" as UserId;

function mkTeam(name: string, fields: Partial<ApiTeam> = {}): ApiTeam {
  return {
    id: name as TeamId,
    name,
    featureTierId: "paid-tier" as FeatureTierId,
    onTrial: false,
    personalTeamOwnerId: null,
    ...fields,
  } as ApiTeam;
}

function mkWorkspace(name: string, team: ApiTeam): ApiWorkspace {
  return {
    id: `${team.id}/${name}` as WorkspaceId,
    name,
    team,
  } as ApiWorkspace;
}

function teamPerm(team: ApiTeam, accessLevel: AccessLevel) {
  return { teamId: team.id, userId: USER_ID, accessLevel } as ApiPermission;
}

function workspacePerm(workspace: ApiWorkspace, accessLevel: AccessLevel) {
  return {
    workspaceId: workspace.id,
    userId: USER_ID,
    accessLevel,
  } as ApiPermission;
}

function mkAppCtx(
  teams: ApiTeam[],
  workspaces: ApiWorkspace[],
  perms: ApiPermission[],
): AppCtx {
  return Object.assign(Object.create(AppCtx.prototype), {
    teams,
    workspaces,
    perms,
    selfInfo: { id: USER_ID },
    reloadAppCtx: vi.fn(),
    api: {
      createWorkspace: vi.fn(async ({ teamId, name }) => ({
        paywall: "pass",
        response: { workspace: mkWorkspace(name, mkTeam(teamId)) },
      })),
      setSiteInfo: vi.fn(async () => ({ paywall: "pass", response: {} })),
    },
  });
}

describe("getMoveDestinationOrgs", () => {
  it("offers the current organization first, then the others by name, without the current workspace", () => {
    const agency = mkTeam("Agency");
    const studio2 = mkTeam("Studio 2");
    const studio10 = mkTeam("Studio 10");
    const current = mkWorkspace("Current", studio10);
    const site10 = mkWorkspace("Site 10", studio10);
    const site2 = mkWorkspace("Site 2", studio10);
    const apps = mkWorkspace("Apps", studio2);
    const appCtx = mkAppCtx(
      [agency, studio10, studio2],
      [site10, current, apps, site2],
      [
        teamPerm(agency, "editor"),
        teamPerm(studio2, "editor"),
        teamPerm(studio10, "editor"),
      ],
    );
    expect(getMoveDestinationOrgs(appCtx, current.id)).toEqual([
      {
        org: studio10,
        needsUpgrade: false,
        canCreateWorkspace: true,
        workspaces: [site2, site10],
      },
      {
        org: agency,
        needsUpgrade: false,
        canCreateWorkspace: true,
        workspaces: [],
      },
      {
        org: studio2,
        needsUpgrade: false,
        canCreateWorkspace: true,
        workspaces: [apps],
      },
    ]);
  });

  it("offers a workspace shared with the user, without creating workspaces in its organization", () => {
    const client = mkTeam("Client");
    const shared = mkWorkspace("Shared", client);
    const other = mkWorkspace("Other", client);
    const appCtx = mkAppCtx(
      [],
      [shared, other],
      [workspacePerm(shared, "editor")],
    );
    expect(getMoveDestinationOrgs(appCtx, null)).toEqual([
      {
        org: client,
        needsUpgrade: false,
        canCreateWorkspace: false,
        workspaces: [shared],
      },
    ]);
  });

  it("offers other free organizations to upgrade after the paid ones, and leaves out those the user can't upgrade", () => {
    const home = mkTeam("Home", { featureTierId: null });
    const agency = mkTeam("Agency", { featureTierId: null });
    const studio = mkTeam("Studio");
    const client = mkTeam("Client", { featureTierId: null });
    const current = mkWorkspace("Current", home);
    const next = mkWorkspace("Next", home);
    const shared = mkWorkspace("Shared", client);
    const appCtx = mkAppCtx(
      [home, agency, studio],
      [current, next, shared],
      [
        teamPerm(home, "editor"),
        teamPerm(agency, "owner"),
        teamPerm(studio, "editor"),
        workspacePerm(shared, "editor"),
      ],
    );
    expect(getMoveDestinationOrgs(appCtx, current.id)).toEqual([
      {
        org: home,
        needsUpgrade: false,
        canCreateWorkspace: true,
        workspaces: [next],
      },
      {
        org: studio,
        needsUpgrade: false,
        canCreateWorkspace: true,
        workspaces: [],
      },
      {
        org: agency,
        needsUpgrade: true,
        canCreateWorkspace: true,
        workspaces: [],
      },
    ]);
  });

  it("offers a free white-label organization without an upgrade", () => {
    const reseller = mkTeam("Reseller", {
      featureTierId: null,
      whiteLabelName: "reseller",
    });
    const shared = mkWorkspace("Shared", reseller);
    const appCtx = mkAppCtx([], [shared], [workspacePerm(shared, "editor")]);
    expect(getMoveDestinationOrgs(appCtx, null)).toEqual([
      {
        org: reseller,
        needsUpgrade: false,
        canCreateWorkspace: false,
        workspaces: [shared],
      },
    ]);
  });

  it("leaves out workspaces the user can only view, the playground, and organizations with nothing to offer", () => {
    const personal = mkTeam("Personal", { personalTeamOwnerId: USER_ID });
    const client = mkTeam("Client");
    const playground = mkWorkspace("Playground", personal);
    const viewOnly = mkWorkspace("View only", client);
    const appCtx = mkAppCtx(
      [personal, client],
      [playground, viewOnly],
      [teamPerm(personal, "owner"), teamPerm(client, "viewer")],
    );
    expect(getMoveDestinationOrgs(appCtx, null)).toEqual([]);
  });
});

describe("moveProjectToDestination", () => {
  const home = mkTeam("Home", { featureTierId: null });
  const agency = mkTeam("Agency", { featureTierId: null });
  const project = { id: "project-1" as ProjectId, teamId: home.id };

  it("doesn't create a workspace when the user cancels the upgrade", async () => {
    vi.mocked(promptTeamUpgrade).mockResolvedValue(false);
    const appCtx = mkAppCtx([], [], []);
    expect(
      await moveProjectToDestination(appCtx, project, {
        type: "newWorkspace",
        org: agency,
        name: "Sites",
      }),
    ).toBe(false);
    expect(promptTeamUpgrade).toHaveBeenCalledWith(appCtx, agency, {
      title: "",
      allowFreeTrial: false,
    });
    expect(appCtx.api.createWorkspace).not.toHaveBeenCalled();
    expect(appCtx.api.setSiteInfo).not.toHaveBeenCalled();
  });

  it("never offers a free trial, which can't receive the project", async () => {
    vi.mocked(promptTeamUpgrade).mockResolvedValue(false);
    const appCtx = mkAppCtx([], [], []);
    await moveProjectToDestination(
      appCtx,
      project,
      { type: "newWorkspace", org: agency, name: "Sites" },
      { upgrade: { title: "Upgrade", allowFreeTrial: true } },
    );
    expect(promptTeamUpgrade).toHaveBeenLastCalledWith(appCtx, agency, {
      title: "Upgrade",
      allowFreeTrial: false,
    });
  });

  it("moves within a free organization without asking to upgrade", async () => {
    vi.mocked(promptTeamUpgrade).mockClear();
    const appCtx = mkAppCtx([], [], []);
    const next = mkWorkspace("Next", home);
    expect(
      await moveProjectToDestination(appCtx, project, {
        type: "workspace",
        org: home,
        workspace: next,
      }),
    ).toBe(true);
    expect(promptTeamUpgrade).not.toHaveBeenCalled();
    expect(appCtx.api.setSiteInfo).toHaveBeenCalledWith(project.id, {
      workspaceId: next.id,
    });
  });
});
