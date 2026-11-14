import { AppCtx } from "@/wab/client/app-ctx";
import {
  ProjectDestination,
  ProjectDestinationForm,
  ProjectDestinationOrg,
} from "@/wab/client/components/modals/ProjectDestinationForm";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { Modal } from "@/wab/client/components/widgets/Modal";
import { providesAppCtx } from "@/wab/client/contexts/AppContexts";
import * as React from "react";

/**
 * Asks where to move a personal project. Returns undefined if the user cancels.
 */
export async function promptProjectDestination(
  appCtx: AppCtx,
  orgs: ProjectDestinationOrg[],
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
          orgs={orgs}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </Modal>,
    ),
  );
}
