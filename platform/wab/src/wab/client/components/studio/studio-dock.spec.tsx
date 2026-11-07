import { useDockPanels } from "@/wab/client/components/studio/studio-dock";
import { renderHook } from "@testing-library/react";
import type { DockviewApi } from "dockview-react";

it("restores the Studio selection even when a moved panel still reports itself active", () => {
  const settings = {
    id: "settings",
    api: { isActive: true, setActive: vi.fn() },
  };
  const design = { id: "style", api: { isActive: true, setActive: vi.fn() } };
  const api = {
    panels: [settings, design],
    activePanel: settings,
    getPanel: (id: string) => [settings, design].find((p) => p.id === id),
  } as unknown as DockviewApi;
  renderHook(() =>
    useDockPanels(api, [{ key: "settings" }, { key: "style" }], "style"),
  );
  expect(design.api.setActive).toHaveBeenCalledOnce();
  expect(settings.api.setActive).not.toHaveBeenCalled();
});
