import { AppCtx } from "@/wab/client/app-ctx";
import { getProjectUpsellAction } from "@/wab/client/components/modals/project-upsell";
import {
  ApiPermission,
  ApiTeam,
  FeatureTierId,
  TeamId,
  UserId,
} from "@/wab/shared/ApiSchema";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { AccessLevel } from "@/wab/shared/EntUtil";

const USER_ID = "user-1" as UserId;
const PAID_TIER = "enterprise" as FeatureTierId;

function mkTeam(id: string, fields: Partial<ApiTeam> = {}): ApiTeam {
  return {
    id: id as TeamId,
    name: id,
    createdAt: "2026-01-01",
    featureTier: null,
    featureTierId: null,
    onTrial: false,
    personalTeamOwnerId: null,
    ...fields,
  } as ApiTeam;
}

function mkAppCtx(
  teams: ApiTeam[],
  access: Record<string, AccessLevel>,
): AppCtx {
  const perms = Object.entries(access).map(
    ([teamId, accessLevel]) =>
      ({ teamId, userId: USER_ID, accessLevel }) as ApiPermission,
  );
  return { teams, perms, selfInfo: { id: USER_ID } } as AppCtx;
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

  it("moves a personal project into an organization on a paid plan", () => {
    const appCtx = mkAppCtx([personal, freeOrg, paidOrg], {
      "free-org": "owner",
      "paid-org": "editor",
    });
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "move",
      team: paidOrg,
    });
  });

  it("treats an organization on a trial as one to upgrade, not move into", () => {
    const appCtx = mkAppCtx([personal, trialOrg], { "trial-org": "owner" });
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "upgradeAndMove",
      team: trialOrg,
    });
  });

  it("upgrades an organization then moves a personal project into it", () => {
    const appCtx = mkAppCtx([personal, freeOrg], { "free-org": "owner" });
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "upgradeAndMove",
      team: freeOrg,
    });
  });

  it("picks the oldest organization the user can upgrade", () => {
    const older = mkTeam("older", { createdAt: "2025-01-01" });
    const newer = mkTeam("newer", { createdAt: "2026-06-01" });
    const appCtx = mkAppCtx([personal, newer, older], {
      older: "owner",
      newer: "owner",
    });
    expect(getProjectUpsellAction(appCtx, mkProject(personal.id))).toEqual({
      type: "upgradeAndMove",
      team: older,
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
