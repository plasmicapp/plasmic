import styles from "@/wab/client/components/ContextMenu.module.scss";
import {
  plasmicIFrameMouseDownEvent,
  plasmicIFrameWheelEvent,
} from "@/wab/client/definitions/events";
import { hasAncestorElement } from "@/wab/client/dom-utils";
import { ensure } from "@/wab/common";
import { Dropdown } from "antd";
import { MenuProps } from "antd/lib/menu";
import L from "lodash";
import * as React from "react";
import * as ReactDOM from "react-dom";

export type MenuType = React.ReactElement | (() => React.ReactElement);

let contextMenuHandled = false;

/**
 * Generally try to use WithContextMenu when possible since it reliably cleans
 * up on owner unmount.
 */
export function maybeShowContextMenu(
  event: MouseEvent,
  menu: MenuType | null | undefined,
  opts?: {
    pageX?: number;
    pageY?: number;
  }
) {
  opts = opts || {};
  // Based on antd's Modal.confirm() function
  event.preventDefault();
  event.stopPropagation();

  if (!menu || contextMenuHandled) {
    return;
  }

  contextMenuHandled = true;

  const div = document.createElement("div");
  div.style.zIndex = "1";
  document.body.appendChild(div);

  function destroy() {
    contextMenuHandled = false;
    const unmountResult = ReactDOM.unmountComponentAtNode(div);

    if (unmountResult && div.parentNode) {
      div.parentNode.removeChild(div);
    }
  }

  ReactDOM.render(
    <ContextMenu
      overlay={menu}
      pageX={opts.pageX || event.pageX}
      pageY={opts.pageY || event.pageY}
      onHide={destroy}
    />,
    div
  );

  return { destroy };
}

export function useContextMenu(opts: { menu: MenuType | null | undefined }) {
  const { menu } = opts;
  const destroyRef = React.useRef<(() => void) | undefined>(undefined);
  React.useEffect(() => {
    return () => {
      destroyRef.current && destroyRef.current();
    };
  }, [destroyRef]);
  return {
    onContextMenu: (e: React.MouseEvent) => {
      const result = maybeShowContextMenu(e.nativeEvent, menu);
      if (result) {
        destroyRef.current = result.destroy;
      }
    },
  } as const;
}

// Loosely modeled after https://github.com/vkbansal/react-contextmenu
interface ContextMenuProps {
  overlay: MenuType;
  pageX: number;
  pageY: number;
  onHide: () => void;
}

export default class ContextMenu extends React.Component<ContextMenuProps, {}> {
  private root: HTMLElement;
  private container: HTMLElement;

  private onWheel: (e: Event) => void;

  constructor(props: ContextMenuProps) {
    super(props);
    this.root = document.getElementsByTagName("body")[0];
    this.container = document.createElement("div");
    this.onWheel = (e) => {
      // On scroll, only hide the context menu if we're scrolling outside the
      // context menu
      const shouldCloseOnScroll =
        e.type === plasmicIFrameWheelEvent ||
        (e.target instanceof HTMLElement &&
          !hasAncestorElement(e.target, (x) =>
            x.className.includes("ant-dropdown")
          ));
      if (shouldCloseOnScroll && !e.cancelBubble) {
        this.props.onHide();
      }
    };
  }

  componentDidMount() {
    this.root.appendChild(this.container);

    document.addEventListener("keydown", this.onDocumentKeyDown);
    document.addEventListener("click", this.onClick, { capture: true });
    document.addEventListener("wheel", this.onWheel);
    document.addEventListener(plasmicIFrameWheelEvent, this.onWheel);
    document.addEventListener(plasmicIFrameMouseDownEvent, this.props.onHide);
  }

  componentWillUnmount() {
    this.root.removeChild(this.container);

    document.removeEventListener("keydown", this.onDocumentKeyDown);
    document.removeEventListener("wheel", this.onWheel);
    document.removeEventListener("click", this.onClick, { capture: true });
    document.removeEventListener(plasmicIFrameWheelEvent, this.onWheel);
    document.removeEventListener(
      plasmicIFrameMouseDownEvent,
      this.props.onHide
    );
  }

  // We need to do this because in React 17, something in rc-dropdown stops propagating the click events.
  // Also if we immediately call onHide then the actual menu item action won't have a chance to fire *its* onClick, so
  // we wait to hide until after everything is done (since this is firing in the capture phase).
  //
  // This whole anomaly happens only in the main canvas right-clicks.
  onClick = () => {
    setTimeout(() => this.props.onHide?.(), 0);
  };

  onDocumentKeyDown = (e: KeyboardEvent) => {
    // noinspection JSDeprecatedSymbols
    if (e.keyCode === 27 /* ESCAPE */) {
      this.props.onHide();
    }
  };

  onDropdownVisible = (visible?: boolean) => {
    if (!visible) {
      this.props.onHide();
    }
  };

  render() {
    const popup = (
      <Dropdown
        visible={true}
        onVisibleChange={this.onDropdownVisible}
        overlay={this.props.overlay}
        trigger={["click"]}
      >
        <div
          className={styles.ContextMenu}
          style={{
            left: `${this.props.pageX}px`,
            top: `${this.props.pageY}px`,
          }}
        />
      </Dropdown>
    );
    return ReactDOM.createPortal(popup, this.container);
  }
}

interface WithContextMenuProps {
  overlay?:
    | React.ReactElement<MenuProps>
    | (() => React.ReactElement<MenuProps>);
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
  onClick?: (e: React.MouseEvent) => void;
}
interface WithContextMenuState {
  event?: MouseEvent;
}

/**
 * Component that wraps its children in a div that captures onContextMenu and
 * displays the overlay context menu in props.
 */
export class WithContextMenu extends React.Component<
  WithContextMenuProps,
  WithContextMenuState
> {
  constructor(props: WithContextMenuProps) {
    super(props);
    this.state = {};
  }
  render() {
    const { overlay, children, as, ...rest } = this.props;
    if (!overlay) {
      return React.createElement(as || "div", rest, children);
    } else {
      return React.createElement(
        as || "div",
        { ...rest, onContextMenu: this.onContextMenu },
        children,
        this.state.event && (
          <ContextMenu
            pageX={this.state.event.pageX}
            pageY={this.state.event.pageY}
            overlay={this.createMenu()}
            onHide={this.onHide}
          />
        )
      );
    }
  }

  private onContextMenu = (event: React.MouseEvent) => {
    this.setState({ event: event.nativeEvent });
    event.preventDefault();
  };

  private onHide = () => {
    this.setState({ event: undefined });
  };

  private createMenu = () => {
    const overlay = ensure(this.props.overlay, "Only called if overlay exists");
    const menu = L.isFunction(overlay) ? overlay() : overlay;
    return React.cloneElement(menu, {
      onClick: (param) => {
        if (menu.props.onClick) {
          menu.props.onClick(param);
        }
        this.setState({ event: undefined });
      },
    });
  };
}
