import {
  SidebarPopupSetting,
  withSidebarPopupSetting,
} from "@/wab/client/components/style-controls/StyleComponent";
import { getHTMLElt } from "@/wab/client/components/view-common";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { IconButton } from "@/wab/client/components/widgets/IconButton";
import CloseIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Close";
import { ensure } from "@/wab/common";
import { withConsumer } from "@/wab/commons/components/ContextUtil";
import {
  Slot,
  SlotContent,
  SlotProvider,
} from "@/wab/commons/components/Slots";
import classNames from "classnames";
import domAlign from "dom-align";
import $ from "jquery";
import { observer } from "mobx-react";
import * as React from "react";
import { createContext, ReactNode, useEffect, useRef } from "react";
import * as ReactDOM from "react-dom";
export interface AdjacencyOptions {
  my: string;
  at: string;
}

interface SidebarPopupProps {
  children?: ReactNode;
  popup: ReactNode;
  show: boolean;
  onCancel: () => void;
  popupClassName?: string;
  maskClassName?: string;
  /**
   * By default, anything that is a descendant in the component tree is
   * considered safe to click on without dismissing the modal.  However, for
   * fancier situations, you can pass in this function to designate
   * additional DOM elements that should be considered safe to click on.
   */
  keepOpenDom?: () => Element[];
  /**
   * Usually we just center the sidebar modal, but set this to true if you
   * want it to be positioned adjacent to the clicked element.
   */
  adjacency?: AdjacencyOptions;
  sidebarPopupSetting?: SidebarPopupSetting;
  contentPanelClass?: string;
  popupTitle?: React.ReactNode;
}

export interface SidebarPopupContext {
  close: () => void;
}

export const SidebarPopupContext = createContext<
  SidebarPopupContext | undefined
>(undefined);

export const withSidebarPopupContext = withConsumer(
  SidebarPopupContext.Consumer,
  "sidebarPopupContext"
);

interface SidebarPopupContentProps {
  adjacency: AdjacencyOptions | undefined;
  onPointerDown: () => void;
  popup: React.ReactNode;
  target?: HTMLElement;
  popupClassName?: string;
  maskClassName?: string;
  // whether to show the popup content at the left panel or right panel.
  leftPane?: boolean;
  contentPanelClass?: string;
  popupTitle?: React.ReactNode;
}

function convertAdjacency(adjacency: AdjacencyOptions) {
  return [adjacency.my, adjacency.at];
}

function SidebarPopupContent({
  adjacency,
  onPointerDown,
  popup,
  target,
  popupClassName,
  maskClassName,
  contentPanelClass,
  leftPane,
  popupTitle,
}: SidebarPopupContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const context = React.useContext(SidebarPopupContext);
  const paneSelector = leftPane
    ? ".canvas-editor__left-pane"
    : ".canvas-editor__right-pane";
  useEffect(() => {
    if (adjacency) {
      domAlign(ref.current, ensure(target, "must have target"), {
        points: convertAdjacency(adjacency),
      });
    } else {
      const popup2 = ensure(ref.current, "must have popup");
      const pane = ensure(
        document.querySelector(paneSelector),
        "must be able to find pane"
      );
      domAlign(popup2, pane, {
        points: ["tc", "tc"],
        offset: [0, 40],
      });
      const popupBB = popup2.getBoundingClientRect();
      const paneBB = pane.getBoundingClientRect();
      const top = Math.max(0, popupBB.top);
      $(popup2).css({
        top,
        maxHeight: paneBB.height - top - 40,
      });
    }
  }, []);
  return (
    <>
      {ReactDOM.createPortal(
        <div className={classNames("right-pane__mask", maskClassName)}>
          <div
            onPointerDown={onPointerDown}
            className={classNames("dev-env panel-popup", popupClassName)}
            style={{ position: "absolute" }}
            ref={ref}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                context?.close();
              }
            }}
          >
            {popupTitle && (
              <div className="panel-popup-title">
                {popupTitle}
                <IconButton
                  onClick={() => context?.close()}
                  className="flex-push-right"
                >
                  <Icon icon={CloseIcon} />
                </IconButton>
              </div>
            )}
            <div
              className={classNames("panel-popup-content", contentPanelClass)}
            >
              {popup}
            </div>
            <Slot />
          </div>
        </div>,
        ensure(
          document.querySelector(paneSelector),
          "must be able to find pane"
        )
      )}
    </>
  );
}

export interface SidebarPopupState {
  selfRef?: HTMLElement;
}

class _SidebarPopup extends React.Component<
  SidebarPopupProps,
  SidebarPopupState
> {
  private ignoreNextPointerDown = false;

  constructor(props: SidebarPopupProps) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    document.addEventListener("pointerdown", this.handleGlobalDown);
    this.setState({
      selfRef: ReactDOM.findDOMNode(this) ? getHTMLElt(this) : undefined,
    });
  }

  private isKeepOpenDom(elt: EventTarget | null) {
    return (
      elt instanceof Element &&
      this.props.keepOpenDom &&
      this.props.keepOpenDom().some((safeDom) => safeDom.contains(elt))
    );
  }

  private handleGlobalDown = (e: MouseEvent) => {
    if (
      this.props.show &&
      !this.ignoreNextPointerDown &&
      !this.isKeepOpenDom(e.target)
    ) {
      this.props.onCancel();
    }
    this.ignoreNextPointerDown = false;
  };

  componentWillUnmount() {
    document.removeEventListener("pointerdown", this.handleGlobalDown);
  }

  private handleDown = () => {
    this.ignoreNextPointerDown = true;
  };

  render() {
    const {
      adjacency,
      popup,
      show,
      children,
      onCancel,
      popupClassName,
      maskClassName,
      sidebarPopupSetting,
      contentPanelClass,
    } = this.props;
    const { selfRef } = this.state;
    const context = {
      close: onCancel,
    };
    return (
      <>
        {children}
        {show && (!adjacency || selfRef) && (
          <SlotContent>
            <SidebarPopupContext.Provider value={context}>
              <SlotProvider>
                <SidebarPopupContent
                  target={selfRef}
                  adjacency={adjacency}
                  onPointerDown={this.handleDown}
                  popup={popup}
                  popupClassName={popupClassName}
                  maskClassName={maskClassName}
                  leftPane={!!sidebarPopupSetting && sidebarPopupSetting.left}
                  contentPanelClass={contentPanelClass}
                  popupTitle={this.props.popupTitle}
                />
              </SlotProvider>
            </SidebarPopupContext.Provider>
          </SlotContent>
        )}
      </>
    );
  }
}

export const SidebarPopup = withSidebarPopupSetting(observer(_SidebarPopup));
