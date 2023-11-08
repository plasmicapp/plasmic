import * as React from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";
import { ApiPermission, ApiResource } from "../../../shared/ApiSchema";
import {
  DefaultShareButtonProps,
  PlasmicShareButton,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicShareButton";
import ShareDialogContent from "../widgets/plasmic/ShareDialogContent";

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
