import { mkShortId } from "@/wab/shared/common";
import * as Components from "@/wab/shared/core/components";
import { ComponentType } from "@/wab/shared/core/components";
import { customCode } from "@/wab/shared/core/exprs";
import { mkParam } from "@/wab/shared/core/lang";
import { isSlotSelection } from "@/wab/shared/core/slots";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  mkDataSourceOpExpr,
  mkDataSourceTemplate,
} from "@/wab/shared/data-sources-meta/data-sources";
import {
  Arg,
  ComponentDataQuery,
  ComponentServerQuery,
  CustomFunction,
  CustomFunctionExpr,
  ensureKnownTplNode,
  EventHandler,
  ExprText,
  FunctionArg,
  FunctionExpr,
  Interaction,
  isKnownTplSlot,
  NameArg,
  PageHref,
  Rep,
  TemplatedString,
  TplNode,
  Var,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { withoutUids } from "@/wab/shared/model/model-meta";
import { typeFactory } from "@/wab/shared/model/model-util";
import {
  mkBaseVariant,
  mkVariant,
  mkVariantSetting,
} from "@/wab/shared/Variants";
import * as STpls from "@/wab/test/tpls";

describe("clone", () =>
  it("should handle TplComponents", function () {
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div", {}),
      type: ComponentType.Plain,
    });
    const tpl = Tpls.mkTplComponent(component, STpls.TEST_GLOBAL_VARIANT, []);
    const clone = Tpls.clone(tpl);
    return expect(withoutUids(clone)).toEqual(withoutUids(tpl));
  }));

describe("flattenTpls", () =>
  it("should work", function () {
    const xs: TplNode[] = [];
    const flattened = Tpls.flattenTpls(
      (xs[0] = Tpls.mkTplTag("div", [
        (xs[1] = STpls.mkTplTestText("hello")),
        (xs[2] = Tpls.mkTplTag("span")),
        (xs[3] = Tpls.mkTplTag("span")),
        (xs[4] = STpls.mkTplTestText("goodbye")),
      ]))
    );
    return expect(flattened).toEqual(xs);
  }));

function ancestorsThroughComponentsUtils() {
  // Using a single base variant for everything to simplify the test
  // this doesn't affect the execution of ancestorsThroughComponentsWithSlotSelections
  const baseVariant = mkBaseVariant();

  const basicComponent = Components.mkComponent({
    tplTree: Tpls.mkTplTagX(
      "div",
      {
        name: "basicComponent-root",
      },
      []
    ),
    type: ComponentType.Plain,
  });

  function createComponentWithSlot(name: string, type: ComponentType) {
    const slotParam = mkParam({
      name: "children",
      type: typeFactory.renderable(),
      paramType: "slot",
    });

    const tplSlot = Tpls.mkSlot(slotParam);

    const tplTree = Tpls.mkTplTagX(
      "div",
      {
        name: `${name}-root`,
      },
      [tplSlot]
    );

    const component = Components.mkComponent({
      tplTree,
      params: [slotParam],
      type,
      codeComponentMeta: type === ComponentType.Code ? ({} as any) : undefined,
    });
    return component;
  }

  const basicComponentInstance = Tpls.mkTplComponentX({
    name: "basicComponent-instance",
    component: basicComponent,
    baseVariant,
  });

  const plainComponent = createComponentWithSlot(
    "plainComponent",
    ComponentType.Plain
  );
  const codeComponent = createComponentWithSlot(
    "codeComponent",
    ComponentType.Code
  );

  const tree = Tpls.mkTplTagX(
    "div",
    {
      name: "root",
    },
    [
      Tpls.mkTplComponentX({
        name: "codeComponent-instance",
        component: codeComponent,
        baseVariant,
        children: [
          Tpls.mkTplComponentX({
            name: "plainComponent-instance",
            component: plainComponent,
            baseVariant,
            children: [basicComponentInstance],
          }),
        ],
      }),
    ]
  );

  function describeNode({ node, layer }: Tpls.NodeWithLayer) {
    if (isSlotSelection(node)) {
      return {
        type: "slotSelection",
        slotName: node.slotParam.variable.name,
        layer,
      };
    }
    if (isKnownTplSlot(node)) {
      return {
        type: "tplSlot",
        slotName: node.param.variable.name,
        layer,
      };
    }
    return {
      type: "node",
      name: node.name,
      layer,
    };
  }

  return {
    baseVariant,
    basicComponentInstance,
    codeComponent,
    describeNode,
    plainComponent,
    tree,
  };
}
describe("ancestorsThroughComponentsWithSlotSelections", () => {
  it("should include all tpls through components", () => {
    const {
      baseVariant,
      basicComponentInstance,
      codeComponent,
      describeNode,
      tree,
    } = ancestorsThroughComponentsUtils();

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        basicComponentInstance
      ).map(describeNode)
    ).toEqual([
      { type: "node", name: "basicComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "tplSlot", slotName: "children", layer: 1 },
      { type: "node", name: "plainComponent-root", layer: 1 },
      { type: "node", name: "plainComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "node", name: "codeComponent-instance", layer: 0 },
      { type: "node", name: "root", layer: 0 },
    ]);

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        basicComponentInstance,
        {
          includeTplComponentRoot: true,
        }
      ).map(describeNode)
    ).toEqual([
      { type: "node", name: "basicComponent-root", layer: 1 },
      { type: "node", name: "basicComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "tplSlot", slotName: "children", layer: 1 },
      { type: "node", name: "plainComponent-root", layer: 1 },
      { type: "node", name: "plainComponent-instance", layer: 0 },
      { type: "slotSelection", slotName: "children", layer: 0 },
      { type: "node", name: "codeComponent-instance", layer: 0 },
      { type: "node", name: "root", layer: 0 },
    ]);

    const codeComponentInstance = Tpls.mkTplComponentX({
      name: "codeComponent-instance",
      component: codeComponent,
      baseVariant,
    });

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(
        codeComponentInstance
      ).map(describeNode)
    ).toEqual([{ type: "node", name: "codeComponent-instance", layer: 0 }]);

    expect(
      Tpls.ancestorsThroughComponentsWithSlotSelections(codeComponentInstance, {
        includeTplComponentRoot: true,
      }).map(describeNode)
    ).toEqual([{ type: "node", name: "codeComponent-instance", layer: 0 }]);
  });
});

describe("computeAncestorsValKey", () => {
  it("should properly use the layers to ignore nodes", () => {
    const {
      baseVariant,
      basicComponentInstance,
      codeComponent,
      describeNode,
      plainComponent,
      tree,
    } = ancestorsThroughComponentsUtils();

    const ancestors = Tpls.ancestorsThroughComponentsWithSlotSelections(
      basicComponentInstance
    );
    /**
     * The order of the output is
     * 0: { type: "node", name: "basicComponent-instance", layer: 0 },
     * 1: { type: "slotSelection", slotName: "children", layer: 0 },
     * 2: { type: "tplSlot", slotName: "children", layer: 1 },
     * 3: { type: "node", name: "plainComponent-root", layer: 1 },
     * 4: { type: "node", name: "plainComponent-instance", layer: 0 },
     * 5: { type: "slotSelection", slotName: "children", layer: 0 },
     * 6: { type: "node", name: "codeComponent-instance", layer: 0 },
     * 7: { type: "node", name: "root", layer: 0 },
     */
    const ancestorsValKey = Tpls.computeAncestorsValKey(ancestors);
    expect(ancestorsValKey).toEqual(
      [ancestors[7], ancestors[6], ancestors[4], ancestors[0]]
        .map((el) => ensureKnownTplNode(el.node).uuid)
        .join(".")
    );

    const ancestorsValKey2 = Tpls.computeAncestorsValKey(ancestors.slice(2));
    expect(ancestorsValKey2).toEqual(
      [ancestors[7], ancestors[6], ancestors[4], ancestors[3], ancestors[2]]
        .map((el) => ensureKnownTplNode(el.node).uuid)
        .join(".")
    );

    const ancestorsValKey3 = Tpls.computeAncestorsValKey(ancestors.slice(3));
    expect(ancestorsValKey3).toEqual(
      [ancestors[7], ancestors[6], ancestors[4], ancestors[3]]
        .map((el) => ensureKnownTplNode(el.node).uuid)
        .join(".")
    );
  });
});

describe("replaceNestedExprInExpr", () => {
  it("should replace expression in TemplatedString", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const templatedString = new TemplatedString({
      text: ["Hello ", oldExpr, " world"],
    });

    const result = Tpls.replaceNestedExprInExpr(
      templatedString,
      oldExpr,
      newExpr
    );

    expect(result).toBe(true);
    expect(templatedString.text[1]).toBe(newExpr);
  });

  it("should return false when expression not found in TemplatedString", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const otherExpr = customCode("$props.other");
    const templatedString = new TemplatedString({
      text: ["Hello ", otherExpr, " world"],
    });

    const result = Tpls.replaceNestedExprInExpr(
      templatedString,
      oldExpr,
      newExpr
    );

    expect(result).toBe(false);
    expect(templatedString.text[1]).toBe(otherExpr);
  });

  it("should replace nested expression in CustomFunctionExpr args", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const customFunc = new CustomFunction({
      importPath: "test",
      importName: "testFunc",
      defaultExport: false,
      namespace: null,
      displayName: null,
      params: [],
      isQuery: false,
    });
    const funcArg = new FunctionArg({
      uuid: mkShortId(),
      argType: typeFactory.arg("arg1", typeFactory.text()),
      expr: oldExpr,
    });
    const customFunctionExpr = new CustomFunctionExpr({
      func: customFunc,
      args: [funcArg],
    });

    const result = Tpls.replaceNestedExprInExpr(
      customFunctionExpr,
      oldExpr,
      newExpr
    );

    expect(result).toBe(true);
    expect(funcArg.expr).toBe(newExpr);
  });

  it("should replace expression in PageHref query", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const page = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div"),
      type: ComponentType.Plain,
    });
    const pageHref = new PageHref({
      page,
      params: {},
      query: { key: oldExpr },
      fragment: undefined,
    });

    const result = Tpls.replaceNestedExprInExpr(pageHref, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(pageHref.query.key).toBe(newExpr);
  });

  it("should replace expression in PageHref fragment", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const page = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div"),
      type: ComponentType.Plain,
    });
    const pageHref = new PageHref({
      page,
      params: {},
      query: {},
      fragment: oldExpr,
    });

    const result = Tpls.replaceNestedExprInExpr(pageHref, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(pageHref.fragment).toBe(newExpr);
  });

  it("should replace nested expression in DataSourceOpExpr templates", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const templatedString = new TemplatedString({
      text: ["prefix ", oldExpr, " suffix"],
    });
    const template = mkDataSourceTemplate({
      fieldType: "string",
      value: templatedString,
      bindings: null,
    });
    const dataSourceOpExpr = mkDataSourceOpExpr({
      sourceId: "source1",
      opId: "op1",
      opName: "getData",
      templates: { field1: template },
    });

    const result = Tpls.replaceNestedExprInExpr(
      dataSourceOpExpr,
      oldExpr,
      newExpr
    );

    expect(result).toBe(true);
    expect(templatedString.text[1]).toBe(newExpr);
  });

  it("should replace expression in EventHandler interaction args", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const nameArg = new NameArg({
      name: "arg1",
      expr: oldExpr,
    });
    const eventHandler = new EventHandler({
      interactions: [],
    });
    const interaction = new Interaction({
      uuid: mkShortId(),
      interactionName: "onClick",
      actionName: "updateVariable",
      args: [nameArg],
      conditionalMode: "always",
      condExpr: null,
      parent: eventHandler,
    });
    eventHandler.interactions.push(interaction);

    const result = Tpls.replaceNestedExprInExpr(eventHandler, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(nameArg.expr).toBe(newExpr);
  });

  it("should replace expression in EventHandler interaction condExpr", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const eventHandler = new EventHandler({
      interactions: [],
    });
    const interaction = new Interaction({
      uuid: mkShortId(),
      interactionName: "onClick",
      actionName: "updateVariable",
      args: [],
      condExpr: oldExpr,
      conditionalMode: "expression",
      parent: eventHandler,
    });
    eventHandler.interactions.push(interaction);

    const result = Tpls.replaceNestedExprInExpr(eventHandler, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(interaction.condExpr).toBe(newExpr);
  });

  it("should replace expression in FunctionExpr bodyExpr within EventHandler", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const functionExpr = new FunctionExpr({
      argNames: [],
      bodyExpr: oldExpr,
    });
    const nameArg = new NameArg({
      name: "arg1",
      expr: functionExpr,
    });
    const eventHandler = new EventHandler({
      interactions: [],
    });
    const interaction = new Interaction({
      uuid: mkShortId(),
      interactionName: "onClick",
      actionName: "updateVariable",
      args: [nameArg],
      conditionalMode: "always",
      condExpr: null,
      parent: eventHandler,
    });
    eventHandler.interactions.push(interaction);

    const result = Tpls.replaceNestedExprInExpr(eventHandler, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(functionExpr.bodyExpr).toBe(newExpr);
  });

  it("should return false when expression not found", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const otherExpr = customCode("$props.other");
    const templatedString = new TemplatedString({
      text: ["Hello ", otherExpr, " world"],
    });

    const result = Tpls.replaceNestedExprInExpr(
      templatedString,
      oldExpr,
      newExpr
    );

    expect(result).toBe(false);
  });
});

describe("replaceExprInComponent", () => {
  it("should replace direct expression in param.defaultExpr", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const param = mkParam({
      name: "testParam",
      type: typeFactory.text(),
      paramType: "prop",
      defaultExpr: oldExpr,
    });
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div"),
      type: ComponentType.Plain,
      params: [param],
    });

    const result = Tpls.replaceExprInComponent(component, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(param.defaultExpr).toBe(newExpr);
  });

  it("should replace nested expression in param.defaultExpr", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const templatedString = new TemplatedString({
      text: ["Hello ", oldExpr, " world"],
    });
    const param = mkParam({
      name: "testParam",
      type: typeFactory.text(),
      paramType: "prop",
      defaultExpr: templatedString,
    });
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div"),
      type: ComponentType.Plain,
      params: [param],
    });

    const result = Tpls.replaceExprInComponent(component, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(templatedString.text[1]).toBe(newExpr);
  });

  it("should replace expression in dataQueries", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const templatedString = new TemplatedString({
      text: ["prefix ", oldExpr, " suffix"],
    });
    const template = mkDataSourceTemplate({
      fieldType: "string",
      value: templatedString,
      bindings: null,
    });
    const dataSourceOpExpr = mkDataSourceOpExpr({
      sourceId: "source1",
      opId: "op1",
      opName: "getData",
      templates: { field1: template },
    });
    const dataQuery = new ComponentDataQuery({
      uuid: mkShortId(),
      name: "query1",
      op: dataSourceOpExpr,
    });
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div"),
      type: ComponentType.Plain,
    });
    component.dataQueries.push(dataQuery);

    const result = Tpls.replaceExprInComponent(component, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(templatedString.text[1]).toBe(newExpr);
  });

  it("should replace expression in serverQueries", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const customFunc = new CustomFunction({
      importPath: "test",
      importName: "testFunc",
      defaultExport: false,
      namespace: null,
      displayName: null,
      params: [],
      isQuery: true,
    });
    const funcArg = new FunctionArg({
      uuid: mkShortId(),
      argType: typeFactory.arg("arg1", typeFactory.text()),
      expr: oldExpr,
    });
    const customFunctionExpr = new CustomFunctionExpr({
      func: customFunc,
      args: [funcArg],
    });
    const serverQuery = new ComponentServerQuery({
      uuid: mkShortId(),
      name: "serverQuery1",
      op: customFunctionExpr,
    });
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div"),
      type: ComponentType.Plain,
    });
    component.serverQueries.push(serverQuery);

    const result = Tpls.replaceExprInComponent(component, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(funcArg.expr).toBe(newExpr);
  });

  it("should return false when expression not found", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const otherExpr = customCode("$props.other");
    const param = mkParam({
      name: "testParam",
      type: typeFactory.text(),
      paramType: "prop",
      defaultExpr: otherExpr,
    });
    const component = Components.mkComponent({
      tplTree: Tpls.mkTplTagX("div"),
      type: ComponentType.Plain,
      params: [param],
    });

    const result = Tpls.replaceExprInComponent(component, oldExpr, newExpr);

    expect(result).toBe(false);
    expect(param.defaultExpr).toBe(otherExpr);
  });
});

describe("replaceExprInNode", () => {
  function mkTplTagWithVariantSetting({
    args,
    attrs,
    dataRep,
    dataCond,
    text,
  }: Partial<VariantSetting>) {
    return Tpls.mkTplTagX("div", {
      baseVariant: mkVariant({ name: "base" }),
      variants: [
        mkVariantSetting({
          variants: [mkVariant({ name: "base" })],
          args,
          attrs,
          dataRep: dataRep ?? undefined,
          dataCond: dataCond ?? undefined,
          text: text ?? undefined,
        }),
      ],
    });
  }

  it("should replace expression in args", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const tplTag = mkTplTagWithVariantSetting({
      args: [
        new Arg({
          expr: oldExpr,
          param: mkParam({
            name: "testParam",
            type: typeFactory.text(),
            paramType: "prop",
          }),
        }),
      ],
    });

    const result = Tpls.replaceExprInNode(tplTag, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(tplTag.vsettings[0].args[0].expr).toBe(newExpr);
  });

  it("should replace expression in attrs", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const tplTag = mkTplTagWithVariantSetting({
      attrs: { title: oldExpr },
    });

    const result = Tpls.replaceExprInNode(tplTag, oldExpr, newExpr);

    expect(result).toBe(true);
    const vs = tplTag.vsettings[0];
    expect(vs.attrs.title).toBe(newExpr);
  });

  it("should replace nested expression in attrs", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const templatedString = new TemplatedString({
      text: ["Hello ", oldExpr, " world"],
    });
    const tplTag = mkTplTagWithVariantSetting({
      attrs: { title: templatedString },
    });

    const result = Tpls.replaceExprInNode(tplTag, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(templatedString.text[1]).toBe(newExpr);
  });

  it("should replace expression in text (ExprText)", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const exprText = new ExprText({
      expr: oldExpr,
      html: false,
    });
    const tplTag = mkTplTagWithVariantSetting({
      text: exprText,
    });

    const result = Tpls.replaceExprInNode(tplTag, oldExpr, newExpr);

    expect(result).toBe(true);
    expect((tplTag.vsettings[0].text as ExprText).expr).toBe(newExpr);
  });

  it("should replace expression in dataCond", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const tplTag = mkTplTagWithVariantSetting({
      dataCond: oldExpr,
    });

    const result = Tpls.replaceExprInNode(tplTag, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(tplTag.vsettings[0].dataCond).toBe(newExpr);
  });

  it("should replace expression in dataRep.collection", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const elementVar = new Var({
      uuid: mkShortId(),
      name: "item",
    });
    const rep = new Rep({
      element: elementVar,
      index: null,
      collection: oldExpr,
    });
    const tplTag = mkTplTagWithVariantSetting({
      dataRep: rep,
    });

    const result = Tpls.replaceExprInNode(tplTag, oldExpr, newExpr);

    expect(result).toBe(true);
    expect(tplTag.vsettings[0].dataRep?.collection).toBe(newExpr);
  });

  it("should return false when expression not found", () => {
    const oldExpr = customCode("$props.old");
    const newExpr = customCode("$props.new");
    const otherExpr = customCode("$props.other");
    const tplTag = mkTplTagWithVariantSetting({
      attrs: { title: otherExpr },
    });

    const result = Tpls.replaceExprInNode(tplTag, oldExpr, newExpr);

    expect(result).toBe(false);
    expect(tplTag.vsettings[0].attrs.title).toBe(otherExpr);
  });
});
