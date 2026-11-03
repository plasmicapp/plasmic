import { updateSiteCustomFunctions } from "@/wab/client/components/modals/customFunctionModals";
import { showTemporaryPrompt } from "@/wab/client/components/quick-modals";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { createCustomFunctionFromRegistration } from "@/wab/shared/code-components/code-components";
import {
  mkComponentWithQueries,
  mkServerQuery,
} from "@/wab/shared/codegen/react-p/server-queries/__testonly__/test-utils";
import { mkShortId } from "@/wab/shared/common";
import { customCode } from "@/wab/shared/core/exprs";
import { createSite } from "@/wab/shared/core/sites";
import {
  CustomFunction,
  CustomFunctionExpr,
  FunctionArg,
} from "@/wab/shared/model/classes";
import { CustomFunctionRegistration } from "@plasmicapp/host";

vi.mock("@/wab/client/components/quick-modals", () => ({
  showTemporaryPrompt: vi.fn(),
  reactConfirm: vi.fn(),
}));

function fixture() {
  const makeFunction = (name: string, params: string[]) =>
    createCustomFunctionFromRegistration({
      function: () => undefined,
      meta: {
        name,
        importPath: "./functions",
        params: params as CustomFunctionRegistration["meta"]["params"],
      },
    });
  const updated = makeFunction("updated", ["keep", "obsolete"]);
  const removed = makeFunction("removed", ["keep", "obsolete"]);
  const added = makeFunction("added", ["keep"]);
  const call = (func: CustomFunction) =>
    new CustomFunctionExpr({
      func,
      args: func.params.map(
        (argType) =>
          new FunctionArg({
            uuid: mkShortId(),
            argType,
            expr: customCode('"value"'),
          }),
      ),
    });
  const updatedCall = call(updated);
  const removedCall = call(removed);
  const dynamicCall = customCode('$$.removed("value")');
  const component = mkComponentWithQueries(
    mkServerQuery("updatedQuery", updatedCall),
    mkServerQuery("removedQuery", removedCall),
    mkServerQuery("dynamicQuery", dynamicCall),
  );
  const site = createSite();
  site.components = [...site.components, component];
  site.customFunctions = [updated, removed];
  const change = vi.fn(async (f) => f());
  const ctx = {
    site,
    change,
  } as unknown as StudioCtx;
  const props = {
    ctx,
    newFunctions: [added],
    updatedFunctions: [
      {
        customFunction: updated,
        updates: {
          defaultExport: true,
          importPath: "./updated-functions",
          params: [updated.params[0]],
          isQuery: true,
          isMutation: false,
          displayName: "Updated",
        },
      },
    ],
    removedFunctions: new Set([removed]),
  };
  return {
    props,
    site,
    change,
    component,
    updated,
    removed,
    added,
    updatedCall,
    removedCall,
    dynamicCall,
  };
}

it("waits for the removal prompt, and closing it applies metadata but keeps the function and its uses", async () => {
  const f = fixture();
  let cancel: () => void = () => {
    throw new Error("Prompt not opened");
  };
  vi.mocked(showTemporaryPrompt).mockImplementation(
    () =>
      new Promise((resolve) => {
        cancel = () => resolve(undefined);
      }),
  );
  const keptArg = f.updatedCall.args[0];
  const pending = updateSiteCustomFunctions(f.props);
  expect(showTemporaryPrompt).toHaveBeenCalledOnce();
  expect(f.change).not.toHaveBeenCalled();
  expect(f.updated.params).toHaveLength(2);
  expect(f.updated.displayName).toBeNull();
  expect(f.site.customFunctions).toEqual([f.updated, f.removed]);
  cancel();
  expect(await pending).toEqual([]);
  expect(f.change).toHaveBeenCalledExactlyOnceWith(expect.any(Function), {
    noUndoRecord: true,
  });
  expect(f.site.customFunctions).toEqual([f.updated, f.removed, f.added]);
  expect(f.updated.importPath).toBe("./updated-functions");
  expect(f.updated.params).toEqual([keptArg.argType]);
  expect(f.updatedCall.args).toEqual([keptArg]);
  expect(f.component.serverQueries.map((q) => q.name)).toEqual([
    "updatedQuery",
    "removedQuery",
    "dynamicQuery",
  ]);
  expect(f.removedCall.func).toBe(f.removed);
});

it("deletes the function and its queries when the prompt asks to", async () => {
  const f = fixture();
  vi.mocked(showTemporaryPrompt).mockResolvedValue("delete");
  expect(await updateSiteCustomFunctions(f.props)).toEqual([f.removed]);
  expect(f.site.customFunctions).toEqual([f.updated, f.added]);
  expect(f.component.serverQueries.map((q) => q.name)).toEqual([
    "updatedQuery",
    "dynamicQuery",
  ]);
});

it.each(["added", "updated"] as const)(
  "remaps to an %s function using its final parameters",
  async (target) => {
    const f = fixture();
    vi.mocked(showTemporaryPrompt).mockResolvedValue(f[target]);
    await updateSiteCustomFunctions(f.props);
    expect(f.change).toHaveBeenCalledOnce();
    expect(f.removedCall.func).toBe(f[target]);
    expect(f.removedCall.args).toHaveLength(1);
    expect(f.removedCall.args[0].argType).toBe(f[target].params[0]);
    expect(f.dynamicCall.code).toContain(`$$.${target}(`);
    expect(f.component.serverQueries).toHaveLength(3);
  },
);
