import { FocusHeuristics } from "@/wab/client/focus-heuristics";
import { ComponentCtx } from "@/wab/client/studio-ctx/component-ctx";
import { ensure, ensureInstance, maybe, tuple } from "@/wab/shared/common";
import * as Components from "@/wab/shared/core/components";
import { ComponentType } from "@/wab/shared/core/components";
import * as Lang from "@/wab/shared/core/lang";
import { TplMgr } from "@/wab/shared/TplMgr";
import { ValState } from "@/wab/shared/eval/val-state";
import { TplComponent, TplNode } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { createSite } from "@/wab/shared/core/sites";
import {
  TEST_GLOBAL_VARIANT,
  buildValTree,
  mkTplTestText,
  renderStateForTests,
} from "@/wab/test/tpls";
import * as Tpls from "@/wab/shared/core/tpls";
import { mkTplComponentX } from "@/wab/shared/core/tpls";
import * as ValNodes from "@/wab/shared/core/val-nodes";
import {
  ValComponent,
  ValNode,
  ValSlot,
  slotContentValNode,
} from "@/wab/shared/core/val-nodes";

describe("FocusHeuristics", function () {
  let children,
    doEval,
    evalTpl: (opts?: {
      tplTree: TplNode;
      showDefaultContentsFor?: TplComponent;
    }) => void,
    nestingSlot,
    slottedSlot,
    _spanA,
    _spanB,
    sysTree,
    valTree,
    defaultSlotChild,
    valState: ValState,
    getHeuristics: (ctx?: ComponentCtx) => FocusHeuristics;

  const componentB = Components.mkComponent({
    name: "B",
    params: [],
    tplTree: Tpls.mkTplTag("div", [(_spanB = Tpls.mkTplTag("span"))]),
    type: ComponentType.Plain,
  });
  const componentA = Components.mkComponent({
    name: "A",
    params: [],
    tplTree: Tpls.mkTplTag(
      "div",
      tuple(
        Tpls.mkTplComponent(componentB, TEST_GLOBAL_VARIANT),
        (_spanA = Tpls.mkTplTag("span"))
      )
    ),
    type: ComponentType.Plain,
  });
  const slottedComponent = Components.mkComponent({
    name: "Slotted",
    params: [
      (children = Lang.mkParam({
        name: "children",
        type: typeFactory.renderable(),
        exportType: Lang.ParamExportType.External,
        paramType: "slot",
      })),
    ],
    tplTree: Tpls.mkTplTag(
      "div",
      (slottedSlot = Tpls.mkSlot(children, [
        (defaultSlotChild = Tpls.mkTplTagX(
          "div",
          {},
          mkTplTestText("slot for children")
        )),
      ]))
    ),
    type: ComponentType.Plain,
  });
  const nestingSlottedComponent = Components.mkComponent({
    name: "Slotted",
    params: [
      (children = Lang.mkParam({
        name: "children",
        type: typeFactory.renderable(),
        exportType: Lang.ParamExportType.External,
        paramType: "slot",
      })),
    ],
    tplTree: Tpls.mkTplComponentX({
      component: slottedComponent,
      children: (nestingSlot = Tpls.mkSlot(children, [
        Tpls.mkTplTagX("div", {}, mkTplTestText("slot for children")),
      ])),
      baseVariant: TEST_GLOBAL_VARIANT,
    }),
    type: ComponentType.Plain,
  });

  const site = createSite();
  site.components.push(
    componentB,
    componentA,
    slottedComponent,
    nestingSlottedComponent
  );

  beforeEach(function () {
    evalTpl = function (
      opts = {
        tplTree: Tpls.mkTplTag("div", [
          Tpls.mkTplComponent(componentA, TEST_GLOBAL_VARIANT), // 2-deep
          Tpls.mkTplComponent(componentB, TEST_GLOBAL_VARIANT), // 1-deep
          Tpls.mkTplTag("span"), // 0-deep
        ]),
      }
    ) {
      const tplMgr = new TplMgr({ site });
      doEval = function () {
        const rootComp = tplMgr.addComponent();
        rootComp.tplTree = opts.tplTree;
        const root = mkTplComponentX({
          component: rootComp,
          baseVariant: TEST_GLOBAL_VARIANT,
        });
        sysTree = buildValTree(root);
        valTree = sysTree.contents[0];
        valState = new ValState({
          sysRoot: sysTree,
          globalRoot: sysTree,
        });

        getHeuristics = (ctx?: ComponentCtx) => {
          const currentComponentCtx = ctx
            ? new ComponentCtx({
                valComponent: ensureInstance(
                  renderStateForTests.key2val(ctx.valComponent().key),
                  ValComponent
                ),
              })
            : null;
          return new FocusHeuristics(
            site,
            tplMgr,
            valState,
            currentComponentCtx,
            !!opts.showDefaultContentsFor
          );
        };
      };
      doEval();
    };
  });

  describe("parentComponents", () =>
    it("should work", function () {
      evalTpl();
      const fh = getHeuristics();
      expect(fh.parentComponents(valTree.children[2])).toEqual([]);
      expect(fh.parentComponents(valTree.children[1])).toEqual([]);
      expect(fh.parentComponents(valTree.children[1].contents[0])).toEqual([
        valTree.children[1],
      ]);
      expect(
        fh.parentComponents(valTree.children[1].contents[0].children[0])
      ).toEqual([valTree.children[1]]);
      expect(
        fh.parentComponents(valTree.children[0].contents[0].children[1])
      ).toEqual([valTree.children[0]]);
      expect(
        fh.parentComponents(
          valTree.children[0].contents[0].children[0].contents[0].children[0]
        )
      ).toEqual([
        valTree.children[0].contents[0].children[0],
        valTree.children[0],
      ]);
    }));

  describe("containingComponentWithinCurrentComponentCtx", function () {
    it("should work with null currentComponentCtx", function () {
      evalTpl();
      const fh = getHeuristics();
      expect(
        fh.containingComponentWithinCurrentComponentCtx(valTree.children[2])
      ).toBe(null);
      expect(
        fh.containingComponentWithinCurrentComponentCtx(valTree.children[1])
      ).toBe(null);
      expect(
        ensure(
          fh.containingComponentWithinCurrentComponentCtx(
            valTree.children[1].contents[0]
          ),
          () => `Didn't find valComp`
        ).container
      ).toBe(valTree.children[1]);
      expect(
        ensure(
          fh.containingComponentWithinCurrentComponentCtx(
            valTree.children[1].contents[0].children[0]
          ),
          () => `Didn't find valComp`
        ).container
      ).toBe(valTree.children[1]);
      expect(
        ensure(
          fh.containingComponentWithinCurrentComponentCtx(
            valTree.children[0].contents[0].children[1]
          ),
          () => `Didn't find valComp`
        ).container
      ).toBe(valTree.children[0]);
      return expect(
        ensure(
          fh.containingComponentWithinCurrentComponentCtx(
            valTree.children[0].contents[0].children[0].contents[0].children[0]
          ),
          () => `Didn't find valComp`
        ).container
      ).toBe(valTree.children[0]);
    });

    it("should work with currentComponentCtx", function () {
      evalTpl();
      let fh = getHeuristics(
        new ComponentCtx({
          valComponent: valTree.children[1],
        })
      );
      expect(
        fh.containingComponentWithinCurrentComponentCtx(
          valTree.children[1].contents[0]
        )
      ).toBe(null);
      expect(
        fh.containingComponentWithinCurrentComponentCtx(
          valTree.children[1].contents[0].children[0]
        )
      ).toBe(null);

      fh = getHeuristics(
        new ComponentCtx({
          valComponent: valTree.children[0],
        })
      );
      expect(
        fh.containingComponentWithinCurrentComponentCtx(
          valTree.children[0].contents[0].children[1]
        )
      ).toBe(null);
      expect(
        ensure(
          fh.containingComponentWithinCurrentComponentCtx(
            valTree.children[0].contents[0].children[0].contents[0].children[0]
          ),
          () => `Didn't find valComp`
        ).container
      ).toBe(valTree.children[0].contents[0].children[0]);
    });

    return describe("from inside a slotted component", function () {
      // DEAD There's no more defaultContents.
      it.skip("should stay put if target is slot still rendering default contents (no arg was passed in)", function () {
        evalTpl({
          tplTree: Tpls.mkTplTag(
            "div",
            Tpls.mkTplComponent(slottedComponent, TEST_GLOBAL_VARIANT)
          ),
        });
        const fh = getHeuristics(
          new ComponentCtx({
            valComponent: valTree.children[0],
          })
        );
        expect(
          fh.containingComponentWithinCurrentComponentCtx(
            valTree.children[0].contents[0].children[0].contents[0] // defaultContents
          )
        ).toBe(null);
      });

      it("should return null container if target is slot arg passed in from top level", function () {
        evalTpl({
          tplTree: Tpls.mkTplTag(
            "div",
            Tpls.mkTplComponentX({
              component: slottedComponent,
              children: Tpls.mkTplTag("span"),
              baseVariant: TEST_GLOBAL_VARIANT,
            })
          ),
        });
        const fh = getHeuristics(
          new ComponentCtx({
            valComponent: valTree.children[0],
          })
        );
        return expect(
          ensure(
            fh.containingComponentWithinCurrentComponentCtx(
              slotContentValNode(
                valTree.children[0].contents[0].children[0].contents[0]
              ) // span
            ),
            () => `Didn't find valComp`
          ).container
        ).toBe(null);
      });

      it("should return parent container if target is slot arg passed in from above", function () {
        evalTpl({
          tplTree: Tpls.mkTplTag(
            "div",
            Tpls.mkTplComponentX({
              component: nestingSlottedComponent,
              children: Tpls.mkTplTag("span"),
              baseVariant: TEST_GLOBAL_VARIANT,
            })
          ),
        });
        // div > nesting > slotted > div > slotted's slot > nesting's slot > span
        //   child     cont      cont  child            cont             cont
        const fh = getHeuristics(
          new ComponentCtx({
            valComponent: valTree.children[0].contents[0],
          })
        );
        return expect(
          ensure(
            fh.containingComponentWithinCurrentComponentCtx(
              slotContentValNode(
                valTree.children[0].contents[0].contents[0].children[0]
                  .contents[0]
              ) // nesting's slot passed into slotted
            ),
            () => `Didn't find valComp`
          ).container
        ).toBe(valTree.children[0]);
      });

      return it("should go up one level at a time if target is slot arg passed in from multiple levels up", function () {
        evalTpl({
          tplTree: Tpls.mkTplTag(
            "div",
            Tpls.mkTplComponentX({
              component: nestingSlottedComponent,
              children: Tpls.mkTplTag("span"),
              baseVariant: TEST_GLOBAL_VARIANT,
            })
          ),
        });
        const fh = getHeuristics(
          new ComponentCtx({
            valComponent: valTree.children[0].contents[0],
          })
        );
        return expect(
          ensure(
            fh.containingComponentWithinCurrentComponentCtx(
              slotContentValNode(
                ensureInstance(
                  slotContentValNode(
                    valTree.children[0].contents[0].contents[0].children[0]
                      .contents[0]
                  ),
                  ValSlot
                ).contents![0]
              ) // span
            ),
            () => `Didn't find valComp`
          ).container
        ).toBe(valTree.children[0]);
      });
    });
  });

  describe("bestFocusTarget", function () {
    let test: (args: {
      desiredFocus: ValNode;
      newFocus?: ValNode;
      newComponent?: ValComponent | "none";
    }) => void;
    let activate: (comp: ValComponent | null) => void;
    let currentCtx: ComponentCtx | null;

    beforeEach(function () {
      evalTpl();
      activate = function (component) {
        currentCtx =
          component != null
            ? new ComponentCtx({ valComponent: component })
            : null;
      };
      test = function ({ desiredFocus, newFocus, newComponent }) {
        newComponent =
          newComponent ?? maybe(currentCtx, (x) => x.valComponent()) ?? "none";
        newFocus = newFocus ?? desiredFocus;
        const fh = getHeuristics(currentCtx || undefined);
        const bestFocus = fh.bestFocusTarget(desiredFocus, { exact: true });
        const expectedFocus = {
          componentCtx:
            newComponent === "none"
              ? null
              : new ComponentCtx({ valComponent: newComponent }),
          focusTarget: newFocus,
        };
        expect(bestFocus.componentCtx?.valComponent()).toBe(
          expectedFocus.componentCtx?.valComponent()
        );
        expect(bestFocus.focusTarget).toBe(expectedFocus.focusTarget);
      };
    });

    it("should work with null currentComponentCtx", function () {
      activate(null);
      test({
        desiredFocus: valTree.children[2],
      });
      test({
        desiredFocus: valTree.children[1],
      });
      test({
        desiredFocus: valTree.children[1].contents[0],
        newFocus: valTree.children[1],
      });
      test({
        desiredFocus: valTree.children[1].contents[0].children[0],
        newFocus: valTree.children[1],
      });
      test({
        desiredFocus: valTree.children[0].contents[0].children[1],
        newFocus: valTree.children[0],
      });
      return test({
        desiredFocus:
          valTree.children[0].contents[0].children[0].contents[0].children[0],
        newFocus: valTree.children[0],
      });
    });

    it("should support clicking on something directly in the current component", function () {
      activate(valTree.children[1]);
      test({
        desiredFocus: valTree.children[1].contents[0],
      });
      test({
        desiredFocus: valTree.children[1].contents[0].children[0],
      });
      activate(valTree.children[0]);
      return test({
        desiredFocus: valTree.children[0].contents[0].children[1],
      });
    });

    it("should support clicking on something that may be in a sub-component", function () {
      activate(valTree.children[0]);
      return test({
        desiredFocus:
          valTree.children[0].contents[0].children[0].contents[0].children[0],
        newFocus: valTree.children[0].contents[0].children[0],
      });
    });

    it("should support moving back up to top of stack", function () {
      activate(valTree.children[1]);
      test({
        desiredFocus: valTree.children[1],
        newComponent: "none",
      });
      test({
        desiredFocus: valTree,
        newComponent: "none",
      });
    });

    it("should support moving back up to a higher component in the stack", function () {
      activate(valTree.children[0].contents[0].children[0]);
      return test({
        desiredFocus: valTree.children[0].contents[0].children[1],
        newComponent: valTree.children[0],
      });
    });

    it("should support moving up when targeting the currently active component itself", function () {
      activate(valTree.children[0].contents[0].children[0]);
      return test({
        desiredFocus: valTree.children[0].contents[0].children[0],
        newComponent: valTree.children[0],
      });
    });

    it("should support moving multiple steps up the stack", function () {
      activate(valTree.children[0].contents[0].children[0]);
      return test({
        desiredFocus: valTree,
        newComponent: "none",
      });
    });

    it('should support selecting the next-closer sub-component (a "deep-lateral move")', function () {
      activate(valTree.children[1]);
      return test({
        desiredFocus: valTree.children[0].contents[0].children[0].contents[0],
        newComponent: "none",
        newFocus: valTree.children[0],
      });
    });

    it("should select slot when trying to select slot content", function () {
      let target;
      evalTpl({
        tplTree: Tpls.mkTplTag(
          "div",
          Tpls.mkTplComponentX({
            component: slottedComponent,
            children: (target = Tpls.mkTplTag("span")),
            baseVariant: TEST_GLOBAL_VARIANT,
          })
        ),
      });
      activate(valTree.children[0]);
      return test({
        desiredFocus: ensure(
          ValNodes.flattenVals(valTree).find((v) => v.tpl === target),
          () => `Didn't find node`
        ), // .children[0].contents[0].children[0].contents[0] # span
        newFocus: ValNodes.flattenVals(valTree).find(
          (v) => v.tpl === slottedSlot
        ),
      });
    });

    it("should select slot belonging to current context component when trying to select slot content even if slot content is itself passed as slot arg to another (nested) slotted component", function () {
      let target;
      evalTpl({
        tplTree: Tpls.mkTplTag(
          "div",
          Tpls.mkTplComponentX({
            component: nestingSlottedComponent,
            children: (target = Tpls.mkTplTag("span")),
            baseVariant: TEST_GLOBAL_VARIANT,
          })
        ),
      });
      activate(valTree.children[0]);
      return test({
        desiredFocus: ensure(
          ValNodes.flattenVals(valTree).find((v) => v.tpl === target),
          () => `Didn't find node`
        ),
        newFocus: ValNodes.flattenVals(valTree).find(
          (v) => v.tpl === nestingSlot
        ),
      });
    });

    it("should select slot belonging to current context valcomponent instance when trying to select slot content that is under another component slot where that component was passed in as current component slot arg (and not being fooled by the fact that it is under another valcomponent instance of the same component!)", function () {
      let target;
      evalTpl({
        tplTree: Tpls.mkTplTag(
          "div",
          Tpls.mkTplComponentX({
            component: slottedComponent,
            children: Tpls.mkTplComponentX({
              component: slottedComponent,
              children: (target = Tpls.mkTplTag("span")),
              baseVariant: TEST_GLOBAL_VARIANT,
            }),
            baseVariant: TEST_GLOBAL_VARIANT,
          })
        ),
      });
      activate(valTree.children[0]);
      return test({
        desiredFocus: ensure(
          ValNodes.flattenVals(valTree).find((v) => v.tpl === target),
          () => `Didn't find node`
        ),
        newFocus: ValNodes.flattenVals(valTree).find(
          (v) => v.tpl === slottedSlot
        ),
      });
    });

    it("should select val slot with component context", function () {
      evalTpl({
        tplTree: Tpls.mkTplTag(
          "div",
          Tpls.mkTplComponent(slottedComponent, TEST_GLOBAL_VARIANT)
        ),
      });
      activate(valTree.children[0]);
      return test({
        desiredFocus: ensure(
          ValNodes.flattenVals(valTree).find((v) => {
            return v.tpl === slottedSlot;
          }),
          () => `Didn't find node`
        ),
      });
    });

    it("should select slot default content with component context", function () {
      const tpl = Tpls.mkTplComponent(slottedComponent, TEST_GLOBAL_VARIANT);
      evalTpl({
        tplTree: Tpls.mkTplTag("div", tpl),
        showDefaultContentsFor: tpl,
      });
      activate(valTree.children[0]);
      test({
        desiredFocus: ensure(
          ValNodes.flattenVals(valTree).find((v) => {
            return v.tpl === defaultSlotChild;
          }),
          () => `Didn't find node`
        ),
      });
    });
  });
});
