import { RawText, TplNode } from "@/wab/classes";
import { AppCtx } from "@/wab/client/app-ctx";
import { SiteOps } from "@/wab/client/components/canvas/site-ops";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assertNever, withoutNils } from "@/wab/common";
import { code } from "@/wab/exprs";
import { ImageAssetType } from "@/wab/image-asset-type";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { TplTagType } from "@/wab/tpls";

export type WIStyles = Record<string, Record<string, string>>;

export type SanitizedWIStyles = Record<
  string,
  {
    safe: Record<string, string>;
    unsafe: Record<string, string>;
  }
>;

export interface WIBase {
  type: string;
  tag: string;
  unsanitizedStyles: WIStyles;
  styles: SanitizedWIStyles;
}

export interface WIContainer extends WIBase {
  type: "container";
  children: WIElement[];
  attrs: Record<string, string>;
}

export interface WIText extends WIBase {
  type: "text";
  text: string;
}

export interface WISVG extends WIBase {
  type: "svg";
  outerHtml: string;
  width: number;
  height: number;
}

export interface WIComponent extends WIBase {
  type: "component";
  component: string;
}

export type WIElement = WIContainer | WIText | WISVG | WIComponent;

export const WI_IMPORTER_HEADER = "__wab_plasmic_wi_importer;";

export function wiTreeToTpl(
  wiTree: WIElement,
  vc: ViewCtx,
  vtm: VariantTplMgr,
  siteOps: SiteOps,
  appCtx: AppCtx
) {
  const site = vc.studioCtx.site;
  const activeScreenVariantGroup = site.activeScreenVariantGroup;
  const screenVariant = activeScreenVariantGroup?.variants?.[0];

  function applyWIStylesToTpl(
    node: WIText | WIContainer | WIComponent,
    tpl: TplNode
  ) {
    const vs = vtm.ensureBaseVariantSetting(tpl);

    const defaultStyles: Record<string, string> =
      node.type === "text"
        ? {}
        : {
            display: "flex",
            flexDirection: "column",
          };

    const baseStyles = {
      ...defaultStyles,
      ...node.styles["base"]?.safe,
    };

    const unsafeBaseStyles = {
      ...node.styles["base"]?.unsafe,
    };

    RSH(vs.rs, tpl).merge(baseStyles);
    if (Object.keys(unsafeBaseStyles).length > 0) {
      vs.attrs["style"] = code(JSON.stringify(unsafeBaseStyles));
    }

    const nonBase = Object.keys(node.styles).filter((k) => k !== "base");
    if (nonBase.length > 0 && screenVariant) {
      const safeNonBaseStyles = nonBase.reduce((acc, k) => {
        return {
          ...acc,
          ...node.styles[k]?.safe,
        };
      }, {});

      const unsafeNonBaseStyles = nonBase.reduce((acc, k) => {
        return {
          ...acc,
          ...node.styles[k]?.unsafe,
        };
      }, {});
      const screenVs = vtm.ensureVariantSetting(tpl, [screenVariant]);

      RSH(screenVs.rs, tpl).merge(safeNonBaseStyles);
      if (Object.keys(unsafeNonBaseStyles).length > 0) {
        screenVs.attrs["style"] = code(
          JSON.stringify({
            ...unsafeBaseStyles,
            ...unsafeNonBaseStyles,
          })
        );
      }
    }
  }

  function rec(node: WIElement) {
    if (node.type === "text") {
      const tpl = vtm.mkTplTagX(node.tag, {
        type: TplTagType.Text,
      });
      const vs = vtm.ensureBaseVariantSetting(tpl);
      vs.text = new RawText({
        markers: [],
        text: node.text,
      });
      applyWIStylesToTpl(node, tpl);
      return tpl;
    }

    if (node.type === "svg") {
      return null;
    }

    if (node.type === "component") {
      const component = site.components.find((c) => c.name === node.component);
      if (component) {
        const tplComponent = vtm.mkTplComponentX({
          component,
        });
        applyWIStylesToTpl(node, tplComponent);
        return tplComponent;
      }
      return null;
    }

    if (node.tag === "img") {
      const getSrc = () => {
        if (node.attrs.srcset) {
          const options = node.attrs.srcset.split("\n");
          const src = options[options.length - 1].split(" ")[0];
          return src;
        }
        return node.attrs.src;
      };

      const tpl = vtm.mkTplImage({
        attrs: {
          src: code(JSON.stringify(getSrc())),
        },
        type: ImageAssetType.Picture,
      });
      applyWIStylesToTpl(node, tpl);
      return tpl;
    }

    if (node.type === "container") {
      const tpl = vtm.mkTplTagX(
        node.tag,
        {
          name: node.attrs["__name"],
          type: TplTagType.Other,
        },
        withoutNils(node.children.map((child) => rec(child)))
      );

      applyWIStylesToTpl(node, tpl);

      return tpl;
    }

    assertNever(node);
  }

  const tpl = rec(wiTree);

  return tpl;
}
