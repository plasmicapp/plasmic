import {
  ColumnItem,
  DataPickerOpts,
  formatErrorMessage,
  getDollarVarIcon,
  getItemChildColumns,
  getItemPath,
  getVariableType,
  mkColumnItems,
} from "@/wab/client/components/sidebar-tabs/DataBinding/DataPickerUtil";
import {
  DataQueryIcon,
  DataTokenIcon,
  PropIcon,
  StateIcon,
  UrlIcon,
} from "@/wab/client/icons";
import {
  UNINITIALIZED_BOOLEAN,
  UNINITIALIZED_NUMBER,
  UNINITIALIZED_OBJECT,
  UNINITIALIZED_STRING,
} from "@/wab/shared/model/model-util";
import { mkMetaName } from "@plasmicapp/host";
import * as React from "react";

const opts: DataPickerOpts = { showAdvancedFields: false };

function itemNames(items: ColumnItem[]) {
  return items.map((i) => i.name);
}

describe("mkColumnItems", () => {
  it("builds items with path prefix", () => {
    const items = mkColumnItems({ a: 1, obj: { b: 2 } }, ["$prefix"], opts);
    expect(items).toEqual([
      { name: "a", label: undefined, value: 1, pathPrefix: ["$prefix"] },
      {
        name: "obj",
        label: undefined,
        value: { b: 2 },
        pathPrefix: ["$prefix"],
      },
    ]);
  });

  it("builds items for array indices", () => {
    const items = mkColumnItems([10, 20] as any, ["rows"], opts);
    expect(items).toEqual([
      { name: "0", label: undefined, value: 10, pathPrefix: ["rows"] },
      { name: "1", label: undefined, value: 20, pathPrefix: ["rows"] },
    ]);
  });

  it("hides __plasmic* keys but reads labels from __plasmic_meta_<key>", () => {
    const items = mkColumnItems(
      { user: "u", [mkMetaName("user")]: { label: "Current User" } },
      [],
      opts
    );
    expect(items).toEqual([
      { name: "user", label: "Current User", value: "u", pathPrefix: [] },
    ]);
  });

  it("hides keys whose meta says hidden", () => {
    const data = { a: 1, b: 2, [mkMetaName("b")]: { hidden: true } };
    expect(itemNames(mkColumnItems(data, [], opts))).toEqual(["a"]);
  });

  it("hides advanced keys unless showAdvancedFields is set", () => {
    const data = { a: 1, b: 2, [mkMetaName("b")]: { advanced: true } };
    expect(itemNames(mkColumnItems(data, [], opts))).toEqual(["a"]);
    expect(
      itemNames(mkColumnItems(data, [], { showAdvancedFields: true }))
    ).toEqual(["a", "b"]);
  });

  it("hides $$ at the root only", () => {
    const data = { $$: { fn: () => 1 }, a: 1 };
    expect(itemNames(mkColumnItems(data, [], opts))).toEqual(["a"]);
    expect(itemNames(mkColumnItems(data, ["x"], opts))).toEqual(["$$", "a"]);
  });

  it("hides always-omitted keys by their full path", () => {
    // `$refs` only at the root; `registerInitFunc` only under `$state`.
    const root = { $refs: {}, a: 1 };
    expect(itemNames(mkColumnItems(root, [], opts))).toEqual(["a"]);
    const state = { registerInitFunc: () => 1, count: 5 };
    expect(itemNames(mkColumnItems(state, ["$state"], opts))).toEqual([
      "count",
    ]);
    expect(itemNames(mkColumnItems(state, ["other"], opts))).toEqual([
      "registerInitFunc",
      "count",
    ]);
  });

  it("omits $ctx.params/$ctx.query only when empty", () => {
    const data = { params: {}, query: { q: "x" } };
    expect(itemNames(mkColumnItems(data, ["$ctx"], opts))).toEqual(["query"]);
  });

  it("hides unsupported values but keeps uninitialized placeholders", () => {
    const data = {
      elt: { $$typeof: Symbol.for("react.element") },
      proxy: { isPlasmicUndefinedDataProxy: true },
      pending: UNINITIALIZED_STRING,
      a: 1,
    };
    expect(itemNames(mkColumnItems(data, [], opts))).toEqual(["pending", "a"]);
  });
});

describe("getVariableType", () => {
  it("works for normal values", () => {
    expect(getVariableType(undefined)).toBe("undefined");
    expect(getVariableType(null)).toBe("null");
    expect(getVariableType(true)).toBe("boolean");
    expect(getVariableType(42)).toBe("number");
    expect(getVariableType(BigInt(42))).toBe("bigint");
    expect(getVariableType("hello")).toBe("string");
    expect(getVariableType(Symbol("sym"))).toBe("symbol");
    expect(getVariableType({ a: 1 })).toBe("object");
    expect(getVariableType([1, 2])).toBe("array");
    expect(getVariableType(() => 1)).toBe("function");
  });

  it("works for uninitialized values", () => {
    expect(getVariableType(UNINITIALIZED_STRING)).toBe("string");
    expect(getVariableType(UNINITIALIZED_NUMBER)).toBe("number");
    expect(getVariableType(UNINITIALIZED_BOOLEAN)).toBe("boolean");
    expect(getVariableType(UNINITIALIZED_OBJECT)).toBe("object");
  });

  it("works for React elements", () => {
    expect(getVariableType(React.createElement("div"))).toBe("react-element");
    expect(getVariableType({ $$typeof: Symbol.for("react.element") })).toBe(
      "react-element"
    );
  });
});

describe("getItemPath", () => {
  it("joins string name", () => {
    const item: ColumnItem = {
      name: "title",
      value: "any",
      pathPrefix: ["$props"],
    };
    expect(getItemPath(item)).toEqual(["$props", "title"]);
  });

  it("joins number name", () => {
    const item: ColumnItem = {
      name: "0",
      value: "any",
      pathPrefix: ["$state", "form", 1, "input"],
    };
    expect(getItemPath(item)).toEqual(["$state", "form", 1, "input", 0]);
  });
});

describe("getItemChildColumns", () => {
  it("shows the item's error message and no fields when set", () => {
    const item: ColumnItem = {
      name: "data",
      value: undefined,
      pathPrefix: ["$q", "myQuery"],
      errorMessage: "Boom",
    };
    expect(getItemChildColumns(item, opts)).toEqual([
      { selectedItem: undefined, columnItems: [], errorMessage: "Boom" },
    ]);
  });

  it("descends into the item's own fields, with nothing selected", () => {
    const [item] = mkColumnItems({ obj: { a: 1 } }, [], opts);
    const [column] = getItemChildColumns(item, opts);
    expect(column.selectedItem).toBeUndefined();
    expect(column.columnItems).toEqual([
      { name: "a", label: undefined, value: 1, pathPrefix: ["obj"] },
    ]);
  });

  it("shows no column for a primitive, undefined, or empty value", () => {
    const mkItem = (value: any): ColumnItem => ({
      name: "leaf",
      value,
      pathPrefix: [],
    });
    expect(getItemChildColumns(mkItem(42), opts)).toEqual([]);
    expect(getItemChildColumns(mkItem(undefined), opts)).toEqual([]);
    expect(getItemChildColumns(mkItem({}), opts)).toEqual([]);
  });
});

describe("formatErrorMessage", () => {
  it("formats an Error using its message", () => {
    expect(formatErrorMessage(new Error("Boom"))).toBe("Boom");
  });

  it("returns a string error as-is", () => {
    expect(formatErrorMessage("HTTP 404")).toBe("HTTP 404");
  });

  it("pretty-prints a non-Error object error", () => {
    expect(formatErrorMessage({ code: 500 })).toBe(
      JSON.stringify({ code: 500 }, null, 2)
    );
  });
});

describe("getDollarVarIcon", () => {
  it("returns mapped icons", () => {
    expect(getDollarVarIcon(["$dataTokens"])).toEqual(DataTokenIcon);
    expect(getDollarVarIcon(["$q", "myQuery", "data"])).toEqual(DataQueryIcon);
    expect(getDollarVarIcon(["$queries", "myQuery"])).toEqual(DataQueryIcon);
    expect(getDollarVarIcon(["$props", "myProp"])).toEqual(PropIcon);
    expect(getDollarVarIcon(["$state", "myVar"])).toEqual(StateIcon);
    expect(getDollarVarIcon(["$state", "textInput", "value"])).toEqual(
      StateIcon
    );
    expect(getDollarVarIcon(["$ctx", "params"])).toEqual(UrlIcon);
    expect(getDollarVarIcon(["$ctx", "query"])).toEqual(UrlIcon);
    expect(getDollarVarIcon(["$ctx", "pagePath"])).toEqual(UrlIcon);
    expect(getDollarVarIcon(["$ctx", "pageRoute"])).toEqual(UrlIcon);
  });

  it("returns undefined for unmapped icons", () => {
    expect(getDollarVarIcon(["$ctx", "fromDataProvider"])).toEqual(undefined);
    expect(getDollarVarIcon(["$steps"])).toBeUndefined();
    expect(getDollarVarIcon(["$$"])).toBeUndefined();
    expect(getDollarVarIcon(["currentItem"])).toBeUndefined();
    expect(getDollarVarIcon(["currentIndex"])).toBeUndefined();
  });
});
