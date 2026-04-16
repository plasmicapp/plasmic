import { serializeServerQueryTree } from "@/wab/shared/codegen/react-p/server-queries/serialize-tree";
import {
  ServerComponentNode,
  ServerDataProviderContextNode,
  ServerNode,
  ServerQueryTree,
  ServerRepeatedContextNode,
  ServerVisibilityContextNode,
} from "@/wab/shared/codegen/react-p/server-queries/types";
import { ServerQueryWithOperation } from "@/wab/shared/codegen/react-p/server-queries/utils";
import { mkShortId } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { ExprCtx, customCode } from "@/wab/shared/core/exprs";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  Component,
  ComponentServerQuery,
  CustomFunction,
  CustomFunctionExpr,
  FunctionArg,
  StrongFunctionArg,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

export function hasNestedQueries(tree: ServerQueryTree): boolean {
  return hasQueriesInChildren(tree.rootNode.children);
}

function hasQueriesInChildren(nodes: ServerNode[]): boolean {
  for (const node of nodes) {
    if (node.type === "component" && node.queries.length > 0) {
      return true;
    }
    if (hasQueriesInChildren(node.children)) {
      return true;
    }
  }
  return false;
}

function createMockComponent(name: string): Component {
  return mkComponent({
    name,
    type: ComponentType.Plain,
    tplTree: mkTplTagX("div"),
  });
}

function createMockCustomFunction(
  importName: string,
  params: { argName: string }[] = []
): CustomFunction {
  return {
    importName,
    displayName: importName,
    namespace: null,
    params: params.map((p) => typeFactory.arg(p.argName, typeFactory.text())),
    typeTag: "CustomFunction",
    uid: Math.random(),
    importPath: "@my-package/functions",
    defaultExport: false,
    isQuery: true,
  };
}

function createMockServerQuery(
  name: string,
  func: CustomFunction,
  args: { argName: string; exprCode: string }[] = []
): ServerQueryWithOperation {
  const functionArgs: FunctionArg[] = args.map(
    (arg) =>
      new StrongFunctionArg({
        uuid: mkShortId(),
        argType: typeFactory.arg(arg.argName, typeFactory.text()),
        expr: customCode(arg.exprCode),
      })
  );
  return new ComponentServerQuery({
    uuid: mkShortId(),
    name,
    op: new CustomFunctionExpr({
      func,
      args: functionArgs,
    }),
  }) as ServerQueryWithOperation;
}

function createSimpleQueryTree(
  component: Component,
  queries: ServerQueryWithOperation[],
  children: ServerComponentNode["children"] = []
): ServerQueryTree {
  const componentNode: ServerComponentNode = {
    type: "component",
    component,
    queries,
    propsContext: {},
    children,
  };

  return {
    rootComponent: component,
    rootNode: componentNode,
  };
}

const exprCtx: ExprCtx = {
  component: null,
  projectFlags: DEVFLAGS,
  inStudio: false,
};

describe("serializeServerQueryTree", () => {
  it("should emit fn as a direct JS reference and args as a function (not a quoted string)", () => {
    const component = createMockComponent("TestComponent");
    const func = createMockCustomFunction("fetchData", [{ argName: "id" }]);
    const query = createMockServerQuery("testQuery", func, [
      { argName: "id", exprCode: "$props.userId" },
    ]);
    const tree = createSimpleQueryTree(component, [query]);

    const serialized = serializeServerQueryTree(tree, exprCtx);

    // fn should be a direct JS expression, NOT a quoted string
    expect(serialized).toContain("fn: $$.fetchData");
    // args should be a function expression, not an array of strings
    expect(serialized).toContain(
      "args: ({ $q, $props, $ctx, $state }) => [$props.userId]"
    );
    // Should not have the old func field
    expect(serialized).not.toContain('"func"');
    // id should still be serialized as a JSON string
    expect(serialized).toContain('id: "fetchData"');
    // Should not have component-specific uuid fields
    expect(serialized).not.toContain("rootComponentUuid");
    expect(serialized).not.toContain("componentUuid");
  });

  it("should serialize namespaced functions correctly", () => {
    const component = createMockComponent("TestComponent");
    const func = createMockCustomFunction("fetchData", [{ argName: "id" }]);
    func.namespace = "myNamespace";
    const query = createMockServerQuery("testQuery", func, [
      { argName: "id", exprCode: "$props.userId" },
    ]);
    const tree = createSimpleQueryTree(component, [query]);

    const serialized = serializeServerQueryTree(tree, exprCtx);

    expect(serialized).toContain("fn: $$.myNamespace.fetchData");
    expect(serialized).toContain('id: "myNamespace.fetchData"');
  });

  it("should serialize nested components without componentUuid", () => {
    const parentComponent = createMockComponent("ParentComponent");
    const childComponent = createMockComponent("ChildComponent");
    const func = createMockCustomFunction("fetchChild");
    const query = createMockServerQuery("childQuery", func);

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [query],
      propsContext: { someProp: "$props.parentProp" },
      children: [],
    };

    const tree: ServerQueryTree = {
      rootComponent: parentComponent,
      rootNode: {
        type: "component",
        component: parentComponent,
        queries: [],
        propsContext: {},
        children: [childNode],
      },
    };

    const serialized = serializeServerQueryTree(tree, exprCtx);

    // Check structure via string content
    expect(serialized).toContain('type: "component"');
    expect(serialized).toContain("fn: $$.fetchChild");
    // propsContext values are now function expressions
    expect(serialized).toContain(
      "({ $q, $props, $ctx, $state }) => ($props.parentProp)"
    );
    expect(serialized).not.toContain("componentUuid");
  });

  it("should serialize visibility nodes with function expression", () => {
    const component = createMockComponent("TestComponent");
    const childComponent = createMockComponent("ChildComponent");

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [],
      propsContext: {},
      children: [],
    };

    const visibilityNode: ServerVisibilityContextNode = {
      type: "visibility",
      visibilityExpr: "$props.isVisible",
      children: [childNode],
    };

    const tree: ServerQueryTree = {
      rootComponent: component,
      rootNode: {
        type: "component",
        component,
        queries: [],
        propsContext: {},
        children: [visibilityNode],
      },
    };

    const serialized = serializeServerQueryTree(tree, exprCtx);

    expect(serialized).toContain('type: "visibility"');
    // visibilityExpr is now a function
    expect(serialized).toContain(
      "visibilityExpr: ({ $q, $props, $ctx, $state }) => ($props.isVisible)"
    );
  });

  it("should serialize repeated nodes with function expression", () => {
    const component = createMockComponent("TestComponent");
    const childComponent = createMockComponent("ItemComponent");

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [],
      propsContext: {},
      children: [],
    };

    const repeatedNode: ServerRepeatedContextNode = {
      type: "repeated",
      collectionExpr: "$props.items",
      itemName: "currentItem",
      indexName: "currentIndex",
      children: [childNode],
    };

    const tree: ServerQueryTree = {
      rootComponent: component,
      rootNode: {
        type: "component",
        component,
        queries: [],
        propsContext: {},
        children: [repeatedNode],
      },
    };

    const serialized = serializeServerQueryTree(tree, exprCtx);

    expect(serialized).toContain('type: "repeated"');
    // collectionExpr is now a function (no item vars in scope at repeated node level)
    expect(serialized).toContain(
      "collectionExpr: ({ $q, $props, $ctx, $state }) => ($props.items)"
    );
    expect(serialized).toContain('itemName: "currentItem"');
    expect(serialized).toContain('indexName: "currentIndex"');
  });

  it("should destructure item vars for children of repeated nodes", () => {
    const component = createMockComponent("TestComponent");
    const childComponent = createMockComponent("ItemComponent");
    const func = createMockCustomFunction("fetchItem", [{ argName: "url" }]);
    const query = createMockServerQuery("itemQuery", func, [
      { argName: "url", exprCode: "currentItem.url" },
    ]);

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [query],
      propsContext: { item: "currentItem" },
      children: [],
    };

    const repeatedNode: ServerRepeatedContextNode = {
      type: "repeated",
      collectionExpr: "$props.items",
      itemName: "currentItem",
      indexName: "currentIndex",
      children: [childNode],
    };

    const tree: ServerQueryTree = {
      rootComponent: component,
      rootNode: {
        type: "component",
        component,
        queries: [],
        propsContext: {},
        children: [repeatedNode],
      },
    };

    const serialized = serializeServerQueryTree(tree, exprCtx);

    // Child of repeated node: args and propsContext should destructure item vars
    expect(serialized).toContain(
      "({ $q, $props, $ctx, $state, $scopedItemVars: { currentItem, currentIndex } }) => [currentItem.url]"
    );
    expect(serialized).toContain(
      "({ $q, $props, $ctx, $state, $scopedItemVars: { currentItem, currentIndex } }) => (currentItem)"
    );
  });

  it("should serialize data provider nodes with function expression", () => {
    const component = createMockComponent("TestComponent");
    const childComponent = createMockComponent("ChildComponent");

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [],
      propsContext: {},
      children: [],
    };

    const dataProviderNode: ServerDataProviderContextNode = {
      type: "dataProvider",
      name: "userData",
      data: "$props.user",
      children: [childNode],
    };

    const tree: ServerQueryTree = {
      rootComponent: component,
      rootNode: {
        type: "component",
        component,
        queries: [],
        propsContext: {},
        children: [dataProviderNode],
      },
    };

    const serialized = serializeServerQueryTree(tree, exprCtx);

    expect(serialized).toContain('type: "dataProvider"');
    expect(serialized).toContain('name: "userData"');
    // data is now a function
    expect(serialized).toContain(
      "data: ({ $q, $props, $ctx, $state }) => ($props.user)"
    );
  });
});

describe("hasNestedQueries", () => {
  it("should return false for tree with only root queries", () => {
    const component = createMockComponent("TestComponent");
    const func = createMockCustomFunction("fetchData");
    const query = createMockServerQuery("rootQuery", func);

    const tree = createSimpleQueryTree(component, [query]);

    expect(hasNestedQueries(tree)).toBe(false);
  });

  it("should return true for tree with child component queries", () => {
    const parentComponent = createMockComponent("ParentComponent");
    const childComponent = createMockComponent("ChildComponent");
    const func = createMockCustomFunction("fetchChild");
    const query = createMockServerQuery("childQuery", func);

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [query],
      propsContext: {},
      children: [],
    };

    const tree: ServerQueryTree = {
      rootComponent: parentComponent,
      rootNode: {
        type: "component",
        component: parentComponent,
        queries: [],
        propsContext: {},
        children: [childNode],
      },
    };

    expect(hasNestedQueries(tree)).toBe(true);
  });

  it("should return false for tree with no queries", () => {
    const component = createMockComponent("TestComponent");
    const tree = createSimpleQueryTree(component, []);

    expect(hasNestedQueries(tree)).toBe(false);
  });

  it("should find queries through visibility nodes", () => {
    const parentComponent = createMockComponent("ParentComponent");
    const childComponent = createMockComponent("ChildComponent");
    const func = createMockCustomFunction("fetchChild");
    const query = createMockServerQuery("childQuery", func);

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [query],
      propsContext: {},
      children: [],
    };

    const visibilityNode: ServerVisibilityContextNode = {
      type: "visibility",
      visibilityExpr: "$props.show",
      children: [childNode],
    };

    const tree: ServerQueryTree = {
      rootComponent: parentComponent,
      rootNode: {
        type: "component",
        component: parentComponent,
        queries: [],
        propsContext: {},
        children: [visibilityNode],
      },
    };

    expect(hasNestedQueries(tree)).toBe(true);
  });

  it("should find queries through repeated nodes", () => {
    const parentComponent = createMockComponent("ParentComponent");
    const childComponent = createMockComponent("ItemComponent");
    const func = createMockCustomFunction("fetchItem");
    const query = createMockServerQuery("itemQuery", func);

    const childNode: ServerComponentNode = {
      type: "component",
      component: childComponent,
      queries: [query],
      propsContext: {},
      children: [],
    };

    const repeatedNode: ServerRepeatedContextNode = {
      type: "repeated",
      collectionExpr: "$props.items",
      itemName: "item",
      indexName: "i",
      children: [childNode],
    };

    const tree: ServerQueryTree = {
      rootComponent: parentComponent,
      rootNode: {
        type: "component",
        component: parentComponent,
        queries: [],
        propsContext: {},
        children: [repeatedNode],
      },
    };

    expect(hasNestedQueries(tree)).toBe(true);
  });
});
