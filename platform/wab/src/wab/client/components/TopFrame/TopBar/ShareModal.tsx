/** @format */

import ShareDialogContent from "@/wab/client/components/widgets/plasmic/ShareDialogContent";
import { useTopFrameCtx } from "@/wab/client/frame-ctx/top-frame-ctx";
import { ApiPermission, ApiProject } from "@/wab/shared/ApiSchema";
import { observer } from "mobx-react";
import * as React from "react";
import { TopBarModal } from "./TopBarModal";

interface ShareModalProps {
  refreshProjectAndPerms: () => void;
  project: ApiProject;
  perms: ApiPermission[];
  showShareModal: boolean;
  setShowShareModal: (val: boolean) => Promise<void>;
}

export const ShareModal = observer(function ShareModal({
  refreshProjectAndPerms,
  project,
  perms,
  showShareModal,
  setShowShareModal,
}: ShareModalProps) {
  const { hostFrameApi } = useTopFrameCtx();
  return (
    <>
      {showShareModal && (
        <TopBarModal
          title={
            <>
              Share <strong>{project.name}</strong>
            </>
          }
          closable
          onClose={() => setShowShareModal(false)}
        >
          <ShareDialogContent
            closeDialog={() => setShowShareModal(false)}
            perms={perms}
            reloadPerms={async () => {
              await hostFrameApi.refreshSiteInfo();
              refreshProjectAndPerms();
            }}
            updateResourceCallback={async () => {
              await hostFrameApi.refreshSiteInfo();
              refreshProjectAndPerms();
            }}
            resource={{
              type: "project",
              resource: project,
            }}
          />
        </TopBarModal>
      )}
    </>
  );
});

export default ShareModal;
