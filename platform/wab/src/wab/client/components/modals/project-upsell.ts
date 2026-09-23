import { AppCtx } from "@/wab/client/app-ctx";
import {
  PromptTeamUpgradeOpts,
  canIEditTeam,
  canUpgradeTeam,
  maybeShowPaywall,
  promptTeamUpgrade,
} from "@/wab/client/components/modals/PricingModal";
import { ApiProject, ApiTeam } from "@/wab/shared/ApiSchema";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { checkIsTeamOnPaidTier } from "@/wab/shared/billing/billing-util";
import { assertNever } from "@/wab/shared/common";
import sortBy from "lodash/sortBy";

/**
 * Possible actions user can take when a project needs a paid plan.
 */
export type ProjectUpsellAction =
  // The project's organization, which the user can upgrade.
  | { type: "upgrade"; team: ApiTeam }
  // The project's organization, which the user can't upgrade.
  | { type: "askAdmin"; team: ApiTeam | undefined }
  // A personal project; the user already has an organization on a paid plan.
  | { type: "move"; team: ApiTeam }
  // A personal project; the user has an organization they can upgrade.
  | { type: "upgradeAndMove"; team: ApiTeam }
  // A personal project and no organization at all.
  | { type: "createOrg" };

export function getProjectUpsellAction(
  appCtx: AppCtx,
  project: Pick<ApiProject, "teamId" | "createdById">,
): ProjectUpsellAction {
  const projectTeam = appCtx.teams.find((t) => t.id === project.teamId);
  const isPersonalProject =
    project.createdById === appCtx.selfInfo?.id &&
    (!project.teamId || !!projectTeam?.personalTeamOwnerId);
  if (!isPersonalProject) {
    return projectTeam && canUpgradeTeam(appCtx, projectTeam)
      ? { type: "upgrade", team: projectTeam }
      : { type: "askAdmin", team: projectTeam };
  }

  // Same order as the dashboard's upsell redirect: the oldest organization wins.
  const orgs = sortBy(
    appCtx.teams.filter(
      (t) => !t.personalTeamOwnerId && canIEditTeam(appCtx, t),
    ),
    (t) => new Date(t.createdAt).getTime(),
  );

  const paidOrg = orgs.find((t) => checkIsTeamOnPaidTier(t));
  if (paidOrg) {
    return { type: "move", team: paidOrg };
  }

  const upgradableOrg = orgs.find((t) => canUpgradeTeam(appCtx, t));
  if (upgradableOrg) {
    return { type: "upgradeAndMove", team: upgradableOrg };
  }
  return { type: "createOrg" };
}

/**
 * Returns true once the project is in an organization on a paid plan
 */
export async function runProjectUpsellAction(
  appCtx: AppCtx,
  project: Pick<ApiProject, "id" | "teamId" | "createdById">,
  action: ProjectUpsellAction,
  opts: PromptTeamUpgradeOpts,
): Promise<boolean> {
  switch (action.type) {
    case "askAdmin":
      return false;
    case "upgrade": {
      if (!(await promptTeamUpgrade(appCtx, action.team, opts))) {
        return false;
      }
      await appCtx.reloadAppCtx();
      return true;
    }
    case "move":
      await moveProjectToOrg(appCtx, project, action.team);
      return true;
    case "upgradeAndMove": {
      if (!(await promptTeamUpgrade(appCtx, action.team, opts))) {
        return false;
      }
      await moveProjectToOrg(appCtx, project, action.team);
      return true;
    }
    case "createOrg": {
      const { team } = await appCtx.api.createTeam(
        `${appCtx.selfInfo?.firstName ?? "My"}'s ${ORGANIZATION_LOWER}`,
      );
      await appCtx.reloadAppCtx();
      if (!(await promptTeamUpgrade(appCtx, team, opts))) {
        return false;
      }
      await moveProjectToOrg(appCtx, project, team);
      return true;
    }
    default:
      return assertNever(action);
  }
}

async function moveProjectToOrg(
  appCtx: AppCtx,
  project: Pick<ApiProject, "id">,
  team: ApiTeam,
) {
  const workspace = appCtx.workspaces.find((w) => w.team.id === team.id);
  const workspaceId =
    workspace?.id ??
    (
      await maybeShowPaywall(appCtx, () =>
        appCtx.api.createWorkspace({ teamId: team.id, name: "Projects" }),
      )
    ).workspace.id;
  await maybeShowPaywall(appCtx, () =>
    appCtx.api.setSiteInfo(project.id, { workspaceId }),
  );
  await appCtx.reloadAppCtx();
}
