import { NodeMarker, RawText, RenderExpr, StyleMarker } from "../classes";
import { ensureType } from "../common";
import { codeLit } from "../exprs";
import { PlasmicElement } from "../shared/element-repr/element-repr-v2";
import { tplToPlasmicElements } from "../shared/element-repr/gen-element-repr-v2";
import { ensureBaseVariant } from "../shared/TplMgr";
import { ensureBaseVariantSetting } from "../shared/VariantTplMgr";
import { mkRuleSet } from "../styles";
import { componentLib } from "../test/eval";
import {
  mkTplComponent,
  mkTplInlinedText,
  mkTplTagX,
  TplTagType,
} from "../tpls";

describe("gen-element-types", () => {
  it("handles components and props", () => {
    const rootComponent = componentLib.NumDisp;
    const tpl = mkTplComponent(
      rootComponent,
      ensureBaseVariant(rootComponent),
      { input: codeLit(42) }
    );
    expect(tplToPlasmicElements(tpl)).toEqual(
      ensureType<PlasmicElement>({
        type: "component",
        name: "NumDisp",
        props: {
          input: 42,
        },
      })
    );
  });
  it("handles components and slots", () => {
    const rootComponent = componentLib.Slotted();
    const tpl = mkTplComponent(
      rootComponent,
      ensureBaseVariant(rootComponent),
      {
        children: new RenderExpr({
          tpl: [mkTplTagX("div"), mkTplTagX("div")],
        }),
      }
    );
    expect(tplToPlasmicElements(tpl)).toEqual(
      ensureType<PlasmicElement>({
        type: "component",
        name: "Slotted",
        props: {
          children: [
            {
              type: "box",
              children: [],
            },
            {
              type: "box",
              children: [],
            },
          ],
        },
      })
    );
  });
  it("handles rich text", () => {
    const tpl = mkTplTagX("div", {
      type: TplTagType.Text,
    });
    const someOwnerComponent = componentLib.TextDisp;
    const variantSetting = ensureBaseVariantSetting(someOwnerComponent, tpl);
    variantSetting.text = new RawText({
      text: "Hello world!\n[child]\nWhat up!",
      markers: [
        new StyleMarker({
          position: 6,
          length: 5,
          rs: mkRuleSet({
            values: {
              "font-weight": "bold",
            },
          }),
        }),
        new NodeMarker({
          position: 14,
          length: 7,
          tpl: mkTplInlinedText(
            "Heading",
            [ensureBaseVariant(someOwnerComponent)],
            "h1"
          ),
        }),
      ],
    });

    expect(tplToPlasmicElements(tpl)).toEqual(
      ensureType<PlasmicElement>({
        type: "text",
        value: "Hello world!\n[child]\nWhat up!",
        markers: [
          {
            type: "style",
            position: 6,
            length: 5,
            styles: {
              "font-weight": "bold",
            },
          },
          {
            type: "node",
            position: 14,
            length: 7,
            value: {
              type: "text",
              value: "Heading",
            },
          },
        ],
      })
    );
  });
  it("treats all boxes as just a list, ignoring layout and styles", () => {
    const tpl = mkTplTagX("div", {}, [mkTplTagX("div"), mkTplTagX("div")]);
    expect(tplToPlasmicElements(tpl)).toEqual(
      ensureType<PlasmicElement>({
        type: "box",
        children: [
          {
            type: "box",
            children: [],
          },
          {
            type: "box",
            children: [],
          },
        ],
      })
    );
  });
});
