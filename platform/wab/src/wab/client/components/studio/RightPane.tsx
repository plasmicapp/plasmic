import CommentsTab from "@/wab/client/components/comments/CommentsTab";
import { DevContainer } from "@/wab/client/components/dev";
import {
  ComponentOrPageTab,
  StyleTab,
  StyleTabContext,
} from "@/wab/client/components/sidebar-tabs/style-tab";
import sty from "@/wab/client/components/studio/RightPane.module.sass";
import { providesSidebarPopupSetting } from "@/wab/client/components/style-controls/StyleComponent";
import * as widgets from "@/wab/client/components/widgets";
import { useResizableHandle } from "@/wab/client/hooks/useResizableHandle";
import { RightTabKey, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { XDraggable } from "@/wab/commons/components/XDraggable";
import { isPageComponent } from "@/wab/shared/core/components";
import { DEVFLAGS } from "@/wab/shared/devflags";
import cx from "classnames";
import { clamp } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";

interface RightPaneTab {
  key: RightTabKey;
  title: string;
  contents: () => React.ReactNode;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 800;

/** Leave at least half the window for the canvas and the left pane. */
function maxWidth() {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth / 2));
}

/** Resizable right pane with Studio-owned selection and dimensions. */
export const RightPane = observer(function RightPane(props: {
  studioCtx: StudioCtx;
  disabled?: boolean;
}) {
  const { studioCtx, disabled } = props;

  const [hover, setHover] = React.useState(false);
  const width =
    studioCtx.paneSizes.rightWidth == null
      ? undefined
      : clamp(studioCtx.paneSizes.rightWidth, MIN_WIDTH, maxWidth());
  const paneRef = React.useRef<HTMLDivElement>(null);
  const { onDragStart, onDrag, onDragStop } = useResizableHandle({
    panelRef: paneRef,
    invert: true,
    size: width,
    minSize: MIN_WIDTH,
    maxSize: maxWidth,
    onChange: (value) => {
      studioCtx.paneSizes.rightWidth = value;
    },
    onStop: (value) => studioCtx.paneSizes.commitRightWidth(value),
  });

  const focusedViewCtx = studioCtx.focusedViewCtx();
  const focusedOrFirstViewCtx = studioCtx.focusedOrFirstViewCtx();

  const tabs: RightPaneTab[] = [];

  // Element tabs are shown if an artboard is focused
  // and element is selected (not frame)
  if (focusedViewCtx && !studioCtx.focusedFrame()) {
    tabs.push({
      key: RightTabKey.settings,
      title: "Settings",
      contents: () => (
        <StyleTabContext.Provider value={"settings-only"}>
          <StyleTab studioCtx={studioCtx} viewCtx={focusedViewCtx} />
        </StyleTabContext.Provider>
      ),
    });
    tabs.push({
      key: RightTabKey.style,
      title: "Design",
      contents: () => (
        <StyleTabContext.Provider value={"style-only"}>
          <StyleTab studioCtx={studioCtx} viewCtx={focusedViewCtx} />
        </StyleTabContext.Provider>
      ),
    });
  }

  // Page/component tab is shown if an artboard is focused
  // or defaults to the first artboard for dedicated arenas.
  if (focusedOrFirstViewCtx) {
    tabs.push({
      key: RightTabKey.component,
      title: isPageComponent(focusedOrFirstViewCtx.component)
        ? "Page data"
        : "Component data",
      contents: () => (
        <ComponentOrPageTab
          studioCtx={studioCtx}
          viewCtx={focusedOrFirstViewCtx}
        />
      ),
    });
  }

  React.useEffect(() => {
    if (tabs.length === 1) {
      studioCtx.switchRightTab(tabs[0].key);
    }
  }, [tabs.length]);

  React.useEffect(() => {
    const onWindowResize = () => {
      const current = studioCtx.paneSizes.rightWidth;
      if (current != null) {
        studioCtx.paneSizes.rightWidth = clamp(current, MIN_WIDTH, maxWidth());
      }
    };
    window.addEventListener("resize", onWindowResize);
    return () => window.removeEventListener("resize", onWindowResize);
  }, [studioCtx]);

  const showComments = studioCtx.showComments() && studioCtx.showCommentsPanel;

  return providesSidebarPopupSetting({ left: false })(
    <DevContainer
      containerRef={paneRef}
      className={cx({
        "canvas-editor__right-pane": true,
        dimfg: true,
        monochrome: !hover,
      })}
      style={DEVFLAGS.dockview && width != null ? { width } : undefined}
      showControls={studioCtx.showDevControls}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {disabled && !studioCtx.showCommentsPanel && (
        <div className="canvas-editor__disable-right-pane" />
      )}
      {DEVFLAGS.dockview && (
        <XDraggable onStart={onDragStart} onDrag={onDrag} onStop={onDragStop}>
          <div className={sty.Resizer} />
        </XDraggable>
      )}
      {showComments && <CommentsTab />}
      {!showComments && (
        <widgets.Tabs
          onSwitch={(tabKey: RightTabKey) => studioCtx.switchRightTab(tabKey)}
          tabKey={studioCtx.rightTabKey}
          useDefaultClasses={false}
          tabBarClassName="hilite-tabs"
          tabClassName="hilite-tab"
          activeTabClassName="hilite-tab--active"
          tabs={tabs.map(
            (tab) =>
              new widgets.Tab({
                name: tab.title,
                key: tab.key,
                contents: tab.contents,
              }),
          )}
        />
      )}
    </DevContainer>,
  );
});
