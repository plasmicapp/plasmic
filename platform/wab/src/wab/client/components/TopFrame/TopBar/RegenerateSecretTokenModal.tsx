import { AppCtx } from "@/wab/client/app-ctx";
import { reactAlert, reactConfirm } from "@/wab/client/components/quick-modals";
import { ApiPermission, ApiProject } from "@/wab/shared/ApiSchema";
import * as React from "react";

interface ShareModalProps {
  refreshProjectAndPerms: () => void;
  project: ApiProject;
  perms: ApiPermission[];
  showShareModal: boolean;
  setShowShareModal: (val: boolean) => Promise<void>;
}

export async function showRegenerateSecretTokenModal({
  appCtx,
  project,
}: {
  appCtx: AppCtx;
  project: ApiProject;
}) {
  if (
    !(await reactConfirm({
      message:
        "Generate new secret API token? (This will invalidate any existing secret token.) This is only needed for the Write API.",
    }))
  ) {
    return;
  }
  const response = await appCtx.api.setSiteInfo(project.id, {
    regenerateSecretApiToken: true,
  });
  if (response.paywall === "pass") {
    const { regeneratedSecretApiToken } = response.response;
    await reactAlert({
      message: (
        <>
          <p>
            New secret API token for this project (will not be shown again):
          </p>
          <pre>{regeneratedSecretApiToken}</pre>
        </>
      ),
    });
  }
}
