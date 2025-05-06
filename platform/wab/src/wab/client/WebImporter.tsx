import {
  PasteArgs,
  PasteResult,
  ensureViewCtxOrThrowUserError,
} from "@/wab/client/clipboard/common";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  WIComponent,
  WIContainer,
  WIElement,
  WIText,
} from "@/wab/client/web-importer/types";
import { unwrap } from "@/wab/commons/failable-utils";
import { assertNever, withoutNils } from "@/wab/shared/common";
import { code } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { TplTagType } from "@/wab/shared/core/tpls";
import { RawText, TplNode } from "@/wab/shared/model/classes";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";

const WI_IMPORTER_HEADER = "__wab_plasmic_wi_importer;";

export async function pasteFromWebImporter(
  text,
  pasteArgs: PasteArgs
): Promise<PasteResult> {
  if (!text.startsWith(WI_IMPORTER_HEADER)) {
    return {
      handled: false,
    };
  }

  const wiTree = JSON.parse(
    text.substring(WI_IMPORTER_HEADER.length)
  ) as WIElement;

  return processWebImporterTree(wiTree, pasteArgs);
}

export async function processWebImporterTree(
  wiTree: WIElement,
  { studioCtx, cursorClientPt, insertRelLoc }: PasteArgs
): Promise<PasteResult> {
  const viewCtx = ensureViewCtxOrThrowUserError(studioCtx);

  return {
    handled: true,
    success: unwrap(
      await studioCtx.change(({ success }) => {
        const tpl = wiTreeToTpl(wiTree, viewCtx, viewCtx.variantTplMgr());
        if (!tpl) {
          return success(false);
        }

        return success(
          viewCtx.viewOps.pasteNode(
            tpl,
            cursorClientPt,
            undefined,
            insertRelLoc
          )
        );
      })
    ),
  };
}

function wiTreeToTpl(wiTree: WIElement, vc: ViewCtx, vtm: VariantTplMgr) {
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
