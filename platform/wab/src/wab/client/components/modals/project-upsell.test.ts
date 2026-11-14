import { AppCtx } from "@/wab/client/app-ctx";
import { getProjectUpsellAction } from "@/wab/client/components/modals/project-upsell";
import {
  ApiPermission,
  ApiTeam,
  ApiWorkspace,
  FeatureTierId,
  TeamId,
  UserId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { AccessLevel } from "@/wab/shared/EntUtil";

const USER_ID = "user-1" as UserId;
const PAID_TIER = "enterprise" as FeatureTierId;

function mkTeam(id: string, fields: Partial<ApiTeam> = {}): ApiTeam {
  return {
    id: id as TeamId,
    name: id,
    featureTier: null,
    featureTierId: null,
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

function mkAppCtx(
  teams: ApiTeam[],
  access: Record<string, AccessLevel>,
  workspaces: ApiWorkspace[] = [],
): AppCtx {
  const perms = Object.entries(access).map(
    ([teamId, accessLevel]) =>
      ({ teamId, userId: USER_ID, accessLevel }) as ApiPermission,
  );
  return { teams, perms, workspaces, selfInfo: { id: USER_ID } } as AppCtx;
}

function mkProject(teamId: TeamId | null, createdById: UserId = USER_ID) {
  return { teamId, createdById };
}

const personal = mkTeam("personal", { personalTeamOwnerId: USER_ID });
const freeOrg = mkTeam("free-org", { featureTierId: DEVFLAGS.freeTier.id });
const trialOrg = mkTeam("trial-org", {
  featureTierId: PAID_TIER,
  onTrial: true,
});
const paidOrg = mkTeam("paid-org", { featureTierId: PAID_TIER });

describe("getProjectUpsellAction", () => {
  it("upgrades the project's organization when the user can", () => {
    const appCtx = mkAppCtx([freeOrg], { "free-org": "owner" });
    expect(getProjectUpsellAction(appCtx, mkProject(freeOrg.id))).toEqual({
      type: "upgrade",
      team: freeOrg,
    });
  });

  it("upgrades the project's organization when it is only on a trial", () => {
    const appCtx = mkAppCtx([trialOrg], { "trial-org": "owner" });
    expect(getProjectUpsellAction(appCtx, mkProject(trialOrg.id))).toEqual({
      type: "upgrade",
      team: trialOrg,
    });
  });

  it("asks an admin when the user can't upgrade the project's organization", () => {
    const appCtx = mkAppCtx([freeOrg], { "free-org": "viewer" });
    expect(getProjectUpsellAction(appCtx, mkProject(freeOrg.id))).toEqual({
      type: "askAdmin",
      team: freeOrg,
    });
  });

  it("asks an admin when the project is in an organization the user isn't part of", () => {
    const appCtx = mkAppCtx([personal], {});
    expect(
      getProjectUpsellAction(appCtx, mkProject("other-org" as TeamId)),
    ).toEqual({ type: "askAdmin", team: undefined });
  });

  it("asks an admin for a project outside any workspace that someone else created", () => {
    const appCtx = mkAppCtx([personal, paidOrg], { "paid-org": "owner" });
    expect(
      getProjectUpsellAction(appCtx, mkProject(null, "someone-else" as UserId)),
    ).toEqual({ type: "askAdmin", team: undefined });
  });

  it("does not move a project out of another organization", () => {
    const appCtx = mkAppCtx([freeOrg, paidOrg], {
      "free-org": "viewer",
      "paid-org": "owner",
    });
    expect(getProjectUpsellAction(appCtx, mkProject(freeOrg.id))).toEqual({
      type: "askAdmin",
      team: freeOrg,
    });
  });

  it("offers paid organizations first, then organizations to upgrade, each sorted by name", () => {
    const paid2 = mkTeam("paid-2", {
      name: "Studio 2",
      featureTierId: PAID_TIER,
    });
    const paid10 = mkTeam("paid-10", {
      name: "Studio 10",
      featureTierId: PAID_TIER,
    });
    const free2 = mkTeam("free-2", {
      name: "Agency 2",
      featureTierId: DEVFLAGS.freeTier.id,
    });
    const free10 = mkTeam("free-10", {
      name: "Agency 10",
      featureTierId: DEVFLAGS.freeTier.id,
    });
    const site10 = mkWorkspace("Site 10", paid2);
    const site2 = mkWorkspace("Site 2", paid2);
    const apps = mkWorkspace("apps", paid2);
    const appCtx = mkAppCtx(
      [personal, free10, paid10, free2, paid2],
      {
        "free-10": "owner",
        "free-2": "owner",
        "paid-10": "editor",
        "paid-2": "editor",
      },
      [site10, mkWorkspace("Drafts", personal), apps, site2],
    );
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "move",
      destinationOrgs: [
        { org: paid2, needsUpgrade: false, workspaces: [apps, site2, site10] },
        { org: paid10, needsUpgrade: false, workspaces: [] },
        { org: free2, needsUpgrade: true, workspaces: [] },
        { org: free10, needsUpgrade: true, workspaces: [] },
      ],
    });
  });

  it("treats an organization on a trial as one to upgrade", () => {
    const appCtx = mkAppCtx([personal, trialOrg], { "trial-org": "owner" });
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "move",
      destinationOrgs: [{ org: trialOrg, needsUpgrade: true, workspaces: [] }],
    });
  });

  it("ignores organizations the user can only view", () => {
    const appCtx = mkAppCtx([personal, paidOrg], { "paid-org": "viewer" });
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "createOrg",
    });
  });

  it("creates an organization when the user has none", () => {
    const appCtx = mkAppCtx([personal], {});
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "createOrg",
    });
    expect(getProjectUpsellAction(appCtx, mkProject(null))).toEqual({
      type: "createOrg",
    });
  });
});
