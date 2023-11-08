/** @format */

import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { assert, spawn } from "../../../../common";
import { ApiProject, MainBranchId } from "../../../../shared/ApiSchema";
import { parseProjectLocation, U } from "../../../cli-routes";
import { useAppCtx } from "../../../contexts/AppContexts";
import { promptMoveToWorkspace } from "../../dashboard/dashboard-actions";

interface CloneProjectModalProps {
  project: ApiProject;
  showCloneProjectModal: boolean;
  setShowCloneProjectModal: (val: boolean) => Promise<void>;
}

export const CloneProjectModal = observer(function ProjectNameModal({
  project,
  showCloneProjectModal,
  setShowCloneProjectModal,
}: CloneProjectModalProps) {
  const appCtx = useAppCtx();

  useEffect(() => {
    spawn(
      (async () => {
        if (showCloneProjectModal) {
          const destWorkspaceId = await promptMoveToWorkspace(
            appCtx,
            null,
            false,
            "Duplicate"
          );
          if (!destWorkspaceId) {
            await setShowCloneProjectModal(false);
            return;
          }
          assert(destWorkspaceId.result === "workspace", "");
          const parsedLocation = parseProjectLocation(appCtx.history.location);

          const { projectId: newProjectId } = await appCtx.app.withSpinner(
            appCtx.api.cloneProject(project.id, {
              workspaceId: destWorkspaceId.workspace.id,
              ...(parsedLocation?.branchName &&
              parsedLocation.branchName !== MainBranchId
                ? { branchName: parsedLocation.branchName }
                : {}),
            })
          );
          window.open(U.project({ projectId: newProjectId }), "_blank");
        }
      })()
    );
  }, [showCloneProjectModal]);

  return null;
});

export default CloneProjectModal;
