import { AppCtx } from "@/wab/client/app-ctx";
import {
  PromptTeamUpgradeOpts,
  canIEditTeam,
  canUpgradeTeam,
  maybeShowPaywall,
  promptTeamUpgrade,
} from "@/wab/client/components/modals/PricingModal";
import {
  NEW_WORKSPACE_NAME,
  ProjectDestination,
  ProjectDestinationOrg,
} from "@/wab/client/components/modals/ProjectDestinationForm";
import { promptProjectDestination } from "@/wab/client/components/modals/ProjectDestinationModal";
import { ApiProject, ApiTeam } from "@/wab/shared/ApiSchema";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { checkIsTeamOnPaidTier } from "@/wab/shared/billing/billing-util";
import { assertNever } from "@/wab/shared/common";
import { naturalSortByName } from "@/wab/shared/sort";
import sortBy from "lodash/sortBy";

/**
 * Possible actions user can take when a project needs a paid plan.
 */
export type ProjectUpsellAction =
  // The project's organization, which the user can upgrade.
  | { type: "upgrade"; team: ApiTeam }
  // The project's organization, which the user can't upgrade.
  | { type: "askAdmin"; team: ApiTeam | undefined }
  // A personal project; the user picks one of destination organizations
  | { type: "move"; destinationOrgs: ProjectDestinationOrg[] }
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

  // Paid organizations first, each part sorted by name.
  const orgs = sortBy(
    naturalSortByName(
      appCtx.teams.filter(
        (t) =>
          !t.personalTeamOwnerId &&
          canIEditTeam(appCtx, t) &&
          (checkIsTeamOnPaidTier(t) || canUpgradeTeam(appCtx, t)),
      ),
    ),
    (t) => !checkIsTeamOnPaidTier(t),
  );

  return orgs.length > 0
    ? {
        type: "move",
        destinationOrgs: orgs.map((org) => ({
          org,
          needsUpgrade: !checkIsTeamOnPaidTier(org),
          workspaces: naturalSortByName(
            appCtx.workspaces.filter((w) => w.team.id === org.id),
          ),
        })),
      }
    : { type: "createOrg" };
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
    case "move": {
      const destination = await promptProjectDestination(
        appCtx,
        action.destinationOrgs,
      );
      return destination
        ? moveProjectToPaidOrg(appCtx, project, destination, opts)
        : false;
    }
    case "createOrg": {
      const { team } = await appCtx.api.createTeam(
        `${appCtx.selfInfo?.firstName ?? "My"}'s ${ORGANIZATION_LOWER}`,
      );
      await appCtx.reloadAppCtx();
      // A new organization has no workspaces yet.
      return moveProjectToPaidOrg(
        appCtx,
        project,
        { type: "newWorkspace", org: team, name: NEW_WORKSPACE_NAME },
        opts,
      );
    }
    default:
      return assertNever(action);
  }
}

async function moveProjectToPaidOrg(
  appCtx: AppCtx,
  project: Pick<ApiProject, "id">,
  destination: ProjectDestination,
  opts: PromptTeamUpgradeOpts,
) {
  if (
    !checkIsTeamOnPaidTier(destination.org) &&
    !(await promptTeamUpgrade(appCtx, destination.org, opts))
  ) {
    return false;
  }
  const workspaceId =
    destination.type === "workspace"
      ? destination.workspace.id
      : (
          await maybeShowPaywall(appCtx, () =>
            appCtx.api.createWorkspace({
              teamId: destination.org.id,
              name: destination.name,
            }),
          )
        ).workspace.id;

  await maybeShowPaywall(appCtx, () =>
    appCtx.api.setSiteInfo(project.id, { workspaceId }),
  );
  await appCtx.reloadAppCtx();
  return true;
}
