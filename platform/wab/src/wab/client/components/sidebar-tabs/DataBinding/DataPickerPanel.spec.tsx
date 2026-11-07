import { BottomPanelTestProvider as BottomPanelProvider } from "@/wab/client/__testonly__/BottomPanelTestProvider";
import {
  BottomPanelTabContext,
  useBottomPanel,
  useBottomPanelActions,
} from "@/wab/client/components/BottomPanel";
import { BottomPanelContent } from "@/wab/client/components/BottomPanelContent";
import { DynamicValueWidget } from "@/wab/client/components/QueryBuilder/Components/DataPickerWidgetFactory";
import {
  BindingIdentity,
  BindingTarget,
  bindingTarget,
} from "@/wab/client/components/editor-sessions/binding-session";
import { captureModelTarget } from "@/wab/client/components/editor-sessions/model-target";
import { TemplatedStringPropEditor } from "@/wab/client/components/sidebar-tabs/ComponentProps/StringPropEditor";
import { DataPickerProps } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  DataPickerPanelProvider,
  DataPickerTrigger,
  DataPickerTriggerHandle,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerPanel";
import { DataPickerRunCodeActionContext } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerRunCodeActionContext";
import { VariantDataPicker } from "@/wab/client/components/variants/variant-menu";
import { ViewCtxContext } from "@/wab/client/contexts/StudioContexts";
import type { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { StudioCtxContext } from "@/wab/client/studio-ctx/StudioCtx";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { ensureVariantSetting, mkVariant } from "@/wab/shared/Variants";
import { ensure } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { asCode } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import type {
  ComponentVariantGroup,
  Interaction,
} from "@/wab/shared/model/classes";
import { ObjectPath } from "@/wab/shared/model/classes";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";

vi.mock(
  "@/wab/client/components/sidebar-tabs/ComponentProps/CodeEditor",
  () => ({
    checkStrSizeLimit: () => true,
    checkSyntaxError: (value: string) => value !== "invalid",
    checkDisallowedStateBindingAssignment: () => true,
    checkDisallowedUseOfLibs: () => true,
    checkWindowGlobalUsage: () => {},
  }),
);
vi.mock(
  "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker",
  async () => ({
    default: (await import("mobx-react")).observer(function DraftPicker(
      props: DataPickerProps,
    ) {
      const session = ensure(props.session, "Missing session");
      const runCode = React.useContext(DataPickerRunCodeActionContext);
      return (
        <>
          <span data-testid="run-result">
            {JSON.stringify(runCode?.stepValue)}
          </span>
          <span data-testid="picker-data">{JSON.stringify(props.data)}</span>
          <input
            aria-label="Draft"
            value={session.draft.code}
            onChange={(e) =>
              session.setDraft((prev) => ({ ...prev, code: e.target.value }))
            }
          />
          <button onClick={props.saveAndClose}>Save</button>
          <button onClick={props.onCancel}>Cancel</button>
        </>
      );
    }),
  }),
);

const PanelContents = observer(function PanelContents() {
  const state = useBottomPanel();
  const panel = useBottomPanelActions();
  React.useLayoutEffect(() => {
    void panel.open("data", { title: "Data" });
  }, []);
  return (
    <>
      <button onClick={() => panel.activate("data")}>Change instance</button>
      {state.stack.map((entry) => (
        <BottomPanelTabContext.Provider key={entry.id} value={entry}>
          <BottomPanelContent config={entry} />
        </BottomPanelTabContext.Provider>
      ))}
    </>
  );
});

function Field({
  onChange,
  name = "Open",
  value = "true",
  closeAfterSave = false,
  targetKey,
  target,
  data,
}: {
  data?: Record<string, unknown>;
  onChange: DataPickerProps["onChange"];
  name?: string;
  value?: string;
  closeAfterSave?: boolean;
  targetKey?: string;
  target?: BindingIdentity;
}) {
  const [visible, setVisible] = React.useState(false);
  const pickerRef = React.useRef<DataPickerTriggerHandle>(null);
  return (
    <>
      <DataPickerTrigger
        ref={pickerRef}
        visible={visible}
        setVisible={setVisible}
        title={name}
        picker={{
          value,
          data,
          target:
            target ??
            (targetKey ? { key: targetKey, exists: () => true } : undefined),
          onChange: (value) => {
            onChange(value);
            if (closeAfterSave) {
              setVisible(false);
            }
          },
          onCancel: () => setVisible(false),
        }}
      >
        <button
          onClick={() => {
            pickerRef.current?.open();
          }}
        >
          {name}
        </button>
      </DataPickerTrigger>
    </>
  );
}

function Harness({
  show,
  onChange,
  fieldKey = "original",
  targetKey,
}: {
  show: boolean;
  onChange: DataPickerProps["onChange"];
  fieldKey?: string;
  targetKey?: string;
}) {
  return (
    <BottomPanelProvider>
      <DataPickerPanelProvider>
        {show && (
          <Field key={fieldKey} onChange={onChange} targetKey={targetKey} />
        )}
        <PanelContents />
      </DataPickerPanelProvider>
    </BottomPanelProvider>
  );
}

const edit = (value: string) =>
  fireEvent.change(screen.getByLabelText("Draft"), { target: { value } });

describe("docked picker trigger teardown", () => {
  beforeEach(() => {
    DEVFLAGS.dockview = true;
  });

  it("carries Run Code results into the dock and refreshes them while open", () => {
    const interaction = {} as Interaction;
    function RunCodeHarness({
      result,
      show = true,
    }: {
      result: string;
      show?: boolean;
    }) {
      return (
        <BottomPanelProvider>
          <DataPickerPanelProvider>
            <DataPickerRunCodeActionContext.Provider
              value={{ interaction, stepValue: result }}
            >
              {show && <Field onChange={() => {}} />}
            </DataPickerRunCodeActionContext.Provider>
            <PanelContents />
          </DataPickerPanelProvider>
        </BottomPanelProvider>
      );
    }
    const view = render(<RunCodeHarness result="first" />);
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByTestId("run-result").textContent).toBe('"first"');
    view.rerender(<RunCodeHarness result="second" />);
    expect(screen.getByTestId("run-result").textContent).toBe('"second"');
    view.rerender(<RunCodeHarness result="second" show={false} />);
    expect(screen.getByTestId("run-result").textContent).toBe('"second"');
  });

  it("refreshes callbacks only for the original binding target", async () => {
    const initialSave = vi.fn();
    const currentSave = vi.fn();
    const otherSave = vi.fn();
    const view = render(
      <Harness show onChange={initialSave} targetKey="base" />,
    );
    fireEvent.click(screen.getByText("Open"));
    edit("changed");
    view.rerender(<Harness show onChange={currentSave} targetKey="base" />);
    view.rerender(<Harness show onChange={otherSave} targetKey="hover" />);
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(currentSave).toHaveBeenCalledExactlyOnceWith("changed");
    expect(initialSave).not.toHaveBeenCalled();
    expect(otherSave).not.toHaveBeenCalled();
  });

  it("retains ownership and draft when the originating field unmounts", async () => {
    const save = vi.fn();
    const view = render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("NEW");
    view.rerender(<Harness show={false} onChange={save} />);
    expect(save).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Draft") as HTMLInputElement).value).toBe(
      "NEW",
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(save).toHaveBeenCalledExactlyOnceWith("NEW");
    expect(screen.queryByLabelText("Draft")).toBeNull();
  });

  it("retains the draft when validation fails", async () => {
    const save = vi.fn();
    const view = render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("invalid");
    await act(async () => {
      fireEvent.click(screen.getByText("Change instance"));
    });
    expect(save).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Draft") as HTMLInputElement).value).toBe(
      "invalid",
    );
  });

  it("retains the draft when saving rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const save = vi.fn(() => {
      throw new Error("Save failed");
    });
    const view = render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("changed");
    await act(async () => {
      fireEvent.click(screen.getByText("Change instance"));
    });
    expect(save).toHaveBeenCalledWith("changed");
    expect((screen.getByLabelText("Draft") as HTMLInputElement).value).toBe(
      "changed",
    );
  });

  it("flushes when selecting another instance hides a mounted trigger", async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const save = vi.fn();
    const viewCtx = {
      site: createSite(),
      siteInfo: { id: "project" },
      currentComponent: () => undefined,
      focusedTpl: () => undefined,
      focusedCloneKey: () => undefined,
      studioCtx: {
        change: async (fn: () => unknown) => {
          const result = fn();
          await pending;
          return result;
        },
      },
    } as unknown as ViewCtx;
    render(
      <ViewCtxContext.Provider value={viewCtx}>
        <Harness show onChange={save} />
      </ViewCtxContext.Provider>,
    );
    fireEvent.click(screen.getByText("Open"));
    edit("NEW");
    fireEvent.click(screen.getByText("Change instance"));
    await act(async () => {});
    expect(save).toHaveBeenCalledWith("NEW");
    expect(screen.getByLabelText("Draft")).toBeTruthy();
    await act(async () => {
      ensure(finish, "Save started")();
      await pending;
    });
    expect(screen.queryByLabelText("Draft")).toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("keeps an invalid draft after an instance change and lets Cancel discard it", async () => {
    const save = vi.fn();
    render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("invalid");
    await act(async () => {
      fireEvent.click(screen.getByText("Change instance"));
    });
    expect(screen.getByLabelText("Draft")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByLabelText("Draft")).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it("closes a corrected draft after validation blocked an instance change", async () => {
    const save = vi.fn();
    render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("invalid");
    await act(async () => {
      fireEvent.click(screen.getByText("Change instance"));
    });
    edit("corrected");
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(save).toHaveBeenCalledWith("corrected");
    expect(screen.queryByLabelText("Draft")).toBeNull();
  });

  it("does not save twice when Save hides the trigger", async () => {
    const save = vi.fn();
    render(
      <BottomPanelProvider>
        <DataPickerPanelProvider>
          <Field onChange={save} closeAfterSave />
          <PanelContents />
        </DataPickerPanelProvider>
      </BottomPanelProvider>,
    );
    fireEvent.click(screen.getByText("Open"));
    edit("NEW");
    await act(async () => {
      fireEvent.click(screen.getByText("Save"));
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("NEW");
    expect(screen.queryByLabelText("Draft")).toBeNull();
  });

  it("waits for an already pending Save when selection changes", async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const save = vi.fn(() => pending);
    render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("NEW");
    fireEvent.click(screen.getByText("Save"));
    fireEvent.click(screen.getByText("Change instance"));
    expect(screen.getByLabelText("Draft")).toBeTruthy();
    await act(async () => {
      ensure(finish, "Save started")();
      await pending;
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Draft")).toBeNull();
  });

  it("does not auto-save an explicitly canceled draft", () => {
    const save = vi.fn();
    render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("changed");
    fireEvent.click(screen.getByText("Cancel"));
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Draft")).toBeNull();
  });

  it("saves only the reopened draft after canceling an earlier edit", async () => {
    const save = vi.fn();
    const view = render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("canceled draft");
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("Open"));
    edit("reopened draft");
    await act(async () => {
      fireEvent.click(screen.getByText("Change instance"));
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("reopened draft");
    expect(screen.queryByLabelText("Draft")).toBeNull();
  });

  it("does not save again when a canceled trigger unmounts", async () => {
    const save = vi.fn();
    const view = render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("canceled draft");
    fireEvent.click(screen.getByText("Cancel"));
    await act(async () => {
      fireEvent.click(screen.getByText("Change instance"));
    });
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Draft")).toBeNull();
  });

  it("does not release a newer session when an old save finishes", async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const save = vi.fn(() => pending);
    const view = render(<Harness show onChange={save} />);
    fireEvent.click(screen.getByText("Open"));
    edit("old draft");
    fireEvent.click(screen.getByText("Change instance"));
    view.rerender(<Harness show onChange={vi.fn()} fieldKey="new" />);
    await act(async () => {
      fireEvent.click(screen.getByText("Open"));
    });
    await act(async () => {
      ensure(finish, "Save has not started")();
      await pending;
    });
    expect(screen.getByLabelText("Draft")).toBeTruthy();
  });
});

function MultiFieldHarness({
  firstSave,
  secondSave = vi.fn(),
  showSecond = true,
}: {
  firstSave: DataPickerProps["onChange"];
  secondSave?: DataPickerProps["onChange"];
  showSecond?: boolean;
}) {
  return (
    <BottomPanelProvider>
      <DataPickerPanelProvider>
        <Field name="First" value="first value" onChange={firstSave} />
        {showSecond && (
          <Field name="Second" value="second value" onChange={secondSave} />
        )}
        <Field name="Third" value="third value" onChange={vi.fn()} />
        <PanelContents />
      </DataPickerPanelProvider>
    </BottomPanelProvider>
  );
}

describe("docked picker ownership", () => {
  beforeEach(() => {
    DEVFLAGS.dockview = true;
  });
  const draft = () =>
    (screen.getByLabelText("Draft") as HTMLInputElement).value;
  const isBound = (name: string) =>
    screen.getByText(name).getAttribute("data-dockview-bound-input") === "true";

  it("keeps the old session and draft when opening another field fails validation", async () => {
    const firstSave = vi.fn();
    const secondSave = vi.fn();
    render(<MultiFieldHarness firstSave={firstSave} secondSave={secondSave} />);
    fireEvent.click(screen.getByText("First"));
    edit("invalid");
    await act(async () => {
      fireEvent.click(screen.getByText("Second"));
    });
    expect(draft()).toBe("invalid");
    expect(isBound("First")).toBe(true);
    expect(isBound("Second")).toBe(false);
    expect(firstSave).not.toHaveBeenCalled();
    expect(secondSave).not.toHaveBeenCalled();
    edit("corrected");
    await act(async () => {
      fireEvent.click(screen.getByText("Second"));
    });
    expect(firstSave).toHaveBeenCalledWith("corrected");
    expect(secondSave).not.toHaveBeenCalled();
    expect(draft()).toBe("second value");
    expect(isBound("First")).toBe(false);
    expect(isBound("Second")).toBe(true);
  });

  it("does not remount a dirty picker when clicking its own field again", () => {
    render(<MultiFieldHarness firstSave={vi.fn()} />);
    fireEvent.click(screen.getByText("First"));
    edit("invalid");
    fireEvent.click(screen.getByText("First"));
    expect(draft()).toBe("invalid");
    expect(isBound("First")).toBe(true);
  });

  it("keeps the old owner when saving rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MultiFieldHarness
        firstSave={() => {
          throw new Error("save failed");
        }}
      />,
    );
    fireEvent.click(screen.getByText("First"));
    edit("unsaved");
    await act(async () => {
      fireEvent.click(screen.getByText("Second"));
    });
    expect(draft()).toBe("unsaved");
    expect(isBound("First")).toBe(true);
  });

  it("waits for the save and gives only the latest requested field ownership", async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const firstSave = vi.fn(() => pending);
    render(<MultiFieldHarness firstSave={firstSave} />);
    fireEvent.click(screen.getByText("First"));
    edit("unsaved");
    fireEvent.click(screen.getByText("Second"));
    fireEvent.click(screen.getByText("Third"));
    expect(draft()).toBe("unsaved");
    expect(isBound("First")).toBe(true);
    await act(async () => {
      ensure(finish, "save started")();
      await pending;
    });
    expect(firstSave).toHaveBeenCalledTimes(1);
    expect(firstSave).toHaveBeenCalledWith("unsaved");
    expect(draft()).toBe("third value");
    expect(isBound("Third")).toBe(true);
    expect(isBound("Second")).toBe(false);
  });

  it("opens a captured destination even when its trigger unmounts", async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const firstSave = vi.fn(() => pending);
    const view = render(<MultiFieldHarness firstSave={firstSave} />);
    fireEvent.click(screen.getByText("First"));
    edit("unsaved");
    fireEvent.click(screen.getByText("Second"));
    view.rerender(
      <MultiFieldHarness firstSave={firstSave} showSecond={false} />,
    );
    await act(async () => {
      ensure(finish, "save started")();
      await pending;
    });
    expect(draft()).toBe("second value");
    expect(isBound("First")).toBe(false);
  });
});

it("keeps the supplied page context when no canvas element is selected", () => {
  DEVFLAGS.dockview = true;
  const viewCtx = {
    focusedTpl: () => undefined,
    currentComponent: () => undefined,
    site: createSite(),
    siteInfo: { id: "project" },
  } as unknown as ViewCtx;
  render(
    <ViewCtxContext.Provider value={viewCtx}>
      <BottomPanelProvider>
        <DataPickerPanelProvider>
          <Field onChange={vi.fn()} data={{ $ctx: { pagePath: "/review" } }} />
          <PanelContents />
        </DataPickerPanelProvider>
      </BottomPanelProvider>
    </ViewCtxContext.Provider>,
  );
  fireEvent.click(screen.getByText("Open"));
  expect(screen.getByTestId("picker-data").textContent).toContain("/review");
  expect(
    screen.queryByText("Preview unavailable for the original canvas context."),
  ).toBeNull();
});

it("preserves caller fields and isolation through refreshes with a focused canvas target", () => {
  DEVFLAGS.dockview = true;
  const tpl = { uuid: "target" };
  const component = { tplTree: tpl };
  const viewCtx = {
    focusedTpl: () => tpl,
    focusedCloneKey: () => undefined,
    currentComponent: () => component,
    site: createSite(),
    siteInfo: { id: "project" },
    renderCount: 1,
    getCanvasEnvForTpl: () => ({ $ctx: {}, excluded: "canvas-only" }),
  } as unknown as ViewCtx;
  Object.assign(viewCtx, {
    studioCtx: {
      viewCtxs: [viewCtx],
      change: async (fn: () => unknown) => fn(),
    },
  });
  function Harness({ data }: { data: Record<string, unknown> }) {
    return (
      <ViewCtxContext.Provider value={viewCtx}>
        <BottomPanelProvider>
          <DataPickerPanelProvider>
            <Field onChange={vi.fn()} data={data} />
            <PanelContents />
          </DataPickerPanelProvider>
        </BottomPanelProvider>
      </ViewCtxContext.Provider>
    );
  }
  const view = render(<Harness data={{ custom: { title: "First" } }} />);
  fireEvent.click(screen.getByText("Open"));
  expect(
    JSON.parse(
      ensure(screen.getByTestId("picker-data").textContent, "Picker data"),
    ),
  ).toEqual({ custom: { title: "First" } });
  view.rerender(<Harness data={{ custom: { title: "Updated" } }} />);
  expect(
    JSON.parse(
      ensure(screen.getByTestId("picker-data").textContent, "Picker data"),
    ),
  ).toEqual({ custom: { title: "Updated" } });
  viewCtx.focusedCloneKey = () => "another-instance";
  view.rerender(<Harness data={{ custom: { title: "Other instance" } }} />);
  expect(
    JSON.parse(
      ensure(screen.getByTestId("picker-data").textContent, "Picker data"),
    ),
  ).toEqual({ custom: { title: "Updated" } });
});

it("opens a query-builder chip through the dock, including its initial open request", async () => {
  DEVFLAGS.dockview = true;
  render(
    <BottomPanelProvider>
      <DataPickerPanelProvider>
        <DynamicValueWidget
          value={new ObjectPath({ path: ["field"], fallback: undefined })}
          data={{ field: "value" }}
          setValue={vi.fn()}
          exprCtx={{ projectFlags: DEVFLAGS, component: null, inStudio: true }}
          defaultOpenDataPicker
        />
        <PanelContents />
      </DataPickerPanelProvider>
    </BottomPanelProvider>,
  );
  expect(await screen.findByLabelText("Draft")).toBeTruthy();
  fireEvent.click(screen.getByText("Cancel"));
  expect(screen.queryByLabelText("Draft")).toBeNull();
  fireEvent.click(screen.getByText("field"));
  expect(await screen.findByLabelText("Draft")).toBeTruthy();
});

it("keeps an inherited binding's unset variant destination and detects outside edits", async () => {
  DEVFLAGS.dockview = true;
  const component = mkComponent({
    name: "Component",
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div"),
  });
  const tpl = component.tplTree;
  const a = mkVariant({ name: "Hover", selectors: [":hover"] });
  const b = mkVariant({ name: "Focus", selectors: [":focus"] });
  component.variants = [...component.variants, a, b];
  const site = createSite();
  site.components = [...site.components, component];
  const viewCtx = { currentComponent: () => component, site } as ViewCtx;
  const target = (variant: typeof a) =>
    bindingTarget(viewCtx, tpl, [variant], "condition", (vs) => vs?.dataCond);
  const first = target(a);
  const second = target(b);
  expect(first.key).not.toBe(second.key);
  const saveA = vi.fn();
  const saveB = vi.fn();
  const view = render(<Harness show targetKey={first.key} onChange={saveA} />);
  fireEvent.click(screen.getByText("Open"));
  edit("edited");
  view.rerender(<Harness show targetKey={second.key} onChange={saveB} />);
  await act(async () => {
    fireEvent.click(screen.getByText("Save"));
  });
  expect(saveA).toHaveBeenCalledExactlyOnceWith("edited");
  expect(saveB).not.toHaveBeenCalled();

  const captured = captureModelTarget(first);
  const vs = ensureVariantSetting(tpl, [a]);
  expect(target(a).key).toBe(first.key);
  vs.dataCond = new ObjectPath({ path: ["changed"], fallback: undefined });
  expect(captured.check()).toContain("changed outside");
  component.variants = component.variants.filter((variant) => variant !== a);
  expect(captured.check()).toContain("deleted");
});

it("opens a variant default button repeatedly through the dock", async () => {
  DEVFLAGS.dockview = true;
  const component = mkComponent({
    name: "Component",
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div"),
  });
  const group = {
    param: { variable: { name: "mode" } },
    variants: [],
    linkedState: { param: { defaultExpr: undefined } },
  } as unknown as ComponentVariantGroup;
  const studioCtx = {
    change: async (fn: () => unknown) => fn(),
    focusedOrFirstViewCtx: () => undefined,
    customFunctionsSchema: () => ({}),
    projectFlags: () => DEVFLAGS,
  } as unknown as StudioCtx;
  function VariantButton() {
    const [visible, setVisible] = React.useState(false);
    return (
      <VariantDataPicker
        studioCtx={studioCtx}
        component={component}
        group={group}
        visibleDataPicker={visible}
        setVisibleDataPicker={setVisible}
      >
        <button onClick={() => setVisible(true)}>Variant default</button>
      </VariantDataPicker>
    );
  }
  render(
    <BottomPanelProvider>
      <DataPickerPanelProvider>
        <VariantButton />
        <PanelContents />
      </DataPickerPanelProvider>
    </BottomPanelProvider>,
  );
  for (let i = 0; i < 2; i++) {
    fireEvent.click(screen.getByText("Variant default"));
    expect(await screen.findByLabelText("Draft")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByLabelText("Draft")).toBeNull();
  }
});

it("saves an inline chip to its original field after the field remounts for another variant", async () => {
  DEVFLAGS.dockview = true;
  const studioCtx = {
    change: async (fn: () => unknown) => fn(),
    focusedViewCtx: () => undefined,
    projectFlags: () => DEVFLAGS,
    site: createSite(),
  } as unknown as StudioCtx;
  const originalSave = vi.fn();
  const nextSave = vi.fn();
  const value = new ObjectPath({ path: ["original"], fallback: undefined });
  function ChipHarness({ variant }: { variant: string }) {
    return (
      <StudioCtxContext.Provider value={studioCtx}>
        <BottomPanelProvider>
          <DataPickerPanelProvider>
            <TemplatedStringPropEditor
              key={variant}
              bindingTarget={{
                key: variant,
                exists: () => true,
                read: () => value,
              }}
              value={value}
              onChange={variant === "base" ? originalSave : nextSave}
            />
            <PanelContents />
          </DataPickerPanelProvider>
        </BottomPanelProvider>
      </StudioCtxContext.Provider>
    );
  }
  const view = render(<ChipHarness variant="base" />);
  fireEvent.click(
    ensure(view.container.querySelector(".code-chip"), "Inline chip"),
  );
  edit("edited");
  view.rerender(<ChipHarness variant="hover" />);
  await act(async () => {
    fireEvent.click(screen.getByText("Save"));
  });
  expect(originalSave).toHaveBeenCalledTimes(1);
  expect(
    asCode(originalSave.mock.calls[0][0], {
      projectFlags: DEVFLAGS,
      component: null,
      inStudio: true,
    }).code,
  ).toContain("edited");
  expect(nextSave).not.toHaveBeenCalled();
});

it("renders a model target live and saves without retaining its opener callbacks", async () => {
  DEVFLAGS.dockview = true;
  const component = mkComponent({
    name: "Model binding",
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div"),
  });
  const viewCtx = {
    currentComponent: () => component,
    focusedTpl: () => undefined,
    site: createSite(),
    siteInfo: { id: "project" },
  } as unknown as ViewCtx;
  Object.assign(viewCtx, {
    studioCtx: {
      viewCtxs: [viewCtx],
      change: async (fn: () => unknown) => fn(),
    },
  });
  const data = observable.box({ message: "before" });
  const write = vi.fn(() => undefined);
  const oldOnChange = vi.fn();
  const target: BindingTarget = {
    key: "model-target",
    exists: () => true,
    context: { viewCtx, component, tpl: component.tplTree },
    value: () => "true",
    write,
    data: () => data.get(),
    schema: () => undefined,
  };
  function ModelHarness({ show }: { show: boolean }) {
    return (
      <BottomPanelProvider>
        <DataPickerPanelProvider>
          {show && <Field target={target} onChange={oldOnChange} />}
          <PanelContents />
        </DataPickerPanelProvider>
      </BottomPanelProvider>
    );
  }
  const view = render(<ModelHarness show />);
  fireEvent.click(screen.getByText("Open"));
  edit("edited");
  view.rerender(<ModelHarness show={false} />);
  act(() => runInAction(() => data.set({ message: "after" })));
  expect(screen.getByTestId("picker-data").textContent).toBe(
    '{"message":"after"}',
  );
  await act(async () => {
    fireEvent.click(screen.getByText("Save"));
  });
  expect(write).toHaveBeenCalledExactlyOnceWith("edited");
  expect(oldOnChange).not.toHaveBeenCalled();
});
