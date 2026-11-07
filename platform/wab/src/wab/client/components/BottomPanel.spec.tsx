import { BottomPanelTestProvider as BottomPanelProvider } from "@/wab/client/__testonly__/BottomPanelTestProvider";
import {
  BottomPanel,
  BottomPanelHeader,
  BottomPanelSlot,
  BottomPanelTabContext,
  useBottomPanel,
  useBottomPanelActions,
} from "@/wab/client/components/BottomPanel";
import {
  BottomPanelState,
  BottomPanelTabConfig,
} from "@/wab/client/components/BottomPanelState";
import { EditorSession } from "@/wab/client/components/editor-sessions/editor-session";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensure } from "@/wab/shared/common";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";

describe("BottomPanelProvider", () => {
  let actions: ReturnType<typeof useBottomPanelActions>;
  let nestedActions: ReturnType<typeof useBottomPanelActions>;
  let stack: BottomPanelTabConfig[] = [];
  let isExpanded = false;
  function Nested() {
    nestedActions = useBottomPanelActions();
    return null;
  }
  const Harness = observer(function Harness() {
    actions = useBottomPanelActions();
    const state = useBottomPanel();
    stack = state.stack;
    isExpanded = state.isExpanded;
    return (
      <>
        <BottomPanelHeader />
        {stack[0] && (
          <BottomPanelTabContext.Provider value={stack[0]}>
            <Nested />
          </BottomPanelTabContext.Provider>
        )}
      </>
    );
  });
  beforeEach(() => {
    DEVFLAGS.dockview = true;
  });
  const mount = () =>
    render(
      <BottomPanelProvider>
        <Harness />
      </BottomPanelProvider>,
    );
  const open = (id: string, parentId?: string) =>
    act(async () => {
      await actions.open(id, { title: id, parentId });
    });
  const ids = () => stack.map((entry) => entry.id);

  it("replaces siblings and derives nested breadcrumbs", async () => {
    mount();
    await open("data");
    await act(async () => {
      await nestedActions.open("query", { title: "query" });
    });
    await open("picker", "query");
    expect(ids()).toEqual(["data", "query", "picker"]);
    await open("other");
    expect(ids()).toEqual(["data", "other"]);
  });
  it("keeps independent flag-off modals", async () => {
    DEVFLAGS.dockview = false;
    mount();
    await open("first");
    await open("second");
    await open("third");
    act(() => {
      actions.discard("second");
    });
    expect(ids()).toEqual(["first", "third"]);
  });
  it("shows draft state without view registration and preserves it on collapse", async () => {
    mount();
    await open("data");
    const write = vi.fn(() => undefined);
    const session = new EditorSession({
      initial: "old",
      prepare: () => ({ apply: write }),
    });
    await act(async () => {
      await actions.open("query", { title: "query", session });
    });
    act(() => {
      session.setDraft("new");
      actions.collapse();
    });
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect(session.draft).toBe("new");
    expect(isExpanded).toBe(false);
    expect(write).not.toHaveBeenCalled();
    await act(async () => {
      await actions.activate("data", { expand: false });
    });
    expect(isExpanded).toBe(false);
    expect(write).toHaveBeenCalledOnce();
    expect(ids()).toEqual(["data"]);
  });
  it("reopening a target preserves its live draft", async () => {
    mount();
    await open("data");
    const write = vi.fn(() => undefined);
    const session = new EditorSession({
      initial: "old",
      prepare: () => ({ apply: write }),
    });
    await act(async () => {
      await actions.open("query", { session });
    });
    session.setDraft("unsaved");
    await act(async () => {
      await actions.open("query", {
        session: new EditorSession({
          initial: "stale",
          prepare: () => ({ apply: write }),
        }),
      });
    });
    expect(stack[1].session).toBe(session);
    expect(session.draft).toBe("unsaved");
    expect(write).not.toHaveBeenCalled();
  });
  it("ordinary close saves and Cancel discards", async () => {
    mount();
    await open("data");
    const write = vi.fn(() => undefined);
    const session = new EditorSession({
      initial: "old",
      prepare: () => ({ apply: write }),
    });
    await act(async () => {
      await actions.open("query", { title: "query", session });
    });
    session.setDraft("new");
    await act(async () => {
      await actions.close("query");
    });
    expect(write).toHaveBeenCalledOnce();
    await act(async () => {
      await actions.open("query", { title: "query", session });
    });
    session.setDraft("discard me");
    act(() => {
      actions.discard("query");
    });
    expect(write).toHaveBeenCalledOnce();
  });
  it("clears focus-within when the focused tab is removed without a blur", async () => {
    const state = new BottomPanelState();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    render(
      <BottomPanelProvider state={state}>
        <Harness />
        <BottomPanelSlot slot="bottom" />
        <BottomPanel rootTab={{ id: "data", title: "data" }} />
      </BottomPanelProvider>,
    );
    await open("query", "data");
    const back = ensure(
      document.querySelector<HTMLButtonElement>(
        '[data-test-id="bottom-panel"] button[aria-label="Back"]',
      ),
      "Missing back button",
    );
    act(() => back.focus());
    expect(state.focused).toBe(true);
    act(() => {
      actions.discard("query");
    });
    expect(state.focused).toBe(false);
  });
  it("only toggles from the clickable header area", async () => {
    let headerActions: ReturnType<typeof useBottomPanelActions> | undefined;
    let headerExpanded = false;

    const HeaderHarness = observer(function HeaderHarness() {
      headerActions = useBottomPanelActions();
      const state = useBottomPanel();
      headerExpanded = state.isExpanded;
      const active = state.stack[state.stack.length - 1];
      return (
        <>
          <BottomPanelHeader />
          {active && (
            <active.buttonsTunnel.In>
              <button type="button" data-testid="header-action">
                Action
              </button>
            </active.buttonsTunnel.In>
          )}
        </>
      );
    });

    const header = render(
      <BottomPanelProvider>
        <HeaderHarness />
      </BottomPanelProvider>,
    );
    await act(async () =>
      ensure(headerActions, "Header harness has not rendered").open(
        "data",
        { title: "Data" },
        { expand: false },
      ),
    );

    const toggle = ensure(
      document.querySelector('[data-test-id="bottom-panel-toggle"]'),
      "Missing bottom panel header toggle",
    );
    const iconToggle = ensure(
      document.querySelector('[data-test-id="bottom-panel-collapse"]'),
      "Missing bottom panel icon toggle",
    );
    const rootPill = () =>
      screen.getByText("Data").parentElement?.parentElement;
    expect(headerExpanded).toBe(false);
    expect(toggle.getAttribute("aria-label")).toBe("Expand panel");
    expect(iconToggle.getAttribute("aria-label")).toBe("Expand panel");
    expect(iconToggle.querySelector("svg")?.className.baseVal).toContain(
      "PanelToggleIconCollapsed",
    );
    expect(rootPill()?.className).not.toContain("RootCrumbInteractive");

    fireEvent.click(screen.getByText("Data"));
    fireEvent.click(screen.getByTestId("header-action"));
    expect(headerExpanded).toBe(false);

    fireEvent.click(
      ensure(
        header.container.querySelector("[data-test-id=bottom-panel-actions]"),
        "Header actions have not rendered",
      ),
    );
    expect(headerExpanded).toBe(true);
    fireEvent.click(toggle);
    expect(headerExpanded).toBe(false);

    fireEvent.click(toggle);
    expect(headerExpanded).toBe(true);
    expect(toggle.getAttribute("aria-label")).toBe("Collapse panel");
    expect(iconToggle.getAttribute("aria-label")).toBe("Collapse panel");
    expect(iconToggle.querySelector("svg")?.className.baseVal).not.toContain(
      "PanelToggleIconCollapsed",
    );
    expect(rootPill()?.className).not.toContain("RootCrumbInteractive");

    await act(async () =>
      ensure(headerActions, "Header harness has not rendered").open("query", {
        title: "Query",
        parentId: "data",
      }),
    );
    expect(rootPill()?.className).toContain("RootCrumbInteractive");

    fireEvent.click(toggle);
    expect(headerExpanded).toBe(false);
    expect(toggle.getAttribute("aria-label")).toBe("Expand panel");
    expect(iconToggle.getAttribute("aria-label")).toBe("Expand panel");
    expect(rootPill()?.className).not.toContain("RootCrumbInteractive");

    fireEvent.click(iconToggle);
    expect(headerExpanded).toBe(true);
  });
});

describe("BottomPanelState.watch", () => {
  const tplA = { uuid: "a" };
  const tplB = { uuid: "b" };
  function setup() {
    DEVFLAGS.dockview = true;
    const focusedTpl = observable.box<unknown>(tplA, { deep: false });
    const viewCtx = {
      focusedTpl: () => focusedTpl.get(),
      focusedCloneKey: () => undefined,
      currentComponent: () => ({}),
    } as unknown as ViewCtx;
    const arena = observable.box<unknown>({}, { deep: false });
    const viewCtxs = observable.array([viewCtx], { deep: false });
    const studioCtx = {
      get currentArena() {
        return arena.get();
      },
      focusedViewCtx: () => viewCtx,
      viewCtxs,
    } as unknown as StudioCtx;
    const state = new BottomPanelState();
    const dispose = state.watch(studioCtx);
    onTestFinished(dispose);
    const ids = () => state.stack.map((entry) => entry.id);
    return { state, viewCtx, viewCtxs, focusedTpl, arena, ids };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it("saves and closes a tab when its selection changes", async () => {
    const { state, viewCtx, focusedTpl, ids } = setup();
    const write = vi.fn(() => undefined);
    const session = new EditorSession({
      initial: "old",
      prepare: () => ({ apply: write }),
    });
    await state.open("data", {});
    await state.open("binding", {
      session,
      selection: {
        viewCtx,
        tpl: tplA as any,
        component: {} as any,
        cloneKey: undefined,
      },
    });
    session.setDraft("new");
    runInAction(() => focusedTpl.set(tplB));
    await settle();
    expect(write).toHaveBeenCalledOnce();
    expect(ids()).toEqual(["data"]);
  });

  it("keeps an unscoped tab across selection changes", async () => {
    const { state, focusedTpl, ids } = setup();
    await state.open("data", {});
    await state.open("query", {});
    runInAction(() => focusedTpl.set(tplB));
    await settle();
    expect(ids()).toEqual(["data", "query"]);
  });

  it("closes a tab when its pinned view is disposed", async () => {
    const { state, viewCtx, viewCtxs, ids } = setup();
    await state.open("data", {});
    await state.open("query", { viewCtx });
    runInAction(() => viewCtxs.clear());
    await settle();
    expect(ids()).toEqual(["data"]);
  });

  it("closes a pinned tab when another view replaces its view", async () => {
    const { state, viewCtxs, ids } = setup();
    const pinned = {} as ViewCtx;
    runInAction(() => viewCtxs.push(pinned));
    await state.open("data", {});
    await state.open("query", { viewCtx: pinned });
    runInAction(() => viewCtxs.splice(1, 1, {} as ViewCtx));
    await settle();
    expect(ids()).toEqual(["data"]);
  });

  it("returns to the root tab on arena change, staying collapsed", async () => {
    const { state, arena, ids } = setup();
    await state.open("data", {}, { expand: false });
    await state.open("query", {}, { expand: false });
    runInAction(() => arena.set({}));
    await settle();
    expect(ids()).toEqual(["data"]);
    expect(state.isExpanded).toBe(false);
  });

  it("closes the whole arena stack when selection changes in the same action", async () => {
    const { state, viewCtx, focusedTpl, arena, ids } = setup();
    await state.open("data", {});
    await state.open("query", {
      session: new EditorSession({
        initial: "query",
        prepare: () => ({ apply: () => {} }),
      }),
    });
    await state.open("binding", {
      parentId: "query",
      session: new EditorSession({
        initial: "binding",
        prepare: () => ({ apply: () => {} }),
      }),
      selection: {
        viewCtx,
        tpl: tplA as any,
        component: {} as any,
        cloneKey: undefined,
      },
    });
    runInAction(() => {
      arena.set({});
      focusedTpl.set(tplB);
    });
    await settle();
    expect(ids()).toEqual(["data"]);
  });
});
