import PP__SettingsContainer from "@/wab/client/components/pages/plasmic/PlasmicSettingsContainer";
import { BareModal } from "@/wab/client/components/studio/BareModal";
import TrustedHost from "@/wab/client/components/TrustedHost";
import { AsyncState } from "@/wab/client/hooks/useAsyncStrict";
import { ApiTrustedHost, PersonalApiToken } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { Flex } from "@plasmicapp/react-web";
import { isArray } from "lodash";
import * as React from "react";
const LazyChangePasswordModal = React.lazy(
  () => import("@/wab/client/components/ChangePasswordModal")
);

import { useNonAuthCtx } from "@/wab/client/app-ctx";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { showError } from "@/wab/client/ErrorNotifications";
import { PreconditionFailedError } from "@/wab/shared/ApiErrors/errors";
import { Menu, notification } from "antd";

interface SettingsContainerProps {
  avatarImgUrl?: string;
  name: string;
  email: string;
  tokensState: AsyncState<PersonalApiToken[]>;
  hideChangePassword?: boolean;
  onNewToken: () => void;
  onDeleteToken: (val: string) => void;
  copiedToken: string;
  onCopyToken: (e: React.MouseEvent, val: string) => void;
  hostsState: "loading" | "error" | ApiTrustedHost[] | undefined;
  onDeleteTrustedHost: (host: ApiTrustedHost) => void;
  onNewTrustedHost: () => void;
}

function SettingsContainer(props: SettingsContainerProps) {
  const tokenState = props.tokensState.loading
    ? "loading"
    : props.tokensState.error
    ? "error"
    : "loaded";

  const trustedHostsState =
    typeof props.hostsState === "string"
      ? props.hostsState
      : props.hostsState && "enabled";

  const overrides = {
    root: { props: { style: { userSelect: "text" } } } as Flex<"div">,
    newTokenButton: { props: { onClick: props.onNewToken } },
    newTrustedHostBtn: { onClick: props.onNewTrustedHost },
  };

  if (tokenState === "loaded") {
    const tokens = ensure(
      props.tokensState.value,
      "Unexpected undefined tokensState value"
    ).map((token) => {
      const copyState =
        props.copiedToken === token.token ? "copied" : undefined;
      return (
        <PP__SettingsContainer.tokenInstance
          tokenInstance={{
            tokenValue: token.token,
            onDelete: () => props.onDeleteToken(token.token),
            onCopy: (e) =>
              copyState !== "copied" && props.onCopyToken(e, token.token),
            copyState,
          }}
        />
      );
    });
    overrides["existingTokens"] = { children: tokens };
  }

  overrides["hostsList"] = {
    children: isArray(props.hostsState)
      ? props.hostsState.map((host) => (
          <TrustedHost
            host={host}
            onDelete={() => props.onDeleteTrustedHost(host)}
          />
        ))
      : [],
  };

  const [changingPassword, setChangingPassword] = React.useState(false);
  const nonAuthCtx = useNonAuthCtx();

  return (
    <>
      <PP__SettingsContainer
        variants={{ tokenState, trustedHostsState }}
        args={{
          avatarImgUrl: props.avatarImgUrl,
          name: props.name,
          email: props.email,
        }}
        overrides={overrides}
        hideChangePassword={props.hideChangePassword}
        changePasswordButton={{
          onClick: () => setChangingPassword(true),
        }}
        menuButton={{
          menu: () => (
            <Menu>
              <Menu.Item
                key="delete"
                onClick={async () => {
                  const confirm = await reactConfirm({
                    title: `Delete your account`,
                    message: (
                      <>
                        Are you sure you want to delete your account with email{" "}
                        <strong>{props.email}</strong>?
                        <br />
                        You will immediately lose access to all data you own,
                        including your projects, CMS databases, workspaces, and
                        organizations. Your account and data will be permanently
                        deleted within 30 days.
                      </>
                    ),
                    danger: true,
                  });
                  if (!confirm) {
                    return;
                  }
                  try {
                    await nonAuthCtx.api.deleteSelf();
                    window.location.replace("/login");
                    notification.success({
                      message: "User deactivated",
                    });
                  } catch (err: unknown) {
                    if (err instanceof PreconditionFailedError) {
                      showError(err);
                    }
                    throw err;
                  }
                }}
              >
                <strong>Delete</strong> account
              </Menu.Item>
            </Menu>
          ),
        }}
      />
      {changingPassword && (
        <BareModal onClose={() => setChangingPassword(false)} width={480}>
          <React.Suspense>
            <LazyChangePasswordModal />
          </React.Suspense>
        </BareModal>
      )}
    </>
  );
}

export default SettingsContainer as React.FunctionComponent<SettingsContainerProps>;
