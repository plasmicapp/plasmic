import { AppCtx } from "@/wab/client/app-ctx";
import {
  PromptTeamUpgradeOpts,
  canUpgradeTeam,
  promptTeamUpgrade,
} from "@/wab/client/components/modals/PricingModal";
import { ProjectDestinationOrg } from "@/wab/client/components/modals/ProjectDestinationForm";
import {
  getMoveDestinationOrgs,
  moveProjectToDestination,
  promptProjectDestination,
} from "@/wab/client/components/modals/ProjectDestinationModal";
import { ApiProject, ApiTeam } from "@/wab/shared/ApiSchema";
import { ORGANIZATION_LOWER } from "@/wab/shared/Labels";
import { checkIsTeamOnPaidTier } from "@/wab/shared/billing/billing-util";
import { assertNever } from "@/wab/shared/common";

const NEW_WORKSPACE_NAME = "AI Projects";

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

  // A white-label organization takes the project without a plan, but Plasmic
  // AI still treats it as free, so moving there wouldn't unlock AI.
  const orgs = getMoveDestinationOrgs(appCtx, null).filter(
    (o) => !o.org.whiteLabelName || checkIsTeamOnPaidTier(o.org),
  );

  return orgs.length > 0
    ? { type: "move", destinationOrgs: orgs }
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
        { defaultNewWorkspaceName: NEW_WORKSPACE_NAME },
      );
      return destination
        ? moveProjectToDestination(appCtx, project, destination, {
            upgrade: opts,
          })
        : false;
    }
    case "createOrg": {
      const { team } = await appCtx.api.createTeam(
        `${appCtx.selfInfo?.firstName ?? "My"}'s ${ORGANIZATION_LOWER}`,
      );
      await appCtx.reloadAppCtx();
      // A new organization has no workspaces yet.
      return moveProjectToDestination(
        appCtx,
        project,
        { type: "newWorkspace", org: team, name: NEW_WORKSPACE_NAME },
        { upgrade: opts },
      );
    }
    default:
      return assertNever(action);
  }
}
