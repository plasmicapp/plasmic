import { ensureInstance } from "@/wab/shared/common";
import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { code } from "@/wab/shared/core/exprs";
import { mkParam, mkVar, ParamExportType } from "@/wab/shared/core/lang";
import {
  ensureKnownSlotParam,
  ensureKnownTplTag,
  Rep,
  TplComponent,
  TplTag,
  VarRef,
} from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";
import { assertSiteInvariants } from "@/wab/shared/site-invariants";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  mkBaseVariant,
  mkVariant,
  mkVariantSetting,
} from "@/wab/shared/Variants";
import { ensureBaseVariantSetting } from "@/wab/shared/VariantTplMgr";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTestText } from "@/wab/test/tpls";
import {
  flattenTpls,
  mkRep,
  mkSlot,
  mkTplComponentFlex,
  mkTplComponentX,
  mkTplTagX,
} from "@/wab/shared/core/tpls";

export const componentLib = {
  TextDisp: (() => {
    const comp = mkComponent({
      name: "TextDisp",
      params: [
        mkParam({
          name: "children",
          type: typeFactory.text(),
          exportType: ParamExportType.External,
          paramType: "prop",
        }),
      ],
      tplTree: (baseVariant) =>
        mkTplTagX("div", {
          baseVariant,
        }),
      type: ComponentType.Plain,
    });
    const rootVs = ensureBaseVariantSetting(comp, comp.tplTree as TplTag);
    rootVs.attrs.children = new VarRef({ variable: comp.params[0].variable });
    return comp;
  })(),
  NumDisp: (() => {
    const comp = mkComponent({
      name: "NumDisp",
      params: [
        mkParam({
          name: "input",
          type: typeFactory.num(),
          exportType: ParamExportType.External,
          paramType: "prop",
        }),
      ],
      tplTree: (baseVariant) =>
        mkTplTagX("div", {
          baseVariant,
        }),
      type: ComponentType.Plain,
    });
    const rootVs = ensureBaseVariantSetting(comp, comp.tplTree as TplTag);
    rootVs.attrs.children = new VarRef({ variable: comp.params[0].variable });
    return comp;
  })(),
  CondVariantTagStyles: () => {
    const v0 = mkBaseVariant();
    const v1 = mkVariant({
        name: "v1",
      }),
      v2 = mkVariant({
        name: "v2",
      });

    const comp = mkComponent({
      name: "CondVariantTagStyles",
      params: [
        mkParam({
          name: "p1",
          type: typeFactory.text(),
          exportType: ParamExportType.External,
          paramType: "prop",
        }),
        mkParam({
          name: "p2",
          type: typeFactory.text(),
          exportType: ParamExportType.External,
          paramType: "prop",
        }),
      ],
      variants: [v0, v1, v2],
      tplTree: mkTplTagX("div", {
        variants: [
          mkVariantSetting({ variants: [v0] }),
          mkVariantSetting({ variants: [v1] }),
        ],
      }),
      type: ComponentType.Plain,
    });
    return { comp, v1, v2 };
  },
  Slotted: () => {
    const children = mkParam({
      name: "children",
      type: typeFactory.renderable(),
      exportType: ParamExportType.External,
      paramType: "slot",
    });
    return mkComponent({
      name: "Slotted",
      params: [children],
      tplTree: mkTplTagX("div", {}, mkSlot(children)),
      type: ComponentType.Plain,
    });
  },
  MultiSlotted: () => {
    const children = mkParam({
      name: "children",
      type: typeFactory.renderable(),
      exportType: ParamExportType.External,
      paramType: "slot",
    });
    const title = mkParam({
      name: "title",
      type: typeFactory.renderable(),
      exportType: ParamExportType.External,
      paramType: "slot",
    });
    return mkComponent({
      name: "MultiSlotted",
      params: [title, children],
      tplTree: mkTplTagX("div", {}, [
        mkTplTagX("div", {}, [mkSlot(title)]),
        mkSlot(children),
      ]),
      type: ComponentType.Plain,
    });
  },
  SlottedBlackhole: (() => {
    const SlottedBlackhole = mkComponent({
      name: "SlottedBlackhole",
      params: [
        mkParam({
          name: "mySlot",
          type: typeFactory.renderable(),
          exportType: ParamExportType.External,
          paramType: "slot",
        }),
      ],
      tplTree: mkTplTagX("div"),
      type: ComponentType.Plain,
    });
    const slotParam = ensureKnownSlotParam(SlottedBlackhole.params[0]);
    SlottedBlackhole.tplTree = mkTplTagX("div", {}, [mkSlot(slotParam)]);
    return SlottedBlackhole;
  })(),
  SlottedWithProps: () => {
    const children = mkParam({
      name: "children",
      type: typeFactory.renderable(),
      exportType: ParamExportType.External,
      paramType: "slot",
    });
    return mkComponent({
      name: "Slotted",
      params: [
        mkParam({
          name: "num",
          type: typeFactory.num(),
          exportType: ParamExportType.External,
          paramType: "prop",
        }),
        children,
      ],
      tplTree: mkTplTagX("div", {}, mkSlot(children)),
      type: ComponentType.Plain,
    });
  },
  PropAndState: () => {
    return mkComponent({
      name: "PropAndState",
      params: [
        mkParam({
          name: "someProps",
          type: typeFactory.num(),
          exportType: ParamExportType.External,
          paramType: "prop",
        }),
      ],
      tplTree: mkTplTagX("div"),
      type: ComponentType.Plain,
    });
  },
  TagWithTestyText: () => {
    const v0 = mkBaseVariant();
    return mkComponent({
      name: "TagWithTestyText",
      tplTree: mkTplTagX(
        "div",
        {
          attrs: {
            title: '"Sup</> {}"',
          },
          baseVariant: v0,
        },
        [mkTplTestText('"Hey {<&there>}!"')]
      ),
      variants: [v0],
      type: ComponentType.Plain,
    });
  },
  TagWithAllAttrs: () => {
    const v0 = mkBaseVariant();
    return mkComponent({
      name: "TagWithAllAttrs",
      tplTree: mkTplTagX(
        "div",
        {
          attrs: {
            onClick: code("event => onClick(event)"),
            key: code("Math.round(0)"),
          },
          baseVariant: v0,
        },
        [mkTplTagX("input", { attrs: { type: "text" }, baseVariant: v0 })]
      ),
      variants: [v0],
      type: ComponentType.Plain,
    });
  },
  TagWithDataControls: () => {
    return mkComponent({
      name: "TagWithDataControls",
      tplTree: mkTplTagX("div", {}, [
        mkTplTagX("div", {
          dataRep: new Rep({
            element: mkVar("letter"),
            index: mkVar("index"),
            collection: code('["a","b"]'),
          }),
          dataCond: code('letter === "a"'),
        }),
      ]),
      type: ComponentType.Plain,
    });
  },
};

export const Basic = mkComponent({
  name: "Basic",
  tplTree: mkTplTagX("div", {}),
  type: ComponentType.Plain,
});
export const Wrapper1 = mkComponent({
  name: "Wrapper1",
  tplTree: (baseVariant) =>
    mkTplTagX("div", {}, mkTplComponentFlex(Basic, baseVariant)),
  type: ComponentType.Plain,
});
export const Wrapper2 = mkComponent({
  name: "Wrapper2",
  tplTree: (baseVariant) =>
    mkTplTagX("div", {}, mkTplComponentFlex(Wrapper1, baseVariant)),
  type: ComponentType.Plain,
});
export const Wrapper3 = mkComponent({
  name: "Wrapper3",
  tplTree: (baseVariant) =>
    mkTplTagX("div", {}, mkTplComponentFlex(Wrapper2, baseVariant)),
  type: ComponentType.Plain,
});

export function setupRefactorProject() {
  const component = mkComponent({
    name: "Outer",
    tplTree: (baseVariant) =>
      mkTplTagX(
        "div",
        {
          baseVariant,
          dataRep: mkRep("my num", code(`[0]`)),
        },
        [
          // mkTplTagX("div", {
          //   baseVariant,
          //   dataLets: {
          //     x: code("mynum"),
          //   },
          // }),
          mkTplTagX("div", {
            baseVariant,
            dataCond: code("myNum"),
          }),
          // mkTplTagX("div", {
          //   dataKey: code("myNum")
          // }),
          mkTplTagX("div", {
            baseVariant,
            dataRep: mkRep("i", code("myNum")),
          }),
          mkTplTagX("div", {
            baseVariant,
            attrs: {
              children: code("myNum"),
            },
          }),
          mkTplTagX("div", {
            baseVariant,
            attrs: {
              title: code("myNum"),
            },
          }),
          mkTplComponentX({
            baseVariant,
            component: componentLib.NumDisp,
            args: {
              input: code("myNum"),
            },
          }),
          // TODO add test for slot default contents
        ].map((inner) =>
          // Wrap each one in its own intermediate node, just for good measure
          // or to add some distance.
          //
          // We just add a no-op dataCond to ensure the div satisfies a
          // base-vsetting-required invariant.
          mkTplTagX("div", { baseVariant, dataCond: code("true") }, inner)
        )
      ),
    type: ComponentType.Plain,
  });

  const parts = ensureKnownTplTag(component.tplTree).children.map((child) =>
    ensureInstance(ensureKnownTplTag(child).children[0], TplTag, TplComponent)
  );
  const site = createSite();
  const tplMgr = new TplMgr({ site });
  tplMgr.attachComponent(componentLib.NumDisp);
  tplMgr.attachComponent(component);
  console.log(flattenTpls(component.tplTree));
  assertSiteInvariants(site);
  return { parts, site, tplMgr, component };
}
