import { BottomPanelTestProvider as BottomPanelProvider } from "@/wab/client/__testonly__/BottomPanelTestProvider";
import { useBottomPanel } from "@/wab/client/components/BottomPanel";
import { FormDataConnectionPropEditor } from "@/wab/client/components/sidebar-tabs/DataSource/ConnectToDBTable";
import { providesStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { observer } from "mobx-react";
import React from "react";
vi.mock("@/wab/client/components/quick-modals", () => ({
  reactConfirm: vi.fn(),
}));
vi.mock("@/wab/client/components/widgets/Button", () => ({
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
it("opens the form that was requested when both have no saved connection", async () => {
  DEVFLAGS.dockview = true;
  const first = { uuid: "first-form", vsettings: [] } as any;
  const second = { uuid: "second-form", vsettings: [] } as any;
  const CurrentPanel = observer(function CurrentPanel() {
    const state = useBottomPanel();
    const entry = state.stack[state.stack.length - 1];
    return (
      <div data-testid="target">{(entry?.content as any)?.props.tpl.uuid}</div>
    );
  });
  render(
    providesStudioCtx({ site: { components: [] } } as any)(
      <BottomPanelProvider>
        <FormDataConnectionPropEditor
          tpl={first}
          value={undefined}
          env={{}}
          onChange={vi.fn()}
        />
        <FormDataConnectionPropEditor
          tpl={second}
          value={undefined}
          env={{}}
          onChange={vi.fn()}
        />
        <CurrentPanel />
      </BottomPanelProvider>,
    ),
  );
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button")[0]);
  });
  expect(screen.getByTestId("target").textContent).toBe("first-form");
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button")[1]);
  });
  expect(screen.getByTestId("target").textContent).toBe("second-form");
});
