import { DataBrowseContent } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel";
import { act, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import React from "react";

const mocks = vi.hoisted(() => ({
  viewCtx: undefined as any,
  panelContext: undefined as any,
}));
vi.mock("@/wab/client/components/BottomPanel", async () => {
  const React = await import("react");
  mocks.panelContext = React.createContext(0);
  return {
    BottomPanelTabContext: React.createContext(undefined),
    useBottomPanelActions: () => {
      React.useContext(mocks.panelContext);
      return { collapse: vi.fn() };
    },
  };
});
vi.mock("@/wab/client/contexts/StudioContexts", () => ({
  useViewCtxMaybe: () => mocks.viewCtx,
}));
vi.mock("@/wab/client/components/sidebar-tabs/DataBinding/DataPicker", () => ({
  default: ({ data }: { data: Record<string, any> }) => (
    <div>{Object.keys(data.$q).join(",")}</div>
  ),
}));

it("reuses the browse environment until canvas evaluation or clone selection changes", () => {
  const evaluation = observable.box(1);
  const cloneKey = observable.box("first");
  const tpl = { uuid: "tpl" };
  const component = { uuid: "component", tplTree: tpl };
  let data = { $q: { oldQuery: {} } } as Record<string, any>;
  mocks.viewCtx = {
    focusedTpls: () => [tpl],
    currentComponent: () => component,
    arenaFrame: () => ({ uuid: "frame" }),
    focusedCloneKey: () => cloneKey.get(),
    customFunctionsSchema: () => undefined,
    getCanvasEnvForTpl: vi.fn(() => {
      cloneKey.get();
      return data;
    }),
    get renderCount() {
      return evaluation.get();
    },
  };
  const children = <DataBrowseContent />;
  const browse = render(
    <mocks.panelContext.Provider value={0}>
      {children}
    </mocks.panelContext.Provider>,
  );
  expect(screen.getByText("oldQuery")).toBeTruthy();
  browse.rerender(
    <mocks.panelContext.Provider value={1}>
      {children}
    </mocks.panelContext.Provider>,
  );
  expect(mocks.viewCtx.getCanvasEnvForTpl).toHaveBeenCalledTimes(1);
  act(() => {
    data = { $q: { renamedQuery: {} } };
    runInAction(() => evaluation.set(2));
  });
  expect(screen.getByText("renamedQuery")).toBeTruthy();
  expect(screen.queryByText("oldQuery")).toBeNull();
  expect(mocks.viewCtx.getCanvasEnvForTpl).toHaveBeenCalledTimes(2);
  act(() => {
    data = { $q: { otherClone: {} } };
    runInAction(() => cloneKey.set("second"));
  });
  expect(screen.getByText("otherClone")).toBeTruthy();
  expect(mocks.viewCtx.getCanvasEnvForTpl).toHaveBeenCalledTimes(3);
});
