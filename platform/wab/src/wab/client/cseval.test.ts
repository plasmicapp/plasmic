import { BaseCliSvrEvaluator } from "@/wab/client/cseval";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { clone, mkTplComponent, mkTplTagX } from "@/wab/shared/core/tpls";
import { ValComponent } from "@/wab/shared/core/val-nodes";
import { CodeComponentMeta } from "@/wab/shared/model/classes";
import { autorun, observable, runInAction } from "mobx";

function makeVal(name: string, isContext = true) {
  const component = mkComponent({
    name,
    type: isContext ? ComponentType.Code : ComponentType.Plain,
    tplTree: mkTplTagX("div"),
    codeComponentMeta: isContext
      ? ({ isContext: true, importPath: "test" } as CodeComponentMeta)
      : null,
  });
  const settingsTpl = mkTplComponent(component, component.variants[0]);
  const val = new ValComponent({
    tpl: clone(settingsTpl, true),
    key: name,
    fullKey: name,
    frameUid: 1,
    valOwner: undefined,
    parent: undefined,
    fibers: [],
    className: "",
    slotInfo: undefined,
    slotArgs: new Map(),
    slotCanvasEnvs: new Map(),
  });
  return { val, settingsTpl };
}

it("resolves rendered provider clones through the global wrapper chain only", () => {
  const outer = makeVal("OtherGlobalContext");
  const hello = makeVal("HelloGlobalContext");
  const selected = makeVal("SelectedComponent", false);
  const nested = makeVal("NestedContext");
  outer.val.contents = [hello.val];
  hello.val.contents = [selected.val];
  selected.val.contents = [nested.val];
  const resolve = (name: string) =>
    BaseCliSvrEvaluator.prototype.getGlobalContextTpl.call(
      { valRoot: outer.val },
      name,
    );
  expect(resolve("HelloGlobalContext")).toBe(hello.val.tpl);
  expect(resolve("HelloGlobalContext")).not.toBe(hello.settingsTpl);
  expect(resolve("OtherGlobalContext")).toBe(outer.val.tpl);
  expect(resolve("SelectedComponent")).toBeUndefined();
  expect(resolve("NestedContext")).toBeUndefined();
  expect(resolve("MissingContext")).toBeUndefined();
});

it("tracks providers that finish rendering after the editor opens", () => {
  const outer = makeVal("OtherGlobalContext");
  const hello = makeVal("HelloGlobalContext");
  const root = observable.box<ValComponent | undefined>(undefined);
  const evaluator = {
    get valRoot() {
      return root.get();
    },
  };
  let tpl;
  const dispose = autorun(() => {
    tpl = BaseCliSvrEvaluator.prototype.getGlobalContextTpl.call(
      evaluator,
      "HelloGlobalContext",
    );
  });
  expect(tpl).toBeUndefined();
  runInAction(() => root.set(outer.val));
  expect(tpl).toBeUndefined();
  runInAction(() => (outer.val.contents = [hello.val]));
  expect(tpl).toBe(hello.val.tpl);
  runInAction(() => root.set(undefined));
  expect(tpl).toBeUndefined();
  dispose();
});
