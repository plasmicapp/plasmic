import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkParamsForState } from "@/wab/shared/core/lang";
import {
  getStateByVarName,
  getStateVarNameParts,
  mkNamedState,
  mkState,
} from "@/wab/shared/core/states";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { Rep, State, TplTag, Var } from "@/wab/shared/model/classes";
import { mkBaseVariant } from "@/wab/shared/Variants";

const baseVariant = mkBaseVariant();

/** A top-level named state, e.g. `$state.count`. */
function mkNamed(name: string): State {
  const { valueParam, onChangeParam } = mkParamsForState({
    name,
    variableType: "text",
    accessType: "private",
    onChangeProp: `on ${name} change`,
  });
  return mkNamedState({
    param: valueParam,
    onChangeParam,
    name,
    variableType: "text",
  });
}

function mkRep(): Rep {
  return new Rep({
    element: new Var({ uuid: mkShortId(), name: "item" }),
    index: null,
    collection: codeLit([]),
  });
}

/** A `div` whose base variant repeats over a collection. */
function mkRepeatedTpl(name: string, ...children: TplTag[]): TplTag {
  return mkTplTagX("div", { name, baseVariant, dataRep: mkRep() }, ...children);
}

/** An implicit state on `tplNode`, e.g. the `value` of a repeated input. */
function mkImplicitOn(tplNode: TplTag, implicitName: string): State {
  const implicit = mkParamsForState({
    name: implicitName,
    variableType: "text",
    accessType: "private",
    onChangeProp: `on ${implicitName} change`,
  });
  const implicitState = mkNamedState({
    param: implicit.valueParam,
    onChangeParam: implicit.onChangeParam,
    name: implicitName,
    variableType: "text",
  });
  const { valueParam, onChangeParam } = mkParamsForState({
    name: implicitName,
    variableType: "text",
    accessType: "private",
    onChangeProp: `on ${implicitName} change`,
  });
  return mkState({
    param: valueParam,
    onChangeParam,
    tplNode,
    implicitState,
    variableType: "text",
  });
}

// `count` -> $state.count
const count = mkNamed("count");
// `Selected Item` -> $state.selectedItem (name is converted to a var name)
const selectedItem = mkNamed("Selected Item");
// a repeated input's value -> $state.list[].value
const listTpl = mkRepeatedTpl("list");
const listValue = mkImplicitOn(listTpl, "value");
// a doubly-repeated cell's text -> $state.cell[][].text
const cellTpl = mkRepeatedTpl("cell");
mkRepeatedTpl("row", cellTpl);
const cellText = mkImplicitOn(cellTpl, "text");

const component = mkComponent({
  name: "Comp",
  type: ComponentType.Plain,
  tplTree: mkTplTagX("div", { baseVariant }),
  states: [count, selectedItem, listValue, cellText],
});

describe("getStateVarNameParts", () => {
  it("splits a simple named state into a single part", () => {
    expect(getStateVarNameParts(count)).toEqual(["count"]);
  });
  it("converts the name to a var name", () => {
    expect(getStateVarNameParts(selectedItem)).toEqual(["selectedItem"]);
  });
  it("marks a single repeat with a `[]` part", () => {
    expect(getStateVarNameParts(listValue)).toEqual(["list", "[]", "value"]);
  });
  it("marks nested repeats with a `[]` part each", () => {
    expect(getStateVarNameParts(cellText)).toEqual([
      "cell",
      "[]",
      "[]",
      "text",
    ]);
  });
});

describe("getStateByVarName", () => {
  it("finds a simple state by its var name", () => {
    expect(getStateByVarName(component, "count")).toBe(count);
    expect(getStateByVarName(component, "selectedItem")).toBe(selectedItem);
  });
  it("returns undefined for an unknown name", () => {
    expect(getStateByVarName(component, "nope")).toBeUndefined();
  });
  it("matches a repeated state by its root var name part", () => {
    // Only the root data picker node (e.g. $state.list) links to the source,
    // not the children (e.g. $state.list[0].value), so we match against the
    // first var name part.
    expect(getStateByVarName(component, "list")).toBe(listValue);
    expect(getStateByVarName(component, "cell")).toBe(cellText);
  });
  it("does not match against a non-root var name part", () => {
    expect(getStateByVarName(component, "value")).toBeUndefined();
    expect(getStateByVarName(component, "text")).toBeUndefined();
  });
});
