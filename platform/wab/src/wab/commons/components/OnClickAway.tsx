// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { plasmicIFrameMouseDownEvent } from "@/wab/client/definitions/events";
import $ from "jquery";
import React, { cloneElement, ReactElement, useRef } from "react";
import { useInteractOutside } from "react-aria";
import { useEvent } from "react-use";

export interface OnClickAwayProps {
  onDone: () => void;
  children: ReactElement;
}

export function OnClickAway({ onDone, children }: OnClickAwayProps) {
  const ignoreNextPointerDown = useRef<boolean>(false);
  function handleGlobalDown() {
    if (!ignoreNextPointerDown.current) {
      onDone();
    } else {
      ignoreNextPointerDown.current = false;
    }
  }
  useEvent("pointerdown", handleGlobalDown, document);
  return cloneElement(children, {
    onPointerDown: (e) => (ignoreNextPointerDown.current = true),
  });
}

export function useOnClickAwayExcept(
  getAllowedContainers: () => (Element | undefined | null)[],
  callback: () => void
) {
  const listener = React.useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) {
        return;
      }
      const target = e.target as Element;
      const containers = getAllowedContainers();
      if (
        target.isConnected &&
        !containers.some((container) => container && container.contains(target))
      ) {
        callback();
      }
    },
    [getAllowedContainers, callback]
  );
  useEvent("click", listener as EventListener, document);

  React.useEffect(() => {
    document.addEventListener(plasmicIFrameMouseDownEvent, callback);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, callback);
    };
  }, [callback]);
}

export function OnClickAwayExcept(props: {
  getAllowedContainers: () => (Element | undefined | null)[];
  callback: () => void;
  children: React.ReactElement;
}) {
  useOnClickAwayExcept(props.getAllowedContainers, props.callback);
  return props.children;
}

export function useOnClickAwayIfNotAllowed(
  isAllowed: (target: Element) => boolean,
  callback: () => void
) {
  const listener = React.useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) {
        return;
      }
      const target = e.target as Element;
      if (!isAllowed(target)) {
        callback();
      }
    },
    [isAllowed, callback]
  );
  useEvent("click", listener as EventListener, document);

  React.useEffect(() => {
    document.addEventListener(plasmicIFrameMouseDownEvent, callback);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, callback);
    };
  }, [callback]);
}

export function OnClickAwayIfNotAllowed(props: {
  isAllowed: (target: Element) => boolean;
  callback: () => void;
  children: React.ReactElement;
}) {
  useOnClickAwayIfNotAllowed(props.isAllowed, props.callback);
  return props.children;
}

export const INTERACT_OUTSIDE_EXCEPTION_SELECTORS = [
  ".ant-dropdown-menu-item",
  ".ant-modal-content",
  ".ant-select-dropdown",
  ".ant-notification",
  ".ant-picker-dropdown",
  ".dim-spinner-popup-mask",
  ".dropdown-overlay",
  '[data-plasmic-role="overlay"]',
  ".panel-popup",
  ".ant-popover",
  ".bottom-modals",
];
export function useInteractOutsideWithCommonExceptions(
  opts: Parameters<typeof useInteractOutside>[0] & {
    exceptSelectors?: string[];
  }
) {
  const lastPointerDown = useRef<PointerEvent | undefined>(undefined);
  const onInteractOutside = opts.onInteractOutside;
  useInteractOutside({
    ...opts,
    onInteractOutside: (e) => {
      const shouldInteractOutside = (
        eventTarget: EventTarget | null | undefined
      ) => {
        if (eventTarget instanceof Node) {
          // Don't close if the interaction was with an ant menu
          // or select.
          const exceptions = [
            ...INTERACT_OUTSIDE_EXCEPTION_SELECTORS,
            ...(opts.exceptSelectors ?? []),
          ];
          const $target = $(eventTarget);
          const $parents = $target.parents();
          return !exceptions.some(
            (selector) => $target.is(selector) || $parents.is(selector)
          );
        }
        return true;
      };
      if (
        shouldInteractOutside(e.target) &&
        (e.type !== "pointerup" ||
          shouldInteractOutside(lastPointerDown.current?.target))
      ) {
        opts.onInteractOutside?.(e);
      }
      if (e.type === "pointerup") {
        lastPointerDown.current = undefined;
      }
    },
    onInteractOutsideStart: (e) => {
      if (e.type === "pointerdown") {
        lastPointerDown.current = e;
      }
    },
  });

  // Clicking on plasmic iframe always counts as outside interaction
  const callback = React.useCallback(
    (e: Event) => {
      onInteractOutside?.(e as any);
    },
    [onInteractOutside]
  );
  React.useEffect(() => {
    document.addEventListener(plasmicIFrameMouseDownEvent, callback);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, callback);
    };
  }, [callback]);
}
