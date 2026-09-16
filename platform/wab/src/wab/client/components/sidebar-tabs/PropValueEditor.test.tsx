import {
  PropEditorRow,
  PropValueEditorContext,
  usePropValueEditorContext,
} from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { PropValueEditor } from "@/wab/client/components/sidebar-tabs/PropValueEditor";
import { generateActionMetaForGlobalAction } from "@/wab/client/state-management/interactions-meta";
import { FunctionArgumentsPropType } from "@/wab/shared/code-components/code-components";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { typeFactory } from "@/wab/shared/model/model-util";
import { act, cleanup, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import React from "react";
import { vi } from "vitest";

vi.mock("@/wab/client/studio-ctx/StudioCtx", () => ({
  useStudioCtx: () => ({}),
}));
// Keep the real row's context resolution, but isolate its editor chrome.
vi.mock("mobx-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mobx-react")>();
  return {
    ...actual,
    observer: (component: any) =>
      component.name === "InnerPropEditorRow_"
        ? function MockInnerPropEditorRow(props: any) {
            const { componentPropValues, ccContextData } =
              usePropValueEditorContext();
            const options = props.propType.options(
              componentPropValues,
              ccContextData,
            );
            return (
              <select aria-label={props.label}>
                {options.map((option: string) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            );
          }
        : actual.observer(component),
  };
});

afterEach(cleanup);

function setup(contextName = "HelloGlobalContext") {
  const selected = mkTplTagX("div");
  const hello = { name: "hello canvas clone" };
  const other = { name: "other canvas clone" };
  const contexts = new Map([
    ["HelloGlobalContext", hello],
    ["OtherGlobalContext", other],
  ]);
  const data = observable.map<any, any>([
    [selected, { names: ["selected element data"] }],
    [hello, { names: ["a", "b", "c"] }],
    [other, { names: ["other"] }],
  ]);
  const options = vi.fn((_props, ctx) => ctx?.names ?? ["dummy", "data"]);
  const meta = generateActionMetaForGlobalAction(
    { parameters: [{ name: "name", type: { type: "choice", options } }] },
    contextName,
  );
  const propType = {
    ...(meta.parameters.args as FunctionArgumentsPropType<any>),
    functionType: typeFactory.func(typeFactory.arg("name", typeFactory.text())),
  };
  const getComponentEvalContext = vi.fn((tpl) => ({
    invalidArgs: [],
    componentPropValues:
      tpl === selected
        ? { internalModel: "must not leak" }
        : { provider: tpl.name },
    ccContextData: data.get(tpl),
  }));
  const context = {
    paramOwnerNames: [],
    tpl: selected,
    componentPropValues: { internalModel: "must not leak" },
    ccContextData: {
      names: ["selected element data"],
      viewCtx: {
        csEvaluator: {
          getGlobalContextTpl: (name: string) => contexts.get(name),
        },
      },
    },
    viewCtx: { getComponentEvalContext, customFunctionsSchema: () => ({}) },
    env: {},
  };
  const rendered = render(
    <PropValueEditorContext.Provider value={context as any}>
      <PropValueEditor
        propType={propType as any}
        attr="args"
        label="Arguments"
        value={undefined}
        onChange={vi.fn()}
      />
    </PropValueEditorContext.Provider>,
  );
  return { ...rendered, data, hello, other, options, getComponentEvalContext };
}

it("passes the invoked provider's props and context to argument options", () => {
  const { options, hello, getComponentEvalContext } = setup();
  expect(getComponentEvalContext).toHaveBeenCalledWith(hello);
  expect(options).toHaveBeenLastCalledWith(
    { provider: "hello canvas clone" },
    { names: ["a", "b", "c"] },
  );
  expect(screen.getAllByRole("option").map((el) => el.textContent)).toEqual([
    "a",
    "b",
    "c",
  ]);
});

it("isolates the invoked provider from the selection and other providers", () => {
  const { options, other, getComponentEvalContext } =
    setup("OtherGlobalContext");
  expect(getComponentEvalContext).toHaveBeenCalledWith(other);
  expect(options).toHaveBeenLastCalledWith(
    { provider: "other canvas clone" },
    { names: ["other"] },
  );
});

it("reacts to provider data changes and preserves absent-context fallback", async () => {
  const { data, hello, options } = setup();
  await act(() => runInAction(() => data.set(hello, { names: ["updated"] })));
  expect(screen.getAllByRole("option").map((el) => el.textContent)).toEqual([
    "updated",
  ]);
  await act(() => runInAction(() => data.delete(hello)));
  expect(options).toHaveBeenLastCalledWith(
    { provider: "hello canvas clone" },
    undefined,
  );
  expect(screen.getAllByRole("option").map((el) => el.textContent)).toEqual([
    "dummy",
    "data",
  ]);
});

it("keeps fallback options when the registered provider is not on the canvas", () => {
  const { getComponentEvalContext, options } = setup("MissingGlobalContext");
  expect(getComponentEvalContext).not.toHaveBeenCalled();
  expect(options).toHaveBeenLastCalledWith({}, undefined);
});

it("uses the selected component context when overrides are omitted", () => {
  const tpl = mkTplTagX("div");
  const componentPropValues = { selected: true };
  const ccContextData = { names: ["selected element data"] };
  const getComponentEvalContext = vi.fn(() => ({
    invalidArgs: [],
    componentPropValues,
    ccContextData,
  }));
  const options = vi.fn((_props, ctx) => ctx.names);
  render(
    <PropEditorRow
      tpl={tpl}
      expr={undefined}
      viewCtx={{ getComponentEvalContext } as any}
      env={{}}
      schema={{}}
      attr="name"
      label="Name"
      propType={{ type: "choice", options }}
      onChange={vi.fn()}
    />,
  );
  expect(getComponentEvalContext).toHaveBeenCalledWith(tpl);
  expect(options).toHaveBeenLastCalledWith(componentPropValues, ccContextData);
});
