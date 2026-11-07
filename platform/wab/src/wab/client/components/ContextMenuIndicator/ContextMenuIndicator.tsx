import { MenuType, useContextMenu } from "@/wab/client/components/ContextMenu";
import styles from "@/wab/client/components/ContextMenuIndicator/ContextMenuIndicator.module.scss";
import {
  DataDropTargetHandlers,
  useDataDropTarget,
} from "@/wab/client/components/sidebar-tabs/DataBinding/data-drop";
import MenuButton from "@/wab/client/components/widgets/MenuButton";
import {
  DefaultContextMenuIndicatorProps,
  PlasmicContextMenuIndicator,
} from "@/wab/client/plasmic/plasmic_kit_context_menu_indicator/PlasmicContextMenuIndicator";
import { mergeRefs } from "@/wab/commons/components/ReactUtil";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { Tooltip } from "antd";
import cn from "classnames";
import * as React from "react";
import { ReactNode, createContext, useState } from "react";
import * as Signals from "signals";

function createContextMenuContext() {
  return {
    onClickSignal: new Signals.Signal(),
    onPointerDownSignal: new Signals.Signal(),
    onPointerEnterSignal: new Signals.Signal(),
    onPointerLeaveSignal: new Signals.Signal(),
    useDynamicValue: () => {},
    setOpenTooltip: (state: undefined | boolean) => {},
  };
}

export const ContextMenuContext = createContext(createContextMenuContext());

export interface ContextMenuIndicatorProps extends DefaultContextMenuIndicatorProps {
  /**
   * Tooltip shown when hovering the green dynamic value button.
   * Defaults to "Use dynamic value".
   */
  tooltip?: ReactNode;
  /** Click listener for the green dynamic value button. */
  onIndicatorClickDefault?: () => void;
  /** Menu to show on context menu indicator (3 dot icon). */
  menu?: MenuType;
  /** Whether to show the menu when right-clicking the children. */
  showMenuOnRightClick?: boolean;
  /** Whether to show the green dynamic value button and highlight effect. */
  showDynamicValueButton?: boolean;
  style?: React.CSSProperties;
  className?: string;
  dataDropTarget?: DataDropTargetHandlers;
}

/**
 * Shows a context menu indicator (usually 3 dot icon) and
 * an optional green dynamic value button and highlight effect.
 */
function ContextMenuIndicator_(
  {
    menu,
    onIndicatorClickDefault,
    tooltip = "Use dynamic value",
    showDynamicValueButton = false,
    showMenuOnRightClick = false,
    style,
    className,
    dataDropTarget: dataDropTargetProp,
    ...props
  }: ContextMenuIndicatorProps,
  ref: HTMLElementRefOf<"div">,
) {
  const dataDropTarget = DEVFLAGS.dockview ? dataDropTargetProp : undefined;
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = React.useMemo(
    () => mergeRefs<HTMLDivElement>(ref, rootRef),
    [ref],
  );
  const dropState = useDataDropTarget({
    ref: rootRef,
    handlers: dataDropTarget,
  });
  const [openTooltip, setOpenTooltip] = useState<boolean | undefined>(
    undefined,
  );
  const [ctx] = useState(createContextMenuContext());
  ctx.setOpenTooltip = setOpenTooltip;
  ctx.useDynamicValue = onIndicatorClickDefault ?? (() => {});
  const contextMenuProps = useContextMenu({
    menu: showMenuOnRightClick ? menu : undefined,
  });
  const indicator = (
    <PlasmicContextMenuIndicator
      root={{
        ref: mergedRef,
        style,
        tabIndex: dataDropTarget ? -1 : undefined,
        className: cn(className, {
          [styles.dataDropTarget]:
            dropState.isDragging && dropState.acceptance === true,
          [styles.dataDropTargetHovered]:
            dropState.isHovered && dropState.acceptance === true,
          [styles.dataDropTargetRejected]:
            dropState.isHovered && typeof dropState.acceptance === "string",
        }),
        ...contextMenuProps,
      }}
      {...props}
      contextMenu={
        menu && (
          <div className={"baseline-friendly-centered-block-container"}>
            <MenuButton
              menu={menu}
              // Make it fit within the small right margin
              style={{ paddingLeft: 0, paddingRight: 0, width: 18 }}
            />
          </div>
        )
      }
      contextMenuIndicatorInner={{
        wrap: (node) =>
          !showDynamicValueButton ? null : (
            <Tooltip title={openTooltip === false ? null : tooltip}>
              {node}
            </Tooltip>
          ),
        props: {
          menuIndicator: {
            onPointerEnter: () => ctx.onPointerEnterSignal.dispatch(),
            onPointerLeave: () => ctx.onPointerLeaveSignal.dispatch(),
            onPointerDown: () => ctx.onPointerDownSignal.dispatch(),
            onClick: () => {
              ctx.onClickSignal.dispatch();
              if (ctx.onClickSignal.getNumListeners() === 0) {
                onIndicatorClickDefault?.();
              }
            },
          },
        },
      }}
      // Don't display contextMenuContainer if there's no menu,
      // as it can block clicks sometimes
      contextMenuContainer={
        menu
          ? undefined
          : {
              style: { display: "none" },
            }
      }
    />
  );
  return (
    <ContextMenuContext.Provider value={ctx}>
      {typeof dropState.acceptance === "string" ? (
        <Tooltip
          title={dropState.acceptance}
          open={dropState.isHovered}
          overlayStyle={{ pointerEvents: "none" }}
        >
          {indicator}
        </Tooltip>
      ) : (
        indicator
      )}
    </ContextMenuContext.Provider>
  );
}

const ContextMenuIndicator = React.forwardRef(ContextMenuIndicator_);
export default ContextMenuIndicator;
