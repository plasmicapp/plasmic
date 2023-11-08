import React from "react";
import { createPortal } from "react-dom";
import { useForceUpdate } from "../useForceUpdate";

export function createPortalTunnel() {
  let containerElement: HTMLElement | undefined = undefined;
  let forceUpdateOut: (() => void) | undefined = undefined;

  const Out = (props: { className?: string }) => {
    return (
      <div
        className={props.className}
        ref={(ref) => {
          containerElement = ref ?? undefined;
          forceUpdateOut?.();
        }}
      />
    );
  };
  const outRef = (ref: HTMLElement | null | undefined) => {
    containerElement = ref ?? undefined;
    forceUpdateOut?.();
  };

  const In = (props: { children?: React.ReactNode }) => {
    const forceUpdate = useForceUpdate();
    forceUpdateOut = forceUpdate;
    if (containerElement) {
      return createPortal(props.children, containerElement);
    } else {
      return null;
    }
  };

  return { outRef, Out, In };
}
