import { Modal } from "@/wab/client/components/widgets/Modal";
import ShareDialogContent from "@/wab/client/components/widgets/plasmic/ShareDialogContent";
import {
  DefaultShareButtonProps,
  PlasmicShareButton,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicShareButton";
import { ApiPermission, ApiResource } from "@/wab/shared/ApiSchema";
import * as React from "react";

interface ShareButtonProps extends DefaultShareButtonProps {
  resource: ApiResource;
  perms: ApiPermission[];
  reloadPerms: (perms: ApiPermission[]) => Promise<void>;
}

function ShareButton(props: ShareButtonProps) {
  const { resource, perms, reloadPerms, ...rest } = props;
  const [modal, setModal] = React.useState(false);
  return (
    <>
      <PlasmicShareButton {...rest} onClick={() => setModal(true)} />
      {modal && (
        <Modal
          visible={true}
          onCancel={() => setModal(false)}
          modalRender={() => (
            <ShareDialogContent
              className="ant-modal-content"
              resource={resource}
              perms={perms}
              closeDialog={() => setModal(false)}
              reloadPerms={reloadPerms}
            />
          )}
        />
      )}
    </>
  );
}

export default ShareButton;
