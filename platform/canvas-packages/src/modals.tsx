import { useInteractOutside } from "@react-aria/interactions";
import { OverlayProvider, useOverlay } from "@react-aria/overlays";
import cx from "classnames";
import type $$ from "jquery";
import React from "react";
import ReactDOM from "react-dom";

interface ModalShellProps {
  children?: React.ReactNode;
  onClose: () => void;
  title: string;
  containerSelector: string;
  $: typeof $$;
  studioDocument: Document;
  domAlign(el: any, refNode: any, align: any): any;
  popupWidth?: number;
  style?: React.CSSProperties;
}

interface ModalProps extends ModalShellProps {
  show?: boolean;
}

type InternalModalProps =
  | "title"
  | "$"
  | "containerSelector"
  | "studioDocument"
  | "domAlign"
  | "popupWidth";

export const createModal = (props: Pick<ModalProps, InternalModalProps>) => {
  return (restProps: Omit<ModalProps, InternalModalProps>) => (
    <Modal {...props} {...restProps} />
  );
};

/**
 * Creates a sidebar modal.
 */
function Modal(props: ModalProps) {
  const { show, ...restProps } = props;

  // The same modal will always have the same frameId.
  if (show) {
    return <ModalShell {...restProps} />;
  } else {
    return null;
  }
}

function ModalShell({
  children,
  containerSelector,
  onClose,
  $,
  title,
  studioDocument,
  domAlign,
  popupWidth,
  style,
}: ModalShellProps) {
  const popupRef = React.useRef<HTMLDivElement>(null);

  const [modalHeight, setModalHeight] = React.useState(0);
  const container = studioDocument.querySelector(containerSelector);
  const [minHeight, setMinHeight] = React.useState(
    container ? Math.min(modalHeight, container.clientHeight - 50) : undefined
  );

  React.useEffect(() => {
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setMinHeight(Math.min(modalHeight, container.clientHeight - 50));
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [container, modalHeight]);

  // We use @react-aria's useOverlay to catch Escape.  We don't use
  // it for catching clicks outside the modal because it always closes
  // the overlay on any click outside popupRef, including clicks on
  // menus, selects, and other overlay divs.  So instead, we do this
  // ourselves with our own call to `useInteractOutside()`.
  const { overlayProps } = useOverlay(
    {
      isOpen: !!true,
      isDismissable: false,
      onClose,
    },
    popupRef
  );

  useInteractOutside({
    ref: popupRef,
    onInteractOutside: (e) => {
      const target = e.target;
      if (target instanceof Node) {
        // Don't close if the interaction was with an ant menu
        // or select.
        const exceptions = Array.from(
          studioDocument.querySelectorAll(
            `.ant-dropdown-menu-item,.ant-select-dropdown,.dim-spinner-popup-mask,.dropdown-overlay,[data-plasmic-role="overlay"]`
          )
        );
        if (exceptions.some((x) => x.contains(target))) {
          return;
        }
        const $target = $(target);
        if (
          $target.parents().is(".panel-popup") ||
          $target.is(".panel-popup") ||
          $target.parents().is(".ant-popover") ||
          $target.is(".ant-popover")
        ) {
          return;
        }
      }

      onClose();
    },
  });

  // Position the popup within the container
  React.useEffect(() => {
    const popup = popupRef.current;
    if (!popup) {
      return;
    }
    const pane = ensure(studioDocument.querySelector(containerSelector));
    domAlign(popup, pane, {
      points: ["tc", "tc"],
      offset: [0, 40],
    });
  }, [containerSelector]);

  if (!container) {
    // Nothing to display
    return null;
  }

  return ReactDOM.createPortal(
    <OverlayProvider>
      <div
        className={cx("right-pane__mask auto-pointer-events")}
        onClick={onClose}
      >
        <div
          ref={popupRef}
          className={cx("dev-env panel-popup absolute")}
          style={{ minHeight: minHeight, width: popupWidth, ...style }}
          onClick={(e) => e.stopPropagation()}
          {...overlayProps}
        >
          <div
            className="flex-col"
            style={{
              position: "absolute",
              overflow: "hidden",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          >
            <div
              className="flex-col overflow-hidden"
              ref={(elt) => {
                if (!elt) {
                  return;
                }
                const titleHeight = ensure(
                  elt.querySelector(".panel-popup-title")
                ).getBoundingClientRect().height;
                const contentHeight = ensure(
                  elt.querySelector(".panel-popup-content-inner")
                ).getBoundingClientRect().height;
                const newModalHeight = titleHeight + contentHeight + 10;
                if (newModalHeight !== modalHeight) {
                  setModalHeight(newModalHeight);
                }
              }}
            >
              {
                // We can't use FocusScope here because of
                // https://github.com/adobe/react-spectrum/issues/3350
              }
              <div
                className="flex-col"
                // Ideally we'd stop all event propagation out of the portal, but
                // react-color relies on events getting propagated all the way to
                // document, so we cannot. Instead, we specifically stop propagation
                // of contextMenu, which will trigger the context menu of ancestor
                // rendered the modal
                // {...stopAllPropagation()}
                onContextMenu={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onClose();
                  }
                }}
              >
                <div className="panel-popup-title">
                  {title && (
                    <div className="flex flex-fill flex-vcenter strong text-xlg tight-line-height list-item-height">
                      {title}
                    </div>
                  )}
                  <button
                    onClick={onClose}
                    className="flex-push-right"
                    tabIndex={-1}
                  >
                    <CloseIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                <div className={cx("panel-popup-content", "rel")}>
                  <div className="panel-popup-content-inner">{children}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OverlayProvider>,
    container
  );
}

function CloseIcon(props: React.ComponentProps<"svg">) {
  const { style, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      className={"plasmic-default__svg custom-svg-icon"}
      style={style}
      {...restProps}
    >
      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M17.25 6.75l-10.5 10.5m0-10.5l10.5 10.5"}
      ></path>
    </svg>
  );
}

function ensure<T>(x: T | null | undefined): T {
  if (x === null || x === undefined) {
    debugger;
    throw new Error(`Value must not be undefined or null`);
  } else {
    return x;
  }
}
