import {
  ensureViewCtxOrThrowUserError,
  PasteArgs,
  PasteResult,
} from "@/wab/client/clipboard/common";
import {
  ImageAssetOpts,
  maybeUploadImage,
  readAndSanitizeSvgXmlAsImage,
  ResizableImage,
} from "@/wab/client/dom-utils";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { WIElement } from "@/wab/client/web-importer/types";
import { unwrap } from "@/wab/commons/failable-utils";
import { assertNever, withoutNils } from "@/wab/shared/common";
import { code } from "@/wab/shared/core/exprs";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import { getTagAttrForImageAsset } from "@/wab/shared/core/image-assets";
import { getResponsiveStrategy } from "@/wab/shared/core/sites";
import { TplTagType } from "@/wab/shared/core/tpls";
import {
  ImageAssetRef,
  RawText,
  TplNode,
  TplTag,
} from "@/wab/shared/model/classes";
import { ResponsiveStrategy } from "@/wab/shared/responsiveness";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import {
  ensureVariantSetting,
  getOrderedScreenVariantSpecs,
  VariantGroupType,
} from "@/wab/shared/Variants";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import L from "lodash";

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
  const result = await wiTreeToTpl(wiTree, viewCtx, viewCtx.variantTplMgr());
  if (!result) {
    return { handled: false };
  }

  const { tpl, tplImageAssetMap } = result;

  return {
    handled: true,
    success: unwrap(
      await studioCtx.change(({ success }) => {
        // if we have any image/svg tpls we need to create their respective assets and update their attrs accordingly
        for (const [assetTpl, assetData] of tplImageAssetMap) {
          const { asset } = studioCtx
            .siteOps()
            .createImageAsset(assetData.image, assetData.options);

          const vs = ensureVariantSetting(assetTpl, []);
          const assetAttrs = L.assign(
            {
              [getTagAttrForImageAsset(asset.type as ImageAssetType)]:
                new ImageAssetRef({ asset }),
            },
            asset.type === ImageAssetType.Picture ? { loading: "lazy" } : {}
          );
          L.merge(vs.attrs, assetAttrs);
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

async function wiTreeToTpl(wiTree: WIElement, vc: ViewCtx, vtm: VariantTplMgr) {
  const site = vc.studioCtx.site;
  const activeScreenGroup = site.activeScreenVariantGroup;
  const orderedScreenVariants = activeScreenGroup
    ? getOrderedScreenVariantSpecs(site, activeScreenGroup)
    : [];
  const tplImageAssetMap = new Map<
    TplTag,
    { image: ResizableImage; options: ImageAssetOpts }
  >();

  function applyWIStylesToTpl(node: WIElement, tpl: TplNode) {
    const vs = vtm.ensureBaseVariantSetting(tpl);

    const defaultStyles: Record<string, string> =
      node.type === "text"
        ? {}
        : {
            display: "flex",
            flexDirection: "column",
          };

    if (node.type === "svg") {
      defaultStyles["width"] = node.width;
      defaultStyles["height"] = node.height;
      if (node.fillColor) {
        defaultStyles["color"] = node.fillColor;
      }
    }

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

    // Process styles for the screen variants
    for (const orderScreenVariant of orderedScreenVariants) {
      const { variant: screenVariant, screenSpec } = orderScreenVariant;
      if (!screenVariant.mediaQuery) {
        continue;
      }

      const strategy = getResponsiveStrategy(site);
      const screenWidthToMatch =
        strategy === ResponsiveStrategy.mobileFirst
          ? screenSpec.minWidth
          : screenSpec.maxWidth;

      if (!screenWidthToMatch) {
        continue;
      }

      const screenStyles =
        node.styles[`${VariantGroupType.GlobalScreen}:${screenWidthToMatch}`];

      if (!screenStyles) {
        continue;
      }

      const safeScreenStyles = screenStyles.safe;
      const unsafeScreenStyles = screenStyles.unsafe;

      const screenVs = vtm.ensureVariantSetting(tpl, [screenVariant]);

      RSH(screenVs.rs, tpl).merge(safeScreenStyles);
      if (Object.keys(unsafeScreenStyles).length > 0) {
        screenVs.attrs["style"] = code(
          JSON.stringify({
            ...unsafeBaseStyles,
            ...unsafeScreenStyles,
          })
        );
      }
    }
  }

  async function rec(node: WIElement) {
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
      const svgImage = await readAndSanitizeSvgXmlAsImage(
        vc.appCtx,
        node.outerHtml
      );

      if (svgImage) {
        const { imageResult, opts } = await maybeUploadImage(
          vc.appCtx,
          svgImage,
          undefined,
          undefined
        );
        if (!imageResult || !opts) {
          return null;
        }

        const tpl = vc.variantTplMgr().mkTplImage({
          type: opts.type,
          iconColor: opts.iconColor,
        });
        applyWIStylesToTpl(node, tpl);

        // We will store each image to it's corresponding tpl so we can process it
        // later to upload image and attach asset to this tpl in 'processWebImporterTree',
        // We cannot do that here because this function is expected to be called outside 'studioCtx.change' and
        // creating an asset here would cause a model change to occur.
        tplImageAssetMap.set(tpl, { image: imageResult, options: opts });

        return tpl;
      }
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
        withoutNils(
          await Promise.all(
            node.children.map(async (child) => await rec(child))
          )
        )
      );

      applyWIStylesToTpl(node, tpl);

      return tpl;
    }

    assertNever(node);
  }

  const tpl = await rec(wiTree);

  if (!tpl) {
    return null;
  }

  return { tpl, tplImageAssetMap };
}
