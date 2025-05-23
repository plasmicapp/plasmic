import { useContextMenu } from "@/wab/client/components/ContextMenu";
import { ArenaContextMenu } from "@/wab/client/components/sidebar-tabs/ProjectPanel/ArenaContextMenu";
import { NavigationDropdown } from "@/wab/client/components/sidebar-tabs/ProjectPanel/NavigationDropdown";
import { useResizableHandle } from "@/wab/client/hooks/useResizableHandle";
import {
  DefaultArenaSwitcherProps,
  PlasmicArenaSwitcher,
} from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicArenaSwitcher";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { useInteractOutsideWithCommonExceptions } from "@/wab/commons/components/OnClickAway";
import { useSignalListener } from "@/wab/commons/components/use-signal-listener";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import {
  AnyArena,
  getArenaName,
  isComponentArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import { Popover } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

export type ArenaSwitcherProps = DefaultArenaSwitcherProps;

const ArenaSwitcher = observer(function ArenaSwitcher(
  props: ArenaSwitcherProps
) {
  const studioCtx = useStudioCtx();
  const [visible, setVisible] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  useSignalListener(
    studioCtx.showProjectPanelRequested,
    () => {
      setVisible(true);
      setTimeout(() => {
        studioCtx.focusOnProjectSearchInput();
      }, 100);
    },
    [studioCtx]
  );

  useInteractOutsideWithCommonExceptions({
    ref: popoverRef,
    isDisabled: !visible,
    exceptSelectors: ["#proj-nav-button", ".left-pane-resizer"],
    onInteractOutside: (_e) => {
      if (!resizingState.current) {
        setVisible(false);
      }
    },
  });

  const currentArena = studioCtx.currentArena as AnyArena;
  const currentArenaName = currentArena ? getArenaName(currentArena) : "";

  const [popoverWidth, setPopoverWidth] = React.useState(300);
  const { onDrag, onDragStart, onDragStop, resizingState } = useResizableHandle(
    {
      panelRef: popoverRef,
      onChange: (width) => {
        setPopoverWidth(width);
      },
    }
  );

  const contextMenuProps = useContextMenu({
    menu: (
      <ArenaContextMenu
        studioCtx={studioCtx}
        arena={currentArena}
        onSelectRename={undefined /* TODO: implement rename here */}
      />
    ),
  });

  return (
    <Popover
      placement="bottomLeft"
      content={
        <>
          <NavigationDropdown
            ref={popoverRef}
            onClose={() => {
              setVisible(false);
            }}
          />
          <XDraggable onStart={onDragStart} onDrag={onDrag} onStop={onDragStop}>
            <div className="left-pane-resizer auto-pointer-events" />
          </XDraggable>
        </>
      }
      overlayInnerStyle={{ width: popoverWidth, borderRadius: 12 }}
      open={visible}
      id="proj-nav-popover"
      overlayClassName={"ant-popover--dropdown-like"}
    >
      <PlasmicArenaSwitcher
        onClick={() => {
          studioCtx.showProjectPanel();
        }}
        arenaType={
          isComponentArena(currentArena)
            ? "component"
            : isPageArena(currentArena)
            ? "page"
            : "mixed"
        }
        root={{
          children: (
            <span
              className="fill-width text-ellipsis inline-block"
              style={{ maxWidth: 300 }}
            >
              {currentArenaName}
            </span>
          ),
        }}
        id="proj-nav-button"
        {...contextMenuProps}
        {...props}
      />
    </Popover>
  );
});

export default ArenaSwitcher;
