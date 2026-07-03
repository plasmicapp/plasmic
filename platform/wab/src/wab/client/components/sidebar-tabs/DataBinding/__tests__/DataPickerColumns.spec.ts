import { _testonly } from "@/wab/client/components/sidebar-tabs/DataBinding/DataPicker";
import {
  Column,
  DataPickerOpts,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParamsForState } from "@/wab/shared/core/lang";
import { mkNamedState, mkState } from "@/wab/shared/core/states";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { mkBaseVariant } from "@/wab/shared/Variants";

const { getCurrentItemPath, getFixedInitialColumnsFor, getInitialColumns } =
  _testonly;

const opts: DataPickerOpts = { showAdvancedFields: false };

// `component` argument: no component (nothing to surface) vs. a component owning
// an implicit state on a tpl node named `myComp`, whose members surface at the top.
const noComponent = undefined;
const componentWithMyComp = (() => {
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
  const { valueParam, onChangeParam } = mkParamsForState({
    name: "value",
    variableType: "text",
    accessType: "private",
    onChangeProp: "on value change",
  });
  const state = mkState({
    param: valueParam,
    onChangeParam,
    tplNode: myCompTpl,
    implicitState,
    variableType: "text",
  });
  return mkComponent({
    name: "Comp",
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div", { baseVariant }, myCompTpl),
    states: [state],
  });
})();

// Compact view of a column for readable assertions: item display names (as the
// UI renders them), selected index, and an error message when the column carries one.
function simplify(columns: Column[]) {
  return columns.map((c) => ({
    items: c.columnItems.map((i) => i.label ?? i.name),
    selectedItem: c.selectedItem,
    ...(c.errorMessage !== undefined ? { errorMessage: c.errorMessage } : {}),
  }));
}

describe("getInitialColumns (characterization)", () => {
  it("single flatten-key path leaves nothing selected (key is flattened away)", () => {
    const data = { $state: { foo: 1 } };
    const columns = getInitialColumns(["$state"], opts, data, noComponent);
    expect(simplify(columns)).toEqual([
      { items: ["foo"], selectedItem: undefined },
    ]);
  });

  it("$state.foo (static flatten) surfaces state members at top level", () => {
    const data = { $state: { foo: { bar: 1 }, count: 5 } };
    const columns = getInitialColumns(
      ["$state", "foo", "bar"],
      opts,
      data,
      noComponent
    );
    expect(simplify(columns)).toEqual([
      { items: ["foo", "count"], selectedItem: 0 },
      { items: ["bar"], selectedItem: 0 },
    ]);
    expect(columns[0].columnItems[0].pathPrefix).toEqual(["$state"]);
    expect(getCurrentItemPath(columns)).toEqual(["$state", "foo", "bar"]);
  });

  it("$state.<namedTplState> (extra flatten) surfaces members with a joined label", () => {
    const data = { $state: { myComp: { value: "v" }, foo: 1 } };
    const columns = getInitialColumns(
      ["$state", "myComp", "value"],
      opts,
      data,
      componentWithMyComp
    );
    expect(simplify(columns)).toEqual([
      { items: ["myComp → value", "foo"], selectedItem: 0 },
    ]);
    expect(columns[0].columnItems[0].name).toEqual("value");
    expect(columns[0].columnItems[0].pathPrefix).toEqual(["$state", "myComp"]);
    expect(getCurrentItemPath(columns)).toEqual(["$state", "myComp", "value"]);
  });

  it("$ctx.params.x and $props.x flatten to top level", () => {
    const data = { $ctx: { params: { x: "px" } }, $props: { title: "t" } };
    const columns = getInitialColumns(
      ["$ctx", "params", "x"],
      opts,
      data,
      noComponent
    );
    expect(simplify(columns)).toEqual([
      { items: ["params", "title"], selectedItem: 0 },
      { items: ["x"], selectedItem: 0 },
    ]);
    expect(getCurrentItemPath(columns)).toEqual(["$ctx", "params", "x"]);

    const propsColumns = getInitialColumns(
      ["$props", "title"],
      opts,
      data,
      noComponent
    );
    expect(simplify(propsColumns)).toEqual([
      { items: ["params", "title"], selectedItem: 1 },
    ]);
    expect(getCurrentItemPath(propsColumns)).toEqual(["$props", "title"]);
  });

  it("$q.myQuery.data.<field> with list data skips the wrapper column", () => {
    const data = {
      $q: { myQuery: { data: { rows: [1] }, error: undefined } },
    };
    const columns = getInitialColumns(
      ["$q", "myQuery", "data", "rows"],
      opts,
      data,
      noComponent
    );
    expect(simplify(columns)).toEqual([
      { items: ["myQuery"], selectedItem: 0 },
      { items: ["rows"], selectedItem: 0 },
      { items: ["0"], selectedItem: undefined },
    ]);
    expect(getCurrentItemPath(columns)).toEqual([
      "$q",
      "myQuery",
      "data",
      "rows",
    ]);
  });

  it("$q.myQuery with primitive data binds $q.myQuery.data with no fields column", () => {
    const data = { $q: { myQuery: { data: 42, error: undefined } } };
    const columns = getInitialColumns(
      ["$q", "myQuery", "data"],
      opts,
      data,
      noComponent
    );
    expect(simplify(columns)).toEqual([
      { items: ["myQuery"], selectedItem: 0 },
    ]);
    expect(getCurrentItemPath(columns)).toEqual(["$q", "myQuery", "data"]);
  });

  it("$q.myQuery errored shows the error column and no field items", () => {
    const data = {
      $q: { myQuery: { data: undefined, error: new Error("Boom") } },
    };
    const columns = getInitialColumns(
      ["$q", "myQuery", "data"],
      opts,
      data,
      noComponent
    );
    expect(simplify(columns)).toEqual([
      { items: ["myQuery"], selectedItem: 0 },
      { items: [], selectedItem: undefined, errorMessage: "Boom" },
    ]);
    expect(getCurrentItemPath(columns)).toEqual(["$q", "myQuery", "data"]);
  });

  it("legacy $q.myQuery saved path selects the query's data row", () => {
    const data = {
      $q: { myQuery: { data: { rows: [1] }, error: undefined } },
    };
    const columns = getInitialColumns(
      ["$q", "myQuery"],
      opts,
      data,
      noComponent
    );
    expect(simplify(columns)).toEqual([
      { items: ["myQuery"], selectedItem: 0 },
      { items: ["rows"], selectedItem: undefined },
    ]);
    expect(getCurrentItemPath(columns)).toEqual(["$q", "myQuery", "data"]);
  });

  it("$q.myQuery loading shows no error and no descend column", () => {
    const data = {
      $q: { myQuery: { data: undefined, error: undefined } },
    };
    const columns = getInitialColumns(
      ["$q", "myQuery", "data"],
      opts,
      data,
      noComponent
    );
    expect(simplify(columns)).toEqual([
      { items: ["myQuery"], selectedItem: 0 },
    ]);
    expect(columns[0].errorMessage).toBeUndefined();
    expect(getCurrentItemPath(columns)).toEqual(["$q", "myQuery", "data"]);
  });
});

describe("getFixedInitialColumnsFor (characterization)", () => {
  it("reverses column 0's items and remaps selectedItem", () => {
    const data = { $ctx: { params: { x: "px" } }, $props: { title: "t" } };
    const columns = getFixedInitialColumnsFor(
      ["$ctx", "params", "x"],
      opts,
      data,
      noComponent
    );
    // Column 0 is reversed (params/title -> title/params) and its selectedItem
    // moves from index 0 to the reversed index.
    expect(simplify(columns)).toEqual([
      { items: ["title", "params"], selectedItem: 1 },
      { items: ["x"], selectedItem: 0 },
    ]);
    expect(getCurrentItemPath(columns)).toEqual(["$ctx", "params", "x"]);
  });
});
