import { Bundler } from "@/wab/shared/bundler";
import { mkShortId } from "@/wab/shared/common";
import {
  cloneComponent,
  ComponentType,
  mkComponent,
} from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { cloneSite, createSite } from "@/wab/shared/core/sites";
import { findExprsInNode, mkTplTagX } from "@/wab/shared/core/tpls";
import {
  Component,
  CustomCode,
  CustomFunction,
  CustomFunctionExpr,
  ensureKnownCustomFunctionExpr,
  ensureKnownFunctionArg,
  ensureKnownFunctionType,
  EventHandler,
  FunctionArg,
  Interaction,
  isKnownCustomFunctionExpr,
  NameArg,
  ProjectDependency,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

function makeFixture() {
  const argType = typeFactory.arg("message", typeFactory.text());
  const func = new CustomFunction({
    defaultExport: false,
    importName: "cloneProbe",
    importPath: "./clone-probe",
    displayName: "Clone probe",
    namespace: null,
    params: [argType],
    isQuery: false,
    isMutation: true,
  });
  const op = new CustomFunctionExpr({
    func,
    args: [
      new FunctionArg({
        uuid: mkShortId(),
        argType,
        expr: new CustomCode({ code: '"hello"', fallback: null }),
      }),
    ],
  });
  const handler = new EventHandler({ interactions: [] });
  handler.interactions.push(
    new Interaction({
      uuid: mkShortId(),
      interactionName: "Call clone probe",
      actionName: "customFunctionOp",
      conditionalMode: "always",
      condExpr: null,
      parent: handler,
      args: [new NameArg({ name: "customFunctionOp", expr: op })],
    })
  );
  const component = mkComponent({
    name: "Clone probe",
    type: ComponentType.Plain,
    tplTree: (baseVariant) =>
      mkTplTagX("button", { baseVariant, attrs: { onClick: handler } }),
  });
  return { component, func, op };
}

function getCall(component: Component) {
  return ensureKnownCustomFunctionExpr(
    findExprsInNode(component.tplTree).find(({ expr }) =>
      isKnownCustomFunctionExpr(expr)
    )?.expr
  );
}

test("component duplication preserves custom-function argument types", () => {
  const { component, func, op } = makeFixture();
  const cloned = cloneComponent(component, "Copy").component;
  const call = getCall(cloned);
  expect(call).not.toBe(op);
  expect(call.args[0]).not.toBe(op.args[0]);
  expect(call.func).toBe(func);
  expect(call.args[0].argType).toBe(func.params[0]);
});

test.each([false, true])(
  "site clone handles custom-function interactions (imported=%s)",
  (imported) => {
    const { component, func, op } = makeFixture();
    const site = createSite({
      components: [component],
      customFunctions: imported ? [] : [func],
    });
    const bundler = new Bundler();
    if (imported) {
      const dep = new ProjectDependency({
        name: "Functions",
        pkgId: "functions-pkg",
        projectId: "functions-project",
        version: "1.0.0",
        uuid: mkShortId(),
        site: createSite({ customFunctions: [func] }),
      });
      site.projectDependencies.push(dep);
      bundler.bundle(dep, "dependency", "1");
    }
    bundler.bundle(site, "source", "1");
    expect(component.serverQueries).toHaveLength(0);
    expect(component.dataQueries).toHaveLength(0);
    const cloned = cloneSite(site);
    const call = getCall(cloned.components[0]);
    const expectedFunction = imported ? func : cloned.customFunctions[0];
    expect(call.func).toBe(expectedFunction);
    expect(call.args[0].argType).toBe(expectedFunction.params[0]);
    expect(op.func).toBe(func);
    expect(op.args[0].argType).toBe(func.params[0]);
    expect(bundler.bundle(cloned, "clone", "1").deps).toEqual(
      imported ? ["dependency"] : []
    );
  }
);

test("component duplication still remaps arguments belonging to component props", () => {
  const { component, op } = makeFixture();
  const argType = typeFactory.arg("value", typeFactory.text());
  const param = mkParam({
    name: "onChange",
    paramType: "prop",
    type: typeFactory.func(argType),
  });
  component.params.push(param);
  // A separate function argument in the same interaction exercises both owners.
  const ownedArg = new FunctionArg({
    uuid: mkShortId(),
    argType,
    expr: new CustomCode({ code: "1", fallback: null }),
  });
  // Nest in the call's argument expression so normal expression traversal visits it.
  op.args[0].expr = ownedArg;
  const cloned = cloneComponent(component, "Copy").component;
  const clonedType = ensureKnownFunctionType(cloned.params[0].type);
  const clonedArg = ensureKnownFunctionArg(getCall(cloned).args[0].expr);
  expect(clonedArg.argType).toBe(clonedType.params[0]);
  expect(clonedArg.argType).not.toBe(argType);
  expect(ownedArg.argType).toBe(argType);
});
