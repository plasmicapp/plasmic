import { ComponentType, mkComponent } from "@/wab/shared/core/components";
import { mkParam } from "@/wab/shared/core/lang";
import { createSite } from "@/wab/shared/core/sites";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { Site } from "@/wab/shared/model/classes";
import { typeFactory } from "@/wab/shared/model/model-util";

/**
 * Creates a site with test components representing a realistic design system.
 *
 * Components and their params:
 * - Button: label (text), variant (text), disabled (bool)
 * - TextField: value (text), placeholder (text), required (bool)
 * - Card: title (text), children (slot), actions (slot)
 * - Modal: title (text), size (text), header (slot), body (slot), footer (slot)
 * - List: items (any), config (any), header (slot)
 * - Badge: count (num), color (text)
 * - UserCard: userData (any), snake_case (text), kebab-case (text)
 * - Alert: message (text), type (text)
 * - Slider: min (num), max (num), value (num)
 * - Text Field: value (text) — name with space for exact matching
 * - Container: children (slot)
 */
export function createComponentTestSite(): Site {
  const site = createSite();

  site.components.push(
    mkComponent({
      name: "Button",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "label", type: typeFactory.text() }),
        mkParam({
          paramType: "prop",
          name: "variant",
          type: typeFactory.text(),
        }),
        mkParam({
          paramType: "prop",
          name: "disabled",
          type: typeFactory.bool(),
        }),
      ],
      tplTree: mkTplTagX("button"),
    }),
    mkComponent({
      name: "TextField",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "value", type: typeFactory.text() }),
        mkParam({
          paramType: "prop",
          name: "placeholder",
          type: typeFactory.text(),
        }),
        mkParam({
          paramType: "prop",
          name: "required",
          type: typeFactory.bool(),
        }),
      ],
      tplTree: mkTplTagX("input"),
    }),
    mkComponent({
      name: "Card",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "title", type: typeFactory.text() }),
        mkParam({
          paramType: "slot",
          name: "children",
          type: typeFactory.renderable(),
        }),
        mkParam({
          paramType: "slot",
          name: "actions",
          type: typeFactory.renderable(),
        }),
      ],
      tplTree: mkTplTagX("div"),
    }),
    mkComponent({
      name: "Modal",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "title", type: typeFactory.text() }),
        mkParam({ paramType: "prop", name: "size", type: typeFactory.text() }),
        mkParam({
          paramType: "slot",
          name: "header",
          type: typeFactory.renderable(),
        }),
        mkParam({
          paramType: "slot",
          name: "body",
          type: typeFactory.renderable(),
        }),
        mkParam({
          paramType: "slot",
          name: "footer",
          type: typeFactory.renderable(),
        }),
      ],
      tplTree: mkTplTagX("div"),
    }),
    mkComponent({
      name: "List",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "items", type: typeFactory.any() }),
        mkParam({ paramType: "prop", name: "config", type: typeFactory.any() }),
        mkParam({
          paramType: "slot",
          name: "header",
          type: typeFactory.renderable(),
        }),
      ],
      tplTree: mkTplTagX("ul"),
    }),
    mkComponent({
      name: "Badge",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "count", type: typeFactory.num() }),
        mkParam({ paramType: "prop", name: "color", type: typeFactory.text() }),
      ],
      tplTree: mkTplTagX("span"),
    }),
    mkComponent({
      name: "UserCard",
      type: ComponentType.Plain,
      params: [
        mkParam({
          paramType: "prop",
          name: "userData",
          type: typeFactory.any(),
        }),
        mkParam({
          paramType: "prop",
          name: "snake_case",
          type: typeFactory.text(),
        }),
        mkParam({
          paramType: "prop",
          name: "kebab-case",
          type: typeFactory.text(),
        }),
      ],
      tplTree: mkTplTagX("div"),
    }),
    mkComponent({
      name: "Alert",
      type: ComponentType.Plain,
      params: [
        mkParam({
          paramType: "prop",
          name: "message",
          type: typeFactory.text(),
        }),
        mkParam({ paramType: "prop", name: "type", type: typeFactory.text() }),
      ],
      tplTree: mkTplTagX("div"),
    }),
    mkComponent({
      name: "Slider",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "min", type: typeFactory.num() }),
        mkParam({ paramType: "prop", name: "max", type: typeFactory.num() }),
        mkParam({ paramType: "prop", name: "value", type: typeFactory.num() }),
      ],
      tplTree: mkTplTagX("input"),
    }),
    mkComponent({
      name: "Text Field",
      type: ComponentType.Plain,
      params: [
        mkParam({ paramType: "prop", name: "value", type: typeFactory.text() }),
      ],
      tplTree: mkTplTagX("input"),
    }),
    mkComponent({
      name: "Container",
      type: ComponentType.Plain,
      params: [
        mkParam({
          paramType: "slot",
          name: "children",
          type: typeFactory.renderable(),
        }),
      ],
      tplTree: mkTplTagX("div"),
    })
  );

  return site;
}
