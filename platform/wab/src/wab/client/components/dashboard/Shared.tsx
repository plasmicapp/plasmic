import styles from "@/wab/client/components/dashboard/dashboard.module.scss";
import { Avatar, MoreUsersAvatar } from "@/wab/client/components/studio/Avatar";
import { ClickStopper } from "@/wab/client/components/widgets";
import ShareDialogContent from "@/wab/client/components/widgets/plasmic/ShareDialogContent";
import {
  DefaultSharedProps,
  PlasmicShared,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicShared";
import { filterMapTruthy } from "@/wab/common";
import { ApiPermission, ApiResource } from "@/wab/shared/ApiSchema";
import {
  convertToTaggedResourceId,
  filterDirectResourcePerms,
} from "@/wab/shared/perms";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as L from "lodash";
import * as React from "react";
import { Modal } from "src/wab/client/components/widgets/Modal";

interface SharedProps extends DefaultSharedProps {
  resource: ApiResource;
  perms: ApiPermission[];
  reloadPerms: () => Promise<void>;
}

const maxNumberOfAvatars = 3;

function Shared_(props: SharedProps, ref: HTMLElementRefOf<"button">) {
  const { resource, perms, reloadPerms, ...rest } = props;

  const directPerms = filterDirectResourcePerms(
    perms,
    convertToTaggedResourceId(resource)
  );
  const directUsers = L.uniqBy(
    filterMapTruthy(directPerms, (p) => p.user),
    (u) => u.id
  );

  const firstUsers = directUsers.slice(0, maxNumberOfAvatars - 1);
  const nextUser = directUsers.slice(
    maxNumberOfAvatars - 1,
    maxNumberOfAvatars
  )[0];
  const moreUsersCount = directUsers.length - firstUsers.length;

  const [modal, setModal] = React.useState(false);

  return (
    <ClickStopper preventDefault>
      <PlasmicShared
        root={{ ref }}
        avatars={[
          ...firstUsers.map((u) => (
            <Avatar
              key={u.id}
              user={u}
              size="small"
              className={styles.sharedAvatar}
            />
          )),
          ...(moreUsersCount > 1
            ? [
                <MoreUsersAvatar
                  key={"+"}
                  size="small"
                  className={styles.sharedAvatar}
                  number={moreUsersCount}
                />,
              ]
            : moreUsersCount == 1
            ? [
                <Avatar
                  key={nextUser.id}
                  user={nextUser}
                  size="small"
                  className={styles.sharedAvatar}
                />,
              ]
            : []),
        ]}
        onClick={() => setModal(true)}
        {...rest}
      />
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
    </ClickStopper>
  );
}

const Shared = React.forwardRef(Shared_);
export default Shared;
