import { useNonAuthCtx } from "@/wab/client/app-ctx";
import styles from "@/wab/client/components/auth/ConnectOAuth.module.scss";
import Button from "@/wab/client/components/widgets/Button";
import { PlasmicButton__VariantsArgs } from "@/wab/client/plasmic/PlasmicButton";
import { mkUuid, spawn } from "@/wab/shared/common";
import GLogo from "@/wab/commons/images/g-logo.png";
import OktaLogo from "@/wab/commons/images/okta-logo.png";
import { WrappedStorageEvent } from "@/wab/shared/SharedApi";
import { proxy } from "comlink";
import _ from "lodash";
import React from "react";

interface ConnectOAuthButtonProps {
  url: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  waitingChildren?: React.ReactNode;
  onStart?: () => void;
  onSuccess?: () => void;
  onFailure?: (reason: string) => void;
  disabled?: boolean;

  // Button props
  className?: string;
  style?: React.CSSProperties;
  type?: PlasmicButton__VariantsArgs["type"];
  size?: PlasmicButton__VariantsArgs["size"];

  // Set this to render a custom element instead of the default button
  render?: (props: { onClick: () => void; isWaiting: boolean }) => JSX.Element;
}

export function useAuthPopup(opts: {
  onStart?: () => void;
  onSuccess?: () => void;
  onFailure?: (reason: string | null) => void;
  onEnd?: () => void;
}) {
  const api = useNonAuthCtx().api;
  const { onStart, onSuccess, onFailure, onEnd } = opts;
  const [isWaiting, setWaiting] = React.useState(false);

  React.useEffect(() => {
    const onStorage = proxy((event: WrappedStorageEvent) => {
      if (event.key !== `authStatus` || !isWaiting) {
        return;
      }
      setWaiting(false);
      if (event.newValue === "Success") {
        onSuccess?.();
      } else {
        onFailure?.(event.newValue);
      }
    });
    const uniqueId = mkUuid();
    spawn(api.addStorageListener(uniqueId, onStorage));
    return () => {
      spawn(api.removeEventListener("storage", uniqueId));
    };
  });

  return {
    isWaiting,
    open: (url: string) => {
      setWaiting(true);
      onStart?.();
      spawn(api.removeStorageItem("authStatus"));
      const popup = window.open(url, "_blank", "width=600,height=600");
      if (popup) {
        const timerId = window.setInterval(() => {
          if (popup.closed) {
            setWaiting(false);
            window.clearInterval(timerId);
            onEnd?.();
          }
        }, 500);
      } else {
        alert("Please disable your popup blocker, then reload the page.");
      }
    },
  };
}

export function ConnectOAuthButton(props: ConnectOAuthButtonProps) {
  const {
    onStart = _.noop,
    onSuccess = _.noop,
    onFailure = _.noop,
    disabled,
  } = props;
  const { isWaiting, open } = useAuthPopup({ onStart, onSuccess, onFailure });

  const onClick = () => open(props.url);

  if (props.render) {
    return props.render({ onClick, isWaiting });
  }

  const buttonProps = _.pick(props, "style", "type", "size");
  return (
    <Button
      className={`${props.className}`}
      onClick={onClick}
      disabled={isWaiting || disabled}
      startIcon={props.icon}
      withIcons={"startIcon"}
      {...buttonProps}
    >
      {isWaiting ? props.waitingChildren || props.children : props.children}
    </Button>
  );
}

export function GoogleSignInButton(props: {
  googleAuthUrl: string;
  size?: PlasmicButton__VariantsArgs["size"];
  children?: React.ReactNode;
  onStart: () => void;
  onSuccess: () => void;
  onFailure: (reason: string) => void;
}) {
  // Must adhere to Google branding guidelines
  return (
    <ConnectOAuthButton
      onStart={props.onStart}
      onSuccess={props.onSuccess}
      onFailure={props.onFailure}
      url={props.googleAuthUrl}
      size={props.size}
      style={{
        background: "white",
        border: "1px solid #eee",
        borderBottom: "1px solid #ccc",
      }}
      icon={<img alt={"Google"} className={styles.Icon} src={GLogo} />}
    >
      {props.children || "Sign in with Google"}
    </ConnectOAuthButton>
  );
}

export function OktaSignInButton(props: {
  oktaAuthUrl: string;
  size?: PlasmicButton__VariantsArgs["size"];
  children?: React.ReactNode;
  onStart: () => void;
  onSuccess: () => void;
  onFailure: (reason: string) => void;
}) {
  return (
    <ConnectOAuthButton
      onStart={props.onStart}
      onSuccess={props.onSuccess}
      onFailure={props.onFailure}
      url={props.oktaAuthUrl}
      size={props.size}
      waitingChildren={"Signing in via Okta..."}
      icon={<img alt={"Okta"} className={styles.Icon} src={OktaLogo} />}
    >
      {props.children || "Log in with Okta"}
    </ConnectOAuthButton>
  );
}
