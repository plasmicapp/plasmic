import sty from "@/wab/client/components/studio/arenas/GhostFrame.module.sass";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { plasmicIFrameMouseDownEvent } from "@/wab/client/definitions/events";
import {
  useScaledElementRef,
  useZoomStyledRef,
} from "@/wab/client/hooks/useScaledElementRef";
import PlusIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Plus";
import { cx, mkShortId } from "@/wab/common";
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

const GHOST_FRAME_MIN_DIM = 80;
const GHOST_FRAME_MAX_DIM = 1200;
const GHOST_FRAME_DEFAULT_DIM = 300;

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
    width: widthProp = GHOST_FRAME_DEFAULT_DIM,
    height: heightProp = GHOST_FRAME_DEFAULT_DIM,
    ...rest
  } = props;

  const height = Math.max(
    GHOST_FRAME_MIN_DIM,
    Math.min(GHOST_FRAME_MAX_DIM, heightProp)
  );
  const width = Math.max(
    GHOST_FRAME_MIN_DIM,
    Math.min(GHOST_FRAME_MAX_DIM, widthProp)
  );

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

  let content = (
    <button
      ref={plusButtonRef}
      className={cx(sty.root, className)}
      style={{
        ...style,
        height,
        width,
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
