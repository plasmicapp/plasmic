import {
  DockviewApi,
  DockviewReact,
  IDockviewReactProps,
  themeLight,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import React from "react";

/** Shared dock settings; main.sass styles the `studio-dock` tab strip. */
export function StudioDock(props: IDockviewReactProps) {
  return (
    <DockviewReact
      theme={themeLight}
      disableDnd={true}
      disableFloatingGroups={true}
      announcements={false}
      getTabContextMenuItems={noTabContextMenuItems}
      {...props}
    />
  );
}

const noTabContextMenuItems = () => [];

export interface DockPanelSpec {
  key: string;
  /** Names the panel's aria region; falls back to the key. */
  title?: string;
}

/** Sync panel order and selection while preserving mounted editors. */
export function useDockPanels(
  api: DockviewApi | undefined,
  panels: DockPanelSpec[],
  activeKey?: string,
) {
  const signature = panels.map((p) => p.key).join(",");
  const panelsRef = React.useRef(panels);
  panelsRef.current = panels;

  React.useEffect(() => {
    if (!api) {
      return;
    }
    const specs = panelsRef.current;
    for (const panel of [...api.panels]) {
      if (!specs.some((p) => p.key === panel.id)) {
        api.removePanel(panel);
      }
    }
    for (const { key, title } of specs) {
      if (!api.getPanel(key)) {
        api.addPanel({ id: key, title, component: "tab", params: { key } });
      }
    }
    // Front to back, so a panel moved forward always comes from behind the settled prefix.
    specs.forEach(({ key }, index) => {
      const panel = api.getPanel(key);
      if (panel && api.panels[index] !== panel) {
        panel.api.moveTo({ index, skipSetActive: true });
      }
    });
    if (!activeKey) {
      return;
    }
    const panel = api.getPanel(activeKey);
    // A moved panel can retain a stale api.isActive flag. Use the dock selection.
    if (panel && api.activePanel !== panel) {
      panel.api.setActive();
    }
  }, [api, activeKey, signature]);
}
