import { Dropdown, Popover, Tooltip } from "antd";
import { isString } from "lodash";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cx, mkShortId } from "../../../../common";
import { plasmicIFrameMouseDownEvent } from "../../../definitions/events";
import {
  useScaledElementRef,
  useZoomStyledRef,
} from "../../../hooks/useScaledElementRef";
import PlusIcon from "../../../plasmic/plasmic_kit/PlasmicIcon__Plus";
import { Icon } from "../../widgets/Icon";
import sty from "./GhostFrame.module.sass";

export type GhostFrameRef = {
  closeMenu: () => void;
};

export const GhostFrame = React.forwardRef(function GhostFrame_(
  props: {
    className?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    tooltip?: React.ReactNode;
    children?: React.ReactNode;
    onClick?: () => void;
    menu?: () => React.ReactElement;
    popover?: () => React.ReactElement;
    "aria-label"?: string;
  },
  ref: React.Ref<GhostFrameRef>
) {
  const {
    tooltip,
    children,
    onClick,
    className,
    style,
    menu,
    popover,
    width = 300,
    height = 300,
    ...rest
  } = props;

  const plusIconSize = 48;
  const plusIconPadding = 20;
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const plusIconRef = useScaledElementRef({
    minZoom: (plusIconSize + plusIconPadding) / Math.min(height, width),
  });

  useZoomStyledRef((zoom) => {
    return {
      borderWidth: `${2 / zoom}px`,
    };
  }, plusButtonRef);

  const menuOverlayClassName = useMemo(() => `_${mkShortId()}`, []);
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = useCallback(() => setShowMenu(false), []);

  useImperativeHandle(ref, () => ({ closeMenu }), [closeMenu]);

  useEffect(() => {
    document.addEventListener(plasmicIFrameMouseDownEvent, closeMenu);
    return () => {
      document.removeEventListener(plasmicIFrameMouseDownEvent, closeMenu);
    };
  }, []);

  useLayoutEffect(() => {
    const getMenuOverlay = document.querySelector(`.${menuOverlayClassName}`);
    if (showMenu) {
      getMenuOverlay?.addEventListener("click", closeMenu);
    }
    return () => {
      getMenuOverlay?.removeEventListener("click", closeMenu);
    };
  }, [showMenu]);

  const actualHeight = Math.max(70, height);
  const actualWidth = Math.max(70, width);

  let content = (
    <button
      ref={plusButtonRef}
      className={cx(sty.root, className)}
      style={{
        ...style,
        height: actualHeight,
        width: actualWidth,
      }}
      aria-label={
        props["aria-label"] ?? (isString(tooltip) ? tooltip : undefined)
      }
      onClick={onClick}
      {...rest}
    >
      {children ?? (
        <span ref={plusIconRef}>
          <Icon
            style={{ height: plusIconSize, width: plusIconSize }}
            icon={PlusIcon}
          />
        </span>
      )}
    </button>
  );

  if (tooltip) {
    content = (
      <Tooltip transitionName="" title={tooltip}>
        {content}
      </Tooltip>
    );
  }

  if (menu) {
    content = (
      <Dropdown
        visible={showMenu}
        overlayClassName={menuOverlayClassName}
        onVisibleChange={(show) => setShowMenu(show)}
        transitionName=""
        overlay={menu}
        trigger={["contextMenu", "click"]}
      >
        {content}
      </Dropdown>
    );
  }

  if (popover) {
    content = (
      <Popover
        content={popover}
        placement="right"
        trigger="click"
        destroyTooltipOnHide
      >
        {content}
      </Popover>
    );
  }

  return content;
});
