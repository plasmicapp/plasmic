import { AppCtx } from "@/wab/client/app-ctx";
import {
  PromptTeamUpgradeOpts,
  canIEditTeam,
  canUpgradeTeam,
  maybeShowPaywall,
  promptTeamUpgrade,
} from "@/wab/client/components/modals/PricingModal";
import {
  ProjectDestination,
  ProjectDestinationForm,
  ProjectDestinationFormProps,
  ProjectDestinationOrg,
} from "@/wab/client/components/modals/ProjectDestinationForm";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { providesAppCtx } from "@/wab/client/contexts/AppContexts";
import {
  ApiProject,
  ApiTeam,
  TeamId,
  WorkspaceId,
} from "@/wab/shared/ApiSchema";
import { accessLevelRank } from "@/wab/shared/EntUtil";
import { checkIsTeamOnPaidTier } from "@/wab/shared/billing/billing-util";
import { ensure } from "@/wab/shared/common";
import { getAccessLevelToResource } from "@/wab/shared/perms";
import { naturalSortByName } from "@/wab/shared/sort";
import sortBy from "lodash/sortBy";
import * as React from "react";

/**
 * Asks where to move a project. Returns undefined if the user cancels.
 */
export async function promptProjectDestination(
  appCtx: AppCtx,
  orgs: ProjectDestinationOrg[],
  opts: Pick<ProjectDestinationFormProps, "defaultNewWorkspaceName"> = {},
): Promise<ProjectDestination | undefined> {
  return showTemporaryPrompt<ProjectDestination>((onSubmit, onCancel) =>
    providesAppCtx(appCtx)(
      <Modal
        title="Move project"
        open
        footer={null}
        onCancel={onCancel}
        wrapClassName="prompt-modal"
      >
        <ProjectDestinationForm
          {...opts}
          orgs={orgs}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </Modal>,
    ),
  );
}

export function getMoveDestinationOrgs(
  appCtx: AppCtx,
  currentWorkspaceId: WorkspaceId | null,
): ProjectDestinationOrg[] {
  const selfInfo = ensure(appCtx.selfInfo, "User must be authenticated");
  const workspaces = appCtx.workspaces.filter(
    (w) =>
      w.id !== currentWorkspaceId &&
      accessLevelRank(
        getAccessLevelToResource(
          { type: "workspace", resource: w },
          selfInfo,
          appCtx.perms,
        ),
      ) >= accessLevelRank("editor"),
  );
  const currentOrgId = appCtx.workspaces.find(
    (w) => w.id === currentWorkspaceId,
  )?.team.id;

  const orgs = naturalSortByName(appCtx.getAllTeams())
    .filter(
      (org) =>
        !needsUpgradeToMove(currentOrgId, org) || canUpgradeTeam(appCtx, org),
    )
    .map((org) => ({
      org,
      needsUpgrade: needsUpgradeToMove(currentOrgId, org),
      canCreateWorkspace: canIEditTeam(appCtx, org),
      workspaces: naturalSortByName(
        workspaces.filter((w) => w.team.id === org.id),
      ),
    }))
    .filter((o) => o.workspaces.length > 0 || o.canCreateWorkspace);
  return sortBy(orgs, [
    (o) => o.org.id !== currentOrgId,
    (o) => o.needsUpgrade,
  ]);
}

export async function moveProjectToDestination(
  appCtx: AppCtx,
  project: Pick<ApiProject, "id" | "teamId">,
  destination: ProjectDestination,
  opts: {
    upgrade?: PromptTeamUpgradeOpts;
    paywall?: Parameters<typeof maybeShowPaywall>[2];
  } = {},
): Promise<boolean> {
  if (
    needsUpgradeToMove(project.teamId, destination.org) &&
    !(await promptTeamUpgrade(appCtx, destination.org, {
      title: "",
      ...opts.upgrade,
      allowFreeTrial: false,
    }))
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

  await maybeShowPaywall(
    appCtx,
    () => appCtx.api.setSiteInfo(project.id, { workspaceId }),
    opts.paywall,
  );
  await appCtx.reloadAppCtx();
  return true;
}

function needsUpgradeToMove(
  sourceOrgId: TeamId | null | undefined,
  org: ApiTeam,
) {
  return (
    org.id !== sourceOrgId && !org.whiteLabelName && !checkIsTeamOnPaidTier(org)
  );
}
