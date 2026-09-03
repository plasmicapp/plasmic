import { getSourceUiId } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import { mkBaseVariant } from "@/wab/shared/Variants";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParamsForState } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { mkNamedState, mkState } from "@/wab/shared/core/states";
import { mkTplTagX } from "@/wab/shared/core/tpls";

const site = createSite();

// A component with a plain named state (`count`) and an implicit state on a
// tpl node named `myComp` (surfaced in the data picker as `myComp → value`,
// i.e. the row path `["$state", "myComp", "value"]`).
const component = (() => {
  const baseVariant = mkBaseVariant();
  const myCompTpl = mkTplTagX("div", { name: "myComp", baseVariant });
  const implicit = mkParamsForState({
    name: "value",
    variableType: "text",
    accessType: "private",
    onChangeProp: "on value change",
  });
  const implicitState = mkNamedState({
    param: implicit.valueParam,
    onChangeParam: implicit.onChangeParam,
    name: "value",
    variableType: "text",
  });
  const surfacedParams = mkParamsForState({
    name: "value",
    variableType: "text",
    accessType: "private",
    onChangeProp: "on value change",
  });
  const surfacedState = mkState({
    param: surfacedParams.valueParam,
    onChangeParam: surfacedParams.onChangeParam,
    tplNode: myCompTpl,
    implicitState,
    variableType: "text",
  });
  const countParams = mkParamsForState({
    name: "count",
    variableType: "number",
    accessType: "private",
    onChangeProp: "on count change",
  });
  const countState = mkNamedState({
    param: countParams.valueParam,
    onChangeParam: countParams.onChangeParam,
    name: "count",
    variableType: "number",
  });
  return mkComponent({
    name: "Comp",
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div", { baseVariant }, myCompTpl),
    states: [surfacedState, countState],
  });
})();

describe("getSourceUiId for $state rows", () => {
  it("resolves a plain named state row ($state.<name>)", () => {
    expect(getSourceUiId(["$state", "count"], site, component)).toBeDefined();
  });

  it("resolves a surfaced implicit state row ($state.<comp>.<member>)", () => {
    expect(
      getSourceUiId(["$state", "myComp", "value"], site, component)
    ).toBeDefined();
  });

  it("does not resolve non-state child rows or deeper paths", () => {
    expect(
      getSourceUiId(["$state", "myComp", "other"], site, component)
    ).toBeUndefined();
    expect(
      getSourceUiId(["$state", "myComp", "value", "x"], site, component)
    ).toBeUndefined();
  });

  it("does not resolve unknown states", () => {
    expect(getSourceUiId(["$state", "nope"], site, component)).toBeUndefined();
  });
});
