import {
  Arg,
  ensureKnownRenderExpr,
  ensureKnownTplTag,
  isKnownRenderExpr,
  RenderExpr,
  TplTag,
} from "@/wab/classes";
import { ensure, tuple } from "@/wab/common";
import * as Components from "@/wab/components";
import { ComponentType, mkComponent } from "@/wab/components";
import { mkParam, ParamExportType } from "@/wab/lang";
import { withoutUids } from "@/wab/model/model-meta";
import { typeFactory } from "@/wab/shared/core/model-util";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { getBaseVariant } from "@/wab/shared/Variants";
import { createSite } from "@/wab/sites";
import { mkTplTestText, TEST_GLOBAL_VARIANT } from "@/wab/test/tpls";
import * as tpls from "@/wab/tpls";
import {
  checkTplIntegrity,
  mkTplComponentX,
  mkTplTagSimple,
  mkTplTagX,
} from "@/wab/tpls";

describe("TplQuery", function () {
  let allWrapped,
    deep1,
    deep2,
    deep3,
    deep4,
    oneWrapped,
    postWrapped,
    preWrapped,
    wrapper,
    container;
  const componentWithSlots = Components.mkComponent({
    name: "TestComponent",
    params: [
      mkParam({
        name: "children",
        type: typeFactory.renderable(),
        exportType: ParamExportType.External,
        paramType: "slot",
      }),
      mkParam({
        name: "altSlot",
        type: typeFactory.renderable(),
        exportType: ParamExportType.External,
        paramType: "slot",
      }),
    ],
    tplTree: (baseVariant) => mkTplTagX("div", { baseVariant }),
    type: ComponentType.Plain,
  });
  container =
    oneWrapped =
    allWrapped =
    wrapper =
    preWrapped =
    postWrapped =
    deep1 =
    deep2 =
    deep3 =
    deep4 =
      null;
  // Run a common test pattern, where we have some component we operate on that
  // we expect to end up with children [a,b,c]
  const testExpectingComponentChildrenAbc = function (
    setup: (args: [TplTag, TplTag, TplTag]) => {
      initChildren: TplTag[];
      operation: (container: TplTag) => void;
      slotName?: string;
    }
  ) {
    const a = tpls.mkTplTagX("div");
    const b = tpls.mkTplTagX("div");
    const c = tpls.mkTplTagX("div");
    const { initChildren, operation, slotName = "children" } = setup([a, b, c]);
    container = tpls.mkTplComponentX({
      component: componentWithSlots,
      args: Object.fromEntries([
        tuple(slotName, new RenderExpr({ tpl: initChildren })),
      ]),
      baseVariant: TEST_GLOBAL_VARIANT,
    });
    operation(container);
    expect(
      uids(ensureKnownRenderExpr($$$(container).getSlotArg(slotName)!.expr).tpl)
    ).toEqual(uids([a, b, c]));
    return expect(uids([a, b, c].map((x) => x.parent))).toEqual(
      uids([container, container, container])
    );
  };
  beforeEach(function () {
    container = tpls.mkTplTag(
      "div",
      (allWrapped = [
        (preWrapped = tpls.mkTplTag("div", mkTplTestText("pre"))),
        (oneWrapped = tpls.mkTplTag("div", mkTplTestText("one"))),
        (postWrapped = tpls.mkTplTag("div", mkTplTestText("post"))),
      ])
    );
    wrapper = tpls.mkTplTag("div");
    deep1 = tpls.mkTplTagX("div", {}, [
      (deep2 = tpls.mkTplTagX("div", {}, [
        (deep3 = tpls.mkTplTagX("div", {}, [
          (deep4 = tpls.mkTplTagX("div", {}, [])),
        ])),
      ])),
    ]);
  });
  const uids = (xs) => xs.map((x) => x.uid);
  const $uids = (x) => uids(x.toArray());
  describe("clear", () => {
    it("clears parent pointers", () => {
      $$$(container).clear();
      expect(allWrapped.map((n) => n.parent)).toEqual([null, null, null]);
    });
  });
  describe("replaceChildren", () => {
    it("clears parent pointers", () => {
      $$$(container).replaceChildren([mkTplTagSimple("div")]);
      expect(allWrapped.map((n) => n.parent)).toEqual([null, null, null]);
    });
  });
  describe("wrap", function () {
    it("should work", function () {
      expect($uids($$$(oneWrapped).wrap(wrapper))).toEqual(uids([oneWrapped]));
      checkTplIntegrity(container);
      expect(uids(container.children)).toEqual(
        uids([preWrapped, wrapper, postWrapped])
      );
      expect(uids(wrapper.children)).toEqual(uids([oneWrapped]));
      expect(uids([oneWrapped.parent])).toEqual(uids([wrapper]));
    });
    it("works on component root", () => {
      const component = mkComponent({
        name: "SomeComponent",
        tplTree: tpls.mkTplTag("div"),
        type: ComponentType.Plain,
      });

      const origRoot = ensure(component.tplTree, "Should exist");
      const newRoot = tpls.mkTplTag("div");
      $$$(origRoot).wrap(newRoot);
      expect(uids([component.tplTree])).toEqual(uids([newRoot]));
      expect(origRoot.parent).toBe(newRoot);
      expect(tpls.getTplOwnerComponent(newRoot)).toBe(component);
      expect(uids(newRoot.children)).toEqual(uids([origRoot]));
    });
    it("should work on TplComponent wrapper", function () {
      wrapper = tpls.mkTplComponentX({
        component: componentWithSlots,
        baseVariant: TEST_GLOBAL_VARIANT,
      });
      $$$(oneWrapped).wrap(wrapper);
      expect(uids(container.children)).toEqual(
        uids([preWrapped, wrapper, postWrapped])
      );
      expect(uids([wrapper.parent])).toEqual(uids([container]));
      expect(
        uids(
          ensureKnownRenderExpr($$$(wrapper).getSlotArg("children")!.expr).tpl
        )
      ).toEqual(uids([oneWrapped]));
      expect(uids([oneWrapped.parent])).toEqual(uids([wrapper]));
    });
    return describe("on TplComponent parent", function () {
      let h1, h2, h3, h4;
      container = h1 = h2 = h3 = h4 = null;
      beforeEach(() => {
        container = tpls.mkTplComponentX({
          component: Components.mkComponent({
            name: "TestComponent",
            params: [
              mkParam({
                name: "children",
                type: typeFactory.renderable(),
                exportType: ParamExportType.External,
                paramType: "slot",
              }),
              mkParam({
                name: "someSlot",
                type: typeFactory.renderable(),
                exportType: ParamExportType.External,
                paramType: "slot",
              }),
              mkParam({
                name: "anotherSlot",
                type: typeFactory.renderable(),
                exportType: ParamExportType.External,
                paramType: "slot",
              }),
            ],
            tplTree: tpls.mkTplTagX("div"),
            type: ComponentType.Plain,
          }),
          args: {
            children: new RenderExpr({
              tpl: tuple(
                (h1 = tpls.mkTplTagX("h1")),
                (h2 = tpls.mkTplTagX("h2"))
              ),
            }),
            someSlot: new RenderExpr({
              tpl: tuple(
                (h3 = tpls.mkTplTagX("h3")),
                (h4 = tpls.mkTplTagX("h4"))
              ),
            }),
            anotherSlot: new RenderExpr({
              tpl: tuple(tpls.mkTplTagX("h5"), tpls.mkTplTagX("h6")),
            }),
          },
          baseVariant: TEST_GLOBAL_VARIANT,
        });
      });
      it("should work on children arg", function () {
        $$$(h2).wrap(wrapper);
        expect(
          uids(
            ensureKnownRenderExpr($$$(container).getSlotArg("children")!.expr)
              .tpl
          )
        ).toEqual(uids(tuple(h1, wrapper)));
        expect(uids([wrapper.parent])).toEqual(uids([container]));
        expect(uids(wrapper.children)).toEqual(uids([h2]));
        return expect(uids([h2.parent])).toEqual(uids([wrapper]));
      });
      return it("should work on other slots", function () {
        $$$(h4).wrap(wrapper);
        expect(
          uids(
            ensureKnownRenderExpr($$$(container).getSlotArg("someSlot")!.expr)
              .tpl
          )
        ).toEqual(uids(tuple(h3, wrapper)));
        expect(uids([wrapper.parent])).toEqual(uids([container]));
        expect(uids(wrapper.children)).toEqual(uids([h4]));
        return expect(uids([h4.parent])).toEqual(uids([wrapper]));
      });
    });
  });
  describe("wrapInner", () =>
    it("should work", function () {
      expect($uids($$$(container).wrapInner(wrapper))).toEqual(
        uids([container])
      );
      expect(uids(container.children)).toEqual(uids([wrapper]));
      expect(uids(wrapper.children)).toEqual(uids(allWrapped));
      expect(uids([wrapper.parent])).toEqual(uids([container]));
      return expect(uids([oneWrapped.parent])).toEqual(uids([wrapper]));
    }));
  describe("constructor", function () {
    it("should auto-wrap individual elements", () =>
      expect($uids($$$(oneWrapped))).toEqual($uids($$$([oneWrapped]))));
    return it("should dedupe", () =>
      expect($uids($$$(allWrapped.concat(allWrapped)))).toEqual(
        uids(allWrapped)
      ));
  });
  describe("add", function () {
    it("should auto-wrap individual elements", () =>
      expect($uids($$$(preWrapped).add(postWrapped))).toEqual(
        uids(tuple(preWrapped, postWrapped))
      ));
    it("should take arrays", () =>
      expect(
        $uids($$$(preWrapped).add(tuple(oneWrapped, postWrapped)))
      ).toEqual(uids([preWrapped, oneWrapped, postWrapped])));
    return it("should take TplQuery objects", () =>
      expect($uids($$$(preWrapped).add($$$(postWrapped)))).toEqual(
        uids(tuple(preWrapped, postWrapped))
      ));
  });
  describe("parents", function () {
    it("should return all ancestors except self", () =>
      expect($uids($$$(deep4).parents())).toEqual(uids([deep3, deep2, deep1])));
    return it("should return ancestors for all selected", () =>
      expect($uids($$$([deep4, deep3, oneWrapped]).parents())).toEqual(
        uids([deep3, deep2, deep1, container])
      ));
  });
  describe("closest", () =>
    it("should return argument iff argument is ancestor", function () {
      expect($uids($$$(deep4).closest(deep2))).toEqual(uids([deep2]));
      return expect($uids($$$(deep4).closest(container))).toEqual([]);
    }));
  describe("find", () =>
    it("should return argument iff argument is a descendant", function () {
      expect($uids($$$(deep1).find(deep3))).toEqual(uids([deep3]));
      return expect($uids($$$(deep1).find(container))).toEqual(uids([]));
    }));
  //describe 'richAppendOrAfter', ->
  //  it 'should append to normal element if possible', ->
  //    $$$(container).richAppendOrAfter(something)
  //    expect(container.children).toEqual(something)
  //  it 'should insert after element if cannot append', ->
  //  it 'should append to component if possible', ->
  //  it 'should insert after component if cannot append', ->
  describe("replaceWith", () => {
    it("should work", function () {
      let a, b, B, c;
      const tree = tpls.mkTplTag("div", [
        (a = tpls.mkTplTag("div", mkTplTestText("a"))),
        (b = tpls.mkTplTag("div", mkTplTestText("b"))),
        (c = tpls.mkTplTag("div", mkTplTestText("c"))),
      ]);
      $$$(b).replaceWith((B = tpls.mkTplTag("div", mkTplTestText("B"))));
      expect(uids(tree.children)).toEqual(uids([a, B, c]));
      expect(b.parent).toBe(null);
    });
    it("works on component roots", function () {
      const component = mkComponent({
        name: "SomeComponent",
        tplTree: tpls.mkTplTag("div"),
        type: ComponentType.Plain,
      });
      const origRoot = ensureKnownTplTag(component.tplTree);
      const newRoot = tpls.mkTplTag("div", mkTplTestText("B"));
      $$$(origRoot).replaceWith(newRoot);
      expect(uids([component.tplTree])).toEqual(uids([newRoot]));
      expect(origRoot.parent).toBe(null);
      expect(tpls.getTplOwnerComponent(newRoot)).toBe(component);
    });
  });
  describe("remove", () =>
    it("should remove from TplComponents", function () {
      let child;
      const tpl = tpls.mkTplComponentX({
        component: componentWithSlots,
        args: {
          children: new RenderExpr({
            tpl: [(child = tpls.mkTplTagX("div"))],
          }),
        },
        baseVariant: TEST_GLOBAL_VARIANT,
      });
      $$$(child).remove({ deep: true });
      expect(withoutUids($$$(tpl).getSlotArg("children"))).toEqual(
        withoutUids(
          new Arg({
            param: componentWithSlots.params[0],
            expr: new RenderExpr({ tpl: [] }),
          })
        )
      );
    }));
  describe("ungroup", () => {
    it("should work", () => {
      const groupedItem1 = tpls.mkTplTag("span");
      const groupedItem2 = tpls.mkTplTag("span");
      const containerGroup = tpls.mkTplTag("div", [groupedItem1, groupedItem2]);
      const root = tpls.mkTplTag("div", [
        tpls.mkTplTag("div"),
        containerGroup,
        tpls.mkTplTag("div"),
      ]);
      $$$(containerGroup).ungroup();
      expect(containerGroup.parent).toBeNull();
      expect(root.children.length).toEqual(4);
      expect(root.children[1]).toBe(groupedItem1);
      expect(root.children[2]).toBe(groupedItem2);
    });
    it("works on component roots", () => {
      const groupedItem = mkTplTestText("Hello, world!");
      const containerGroup = tpls.mkTplTag("main", groupedItem);
      const component = mkComponent({
        name: "SomeComponent",
        tplTree: containerGroup,
        type: ComponentType.Plain,
      });
      $$$(containerGroup).ungroup();
      expect(containerGroup.parent).toBeNull();
      expect(component.tplTree).toBe(groupedItem);
    });
  });
  describe("beforeAfter", () => {
    it("should work for TplComponent parent", () =>
      testExpectingComponentChildrenAbc(function (...args) {
        const [a, b, c] = Array.from(args[0]);
        return {
          initChildren: tuple(a, c),
          operation: () => $$$(c).before(b),
        };
      }));
  });
  describe("prependAppend", function () {
    it("should work for TplComponent parent", () =>
      testExpectingComponentChildrenAbc(function (...args) {
        const [a, b, c] = Array.from(args[0]);
        return {
          initChildren: tuple(b, c),
          operation: (_container) => $$$(_container).prepend(a),
        };
      }));
    it("works for alt slots", () =>
      testExpectingComponentChildrenAbc(function (...args) {
        const [a, b, c] = Array.from(args[0]);
        return {
          initChildren: tuple(b, c),
          slotName: "altSlot",
          operation: (_container) => $$$(_container).slot("altSlot").prepend(a),
        };
      }));
  });
  describe("moveForward", () => {
    it("works", () => {
      $$$(preWrapped).moveForward();
      expect(uids(container.children)).toEqual(
        uids([oneWrapped, preWrapped, postWrapped])
      );
    });
    it("clamps to ends", () => {
      $$$(postWrapped).moveForward();
      expect(uids(container.children)).toEqual(
        uids([preWrapped, oneWrapped, postWrapped])
      );
    });
  });
  describe("moveEnd", () => {
    it("works", () => {
      $$$(preWrapped).moveEnd();
      expect(uids(container.children)).toEqual(
        uids([oneWrapped, postWrapped, preWrapped])
      );
    });
  });
  describe("updateSlotArg", () => {
    testExpectingComponentChildrenAbc(function (...args) {
      const [a, b, c] = Array.from(args[0]);
      return {
        initChildren: [b, c],
        slotName: "altSlot",
        operation: (_container) =>
          $$$(_container).updateSlotArg(
            "altSlot",
            (arg) => {
              return {
                newChildren: [a],
                updateArg: () => {
                  arg.expr = new RenderExpr({
                    tpl: [a, b, c],
                  });
                },
              };
            },
            { deepRemove: true }
          ),
      };
    });
  });
  it("prevents component cycles", () => {
    const site = createSite();
    const dCompRoot = mkTplTagX("div");
    const dComp = mkComponent({
      name: "D",
      tplTree: dCompRoot,
      type: ComponentType.Plain,
    });
    const cComp = mkComponent({
      name: "C",
      tplTree: (baseVariant) =>
        mkTplComponentX({ component: dComp, baseVariant }),
      type: ComponentType.Plain,
    });
    const bCompChild = mkTplTagX("div");
    const bCompRoot = mkTplTagX("div", {}, [bCompChild]);
    const bComp = mkComponent({
      name: "B",
      tplTree: bCompRoot,
      type: ComponentType.Plain,
    });
    const aComp = mkComponent({
      name: "A",
      tplTree: (baseVariant) =>
        mkTplComponentX({ component: bComp, baseVariant }),
      type: ComponentType.Plain,
    });
    const tplMgr = new TplMgr({ site });
    for (const comp of [dComp, cComp, bComp, aComp]) {
      tplMgr.attachComponent(comp);
    }
    // Currently, A depends on B, and C depends on D.
    // Now, make D depend on A.
    $$$(dCompRoot).append(
      mkTplTagX("div", {}, [
        mkTplComponentX({
          component: aComp,
          baseVariant: getBaseVariant(dComp),
        }),
      ])
    );
    // Now close the loop by trying to make B depend on C.
    const attachment = mkTplTagX("div", {}, [
      mkTplComponentX({ component: cComp, baseVariant: getBaseVariant(bComp) }),
    ]);
    expect(() => $$$(bCompRoot).append(attachment)).toThrow();
    expect(() => $$$(bCompChild).after(attachment)).toThrow();
    expect(() => $$$(bCompChild).replaceWith(attachment)).toThrow();
    expect(() => $$$(bCompRoot).replaceChildren(attachment)).toThrow();
    expect(() => $$$(bCompRoot).replaceWith(attachment)).toThrow();

    const tplComponent = mkTplComponentX({
      component: componentWithSlots,
      baseVariant: getBaseVariant(bComp),
    });
    $$$(bCompRoot).append(tplComponent);
    expect(() =>
      $$$(bCompRoot).updateSlotArg(
        "children",
        (arg) => {
          const expr = arg.expr;
          if (isKnownRenderExpr(expr)) {
            return {
              newChildren: [attachment],
              updateArg: () => {
                expr.tpl = [attachment];
              },
            };
          } else {
            return { newChildren: [], updateArg: () => {} };
          }
        },
        { deepRemove: true }
      )
    ).toThrow();
  });
});
