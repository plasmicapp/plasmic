import sty from "@/wab/client/components/BottomPanel.module.sass";
import { BottomPanelContent } from "@/wab/client/components/BottomPanelContent";
import {
  BottomPanelAlignment,
  BottomPanelSlotId,
  BottomPanelTabConfig,
  BottomPanelTabProps,
  tabTitle,
} from "@/wab/client/components/BottomPanelState";
import { EditableSession } from "@/wab/client/components/editor-sessions/editor-session";
import {
  StudioDock,
  useDockPanels,
} from "@/wab/client/components/studio/studio-dock";
import { IFrameAwareDropdownMenu } from "@/wab/client/components/widgets";
import { Icon } from "@/wab/client/components/widgets/Icon";
import IconButton from "@/wab/client/components/widgets/IconButton";
import { useResizableHandle } from "@/wab/client/hooks/useResizableHandle";
import DotBulletIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__DotBullet";
import ChevronDownSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronDownSvg";
import ChevronLeftSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronLeftSvg";
import ChevronRightSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__ChevronRightSvg";
import DotsHorizontalSvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__DotsHorizontalSvg";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { ensure } from "@/wab/shared/common";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import classNames from "classnames";
import {
  DockviewApi,
  DockviewReadyEvent,
  IDockviewPanelProps,
} from "dockview-react";
import { observer } from "mobx-react";
import React from "react";
import { FocusScope } from "react-aria";
import { createPortal } from "react-dom";

export const BottomPanelTabContext = React.createContext<
  BottomPanelTabConfig | undefined
>(undefined);

export function useBottomPanel() {
  return useStudioCtx().bottomPanel;
}

/** The active alignment slot adopts the panel's DOM. */
export const BottomPanelSlot = observer(function BottomPanelSlot(props: {
  slot: BottomPanelSlotId;
}) {
  const { activeSlot, host } = useBottomPanel();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (
      props.slot === activeSlot &&
      ref.current &&
      host.parentElement !== ref.current
    ) {
      ref.current.appendChild(host);
    }
  }, [props.slot, activeSlot, host]);
  return <div style={{ display: "contents" }} ref={ref} />;
});

/** The panel's actions, with new tabs nested under the tab that opens them. */
export function useBottomPanelActions() {
  const state = useBottomPanel();
  const enclosingTab = React.useContext(BottomPanelTabContext);
  return React.useMemo(() => {
    const {
      open,
      activate,
      saveAndClose,
      close,
      performAndDiscard,
      discard,
      expand,
      collapse,
    } = state;
    return {
      open: (
        id: string,
        props: BottomPanelTabProps,
        options?: { expand?: boolean },
      ) =>
        open(
          id,
          {
            parentId: enclosingTab?.id,
            ...props,
            // A draft under another draft closes with its parent, not the canvas selection.
            selection: enclosingTab?.session ? undefined : props.selection,
          },
          options,
        ),
      activate,
      saveAndClose,
      close,
      performAndDiscard,
      discard,
      expand,
      collapse,
    };
  }, [state, enclosingTab]);
}

export const BottomPanelButtons = observer(function BottomPanelButtons(props: {
  children?: React.ReactNode;
}) {
  const config = ensure(
    React.useContext(BottomPanelTabContext),
    "BottomPanelButtons can only be used in a bottom panel tab",
  );

  return (
    <config.buttonsTunnel.In>
      <fieldset
        disabled={config.session?.pending}
        style={{ display: "contents" }}
      >
        {props.children}
      </fieldset>
    </config.buttonsTunnel.In>
  );
});

const BottomPanelTabContent = observer(function BottomPanelTabContent(
  props: IDockviewPanelProps<{ key: string }>,
) {
  const state = useBottomPanel();
  const config = state.stack.find((entry) => entry.id === props.params.key);
  if (!config) {
    return null;
  }
  return (
    <div
      className={classNames(sty.TabBody, {
        [sty.TabBodyCollapsed]: !state.isExpanded,
      })}
      data-test-id={config["data-test-id"]}
    >
      <BottomPanelTabContext.Provider value={config}>
        <FocusScope autoFocus>
          <div className={sty.TabBodyContent}>
            <BottomPanelSessionContent config={config} />
          </div>
        </FocusScope>
      </BottomPanelTabContext.Provider>
    </div>
  );
});

export const SessionStatus = observer(function SessionStatus({
  session,
}: {
  session: EditableSession;
}) {
  return (
    <>
      {session.error && <div role="alert">{session.error}</div>}
      {session.pending && <div role="status">Saving…</div>}
    </>
  );
});

export const BottomPanelSessionContent = observer(
  function BottomPanelSessionContent({
    config,
  }: {
    config: BottomPanelTabConfig;
  }) {
    return (
      <>
        {config.session && <SessionStatus session={config.session} />}
        <div
          style={{ height: "100%" }}
          {...{ inert: config.session?.pending ? "" : undefined }}
        >
          <BottomPanelContent config={config} />
        </div>
      </>
    );
  },
);

export const BottomPanelHeader = observer(function BottomPanelHeader() {
  const state = useBottomPanel();
  const panel = useBottomPanelActions();
  const root = state.stack[0];
  const active = state.stack[state.stack.length - 1];
  const navigateTo = (id: string) => {
    if (state.isExpanded) {
      void panel.activate(id);
    }
  };
  const toggle = state.isExpanded ? panel.collapse : panel.expand;
  const handleHeaderClick = (event: React.MouseEvent) => {
    if (!(event.target as HTMLElement).closest("button")) {
      toggle();
    }
  };

  return (
    <div
      className={sty.Header}
      data-test-id="bottom-panel-header"
      onClick={handleHeaderClick}
    >
      {root && (
        <div
          className={sty.Breadcrumbs}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className={classNames(sty.RootCrumb, {
              [sty.RootCrumbInteractive]:
                state.isExpanded && state.stack.length > 1,
            })}
          >
            {state.stack.length > 1 && (
              <button
                type="button"
                className={sty.CrumbBack}
                aria-label="Back"
                disabled={!state.isExpanded}
                onClick={() =>
                  navigateTo(state.stack[state.stack.length - 2].id)
                }
              >
                <Icon icon={ChevronLeftSvgIcon} />
              </button>
            )}
            {state.stack.length > 1 ? (
              <button
                type="button"
                className={sty.RootCrumbLabel}
                disabled={!state.isExpanded}
                onClick={() => navigateTo(root.id)}
              >
                {root.icon}
                <span>{tabTitle(root)}</span>
              </button>
            ) : (
              <div className={sty.RootCrumbLabel}>
                {root.icon}
                <span>{tabTitle(root)}</span>
              </div>
            )}
          </div>
          {state.stack.slice(1).map((entry) => {
            const isActive = entry === active;
            return (
              <React.Fragment key={entry.id}>
                <Icon
                  className={sty.CrumbSeparator}
                  icon={ChevronRightSvgIcon}
                />
                {isActive ? (
                  <div className={sty.CrumbActive}>
                    {entry.icon && (
                      <span className={sty.CrumbActiveIcon}>{entry.icon}</span>
                    )}
                    <span className={sty.CrumbTitle}>{tabTitle(entry)}</span>
                    {entry.trailingIcon && (
                      <span className={sty.CrumbTrailingIcon}>
                        {entry.trailingIcon}
                      </span>
                    )}
                    {entry.session?.dirty && (
                      <span className={sty.UnsavedChanges}>
                        <Icon
                          className={sty.UnsavedChangesDot}
                          icon={DotBulletIcon}
                        />
                        <span>Unsaved changes</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={sty.Crumb}
                    disabled={!state.isExpanded}
                    onClick={() => navigateTo(entry.id)}
                  >
                    {entry.icon}
                    <span className={sty.CrumbTitle}>{tabTitle(entry)}</span>
                    {entry.trailingIcon && (
                      <span className={sty.CrumbTrailingIcon}>
                        {entry.trailingIcon}
                      </span>
                    )}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className={sty.HeaderToggle}
        aria-label={state.isExpanded ? "Collapse panel" : "Expand panel"}
        data-test-id="bottom-panel-toggle"
        onClick={toggle}
      />
      <div className={sty.TabActions} data-test-id="bottom-panel-actions">
        <BottomPanelAlignmentToggle />
        {active && <active.buttonsTunnel.Out />}
        <IconButton
          size="small"
          type="clear"
          tooltip={state.isExpanded ? "Collapse panel" : "Expand panel"}
          aria-label={state.isExpanded ? "Collapse panel" : "Expand panel"}
          data-test-id="bottom-panel-collapse"
          onClick={toggle}
        >
          <Icon
            className={classNames(sty.PanelToggleIcon, {
              [sty.PanelToggleIconCollapsed]: !state.isExpanded,
            })}
            icon={ChevronDownSvgIcon}
          />
        </IconButton>
      </div>
    </div>
  );
});

const DOCK_COMPONENTS = {
  tab: BottomPanelTabContent,
};

const ALIGNMENT_OPTIONS: {
  value: BottomPanelAlignment;
  label: string;
}[] = [
  {
    value: "full",
    label: "Fill panel",
  },
  {
    value: "centered",
    label: "Fit between panels",
  },
  {
    value: "auto",
    label: "Auto width",
  },
];

const ALIGNMENT_MENU_ITEMS: NonNullable<MenuProps["items"]> = [
  {
    type: "group",
    label: "PANEL WIDTH",
    children: ALIGNMENT_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
    })),
  },
];

const BottomPanelAlignmentToggle = observer(
  function BottomPanelAlignmentToggle() {
    const state = useBottomPanel();
    return (
      <IFrameAwareDropdownMenu
        overlayClassName={sty.AlignmentDropdown}
        placement="bottomRight"
        menu={
          <Menu
            items={ALIGNMENT_MENU_ITEMS}
            selectedKeys={[state.alignment]}
            onClick={({ key }) =>
              (state.alignment = key as BottomPanelAlignment)
            }
          />
        }
      >
        <IconButton
          className={sty.AlignmentMenuButton}
          size="small"
          type="clear"
          aria-label="Panel width"
          data-test-id="bottom-panel-alignment"
        >
          <Icon icon={DotsHorizontalSvgIcon} />
        </IconButton>
      </IFrameAwareDropdownMenu>
    );
  },
);

const MIN_HEIGHT = 200;
const MAX_HEIGHT_RATIO = 0.7;
const MIN_CANVAS_HEIGHT = 150;
const COLLAPSED_HEIGHT = 41;

function maxHeight(root: HTMLElement | null) {
  const layoutContainer = root?.closest<HTMLElement>(
    ".canvas-editor__center-column, .canvas-editor__outer-main-area",
  );
  const editorArea = root?.closest<HTMLElement>(
    ".canvas-editor__outer-main-area",
  );
  const layoutHeight = layoutContainer?.clientHeight ?? window.innerHeight;
  const editorHeight = editorArea?.clientHeight ?? window.innerHeight;
  return Math.max(
    MIN_HEIGHT,
    Math.min(
      Math.round(layoutHeight * MAX_HEIGHT_RATIO),
      editorHeight - MIN_CANVAS_HEIGHT,
    ),
  );
}

export const BottomPanel = observer(function BottomPanel(props: {
  /** The permanent first tab. */
  rootTab: BottomPanelTabProps & { id: string };
}) {
  const state = useBottomPanel();
  const { host, activeSlot } = state;
  const [api, setApi] = React.useState<DockviewApi | undefined>(undefined);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const { onDragStart, onDrag, onDragStop } = useResizableHandle({
    panelRef: rootRef,
    dimension: "height",
    invert: true,
    size: state.height,
    minSize: MIN_HEIGHT,
    maxSize: () => maxHeight(rootRef.current),
    onChange: (height) => (state.height = height),
    onStop: (height) => state.commitHeight(height),
  });

  React.useLayoutEffect(() => {
    // Tabs outlive this component, e.g. across full preview mode.
    if (state.stack.length === 0) {
      const { id, ...rootTab } = props.rootTab;
      void state.open(id, rootTab, { expand: false });
    }
  }, []);

  React.useLayoutEffect(() => {
    const onResize = () => {
      state.syncViewportWidth();
      state.height = Math.max(
        MIN_HEIGHT,
        Math.min(state.height, maxHeight(rootRef.current)),
      );
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [state, activeSlot]);

  const hasTabs = state.stack.length > 0;
  const isBound = state.stack.some((entry) => entry.bound);

  const specs = React.useMemo(
    () =>
      state.stack.map((entry) => ({ key: entry.id, title: tabTitle(entry) })),
    [state.stack],
  );
  const activeKey = state.stack[state.stack.length - 1]?.id;
  useDockPanels(api, specs, activeKey);

  // Removing the focused tab sends no blur, so re-derive focus on each stack change.
  React.useEffect(() => {
    state.focused = !!rootRef.current?.contains(document.activeElement);
  }, [activeKey]);

  return createPortal(
    // Keep the dock mounted even when there are no tabs (just hidden) -- unmounting DockviewReact
    // with live panels makes dockview throw "resource already disposed" during teardown.
    <div
      ref={rootRef}
      className={classNames(sty.Root, "bottom-panel", {
        [sty.Centered]: activeSlot === "center",
        [sty.Bound]: isBound,
      })}
      style={{
        height: state.isExpanded ? state.height : COLLAPSED_HEIGHT,
        display: hasTabs ? undefined : "none",
      }}
      data-test-id="bottom-panel"
      data-expanded={state.isExpanded}
      data-bound={isBound}
      onFocus={() => (state.focused = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          state.focused = false;
        }
      }}
    >
      {state.isExpanded && (
        <XDraggable onStart={onDragStart} onDrag={onDrag} onStop={onDragStop}>
          <div className={sty.Resizer} />
        </XDraggable>
      )}
      <BottomPanelHeader />
      <div className={sty.Dock}>
        <StudioDock
          className="studio-dock"
          components={DOCK_COMPONENTS}
          onReady={(event: DockviewReadyEvent) => setApi(event.api)}
          // Keep inactive tabs mounted so editor state isn't lost on tab switch.
          defaultRenderer="always"
        />
      </div>
    </div>,
    host,
  );
});
