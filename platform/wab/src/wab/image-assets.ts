import {
  ArenaFrame,
  Arg,
  Component,
  ImageAsset,
  isKnownImageAssetRef,
  Mixin,
  PageMeta,
  Param,
  Site,
  TplComponent,
  TplNode,
  VariantSetting,
} from "@/wab/classes";
import {
  ensure,
  findIndexes,
  mkShortId,
  notNil,
  removeAtIndexes,
  tryRemove,
  tuple,
} from "@/wab/common";
import { isFrameComponent, isPageComponent } from "@/wab/components";
import { isFallbackSet, isRealCodeExpr } from "@/wab/exprs";
import { ImageAssetType } from "@/wab/image-asset-type";
import { getArenaFrames } from "@/wab/shared/Arenas";
import { joinCssValues, splitCssValue } from "@/wab/shared/RuleSetHelpers";
import { DefaultStyle } from "@/wab/styles";
import {
  findVariantSettingsUnderTpl,
  isTplComponent,
  isTplImage,
  TplImageTag,
} from "@/wab/tpls";
import L from "lodash";

export function cloneImageAsset(asset: ImageAsset) {
  return new ImageAsset({
    uuid: mkShortId(),
    name: asset.name,
    type: asset.type,
    dataUri: asset.dataUri,
    width: asset.width,
    height: asset.height,
    aspectRatio: asset.aspectRatio,
  });
}

export function mkImageAsset(opts: {
  name: string;
  type: ImageAssetType;
  dataUri?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}) {
  return new ImageAsset({
    uuid: mkShortId(),
    name: opts.name,
    type: opts.type,
    dataUri: opts.dataUri ?? null,
    width: opts.width ?? null,
    height: opts.height ?? null,
    aspectRatio: opts.aspectRatio ?? null,
  });
}

interface ImageAssetUsageByParam {
  type: "component-param";
  component: Component;
  param: Param;
}
interface ImageAssetUsageByArg {
  type: "component-arg";
  component: Component;
  tpl: TplComponent;
  vs: VariantSetting;
  arg: Arg;
}
interface ImageAssetUsageByTplImage {
  type: "tpl-image";
  component: Component;
  tpl: TplImageTag;
  vs: VariantSetting;
}
interface ImageAssetUsageByRs {
  type: "tpl-rs";
  component: Component;
  tpl: TplNode;
  vs: VariantSetting;
}
interface ImageAssetUsageByMixin {
  type: "mixin";
  mixin: Mixin;
}
interface ImageAssetUsageByPageMeta {
  type: "page-meta";
  pageMeta: PageMeta;
}

export interface ImageAssetUsageSummary {
  components: Component[];
  frames: ArenaFrame[];
  mixins: Mixin[];
  themes: DefaultStyle[];
}

export type ImageAssetUsage =
  | ImageAssetUsageByParam
  | ImageAssetUsageByArg
  | ImageAssetUsageByTplImage
  | ImageAssetUsageByRs
  | ImageAssetUsageByMixin
  | ImageAssetUsageByPageMeta;
export function extractImageAssetUsages(
  site: Site,
  asset: ImageAsset
): [ImageAssetUsage[], ImageAssetUsageSummary] {
  const usages: ImageAssetUsage[] = [];
  const usingComponents = new Set<Component>();
  const usingMixins = new Set<Mixin>();
  const usingThemes = new Set<DefaultStyle>();
  const cssRef = mkImageAssetRef(asset);

  const addcomponent = (component: Component) => {
    usingComponents.add(component);
  };
  const traverseTpl = (tplRoot: TplNode, component: Component) => {
    for (const [vs, tpl] of findVariantSettingsUnderTpl(tplRoot)) {
      if (isTplComponent(tpl)) {
        for (const arg of vs.args) {
          if (isKnownImageAssetRef(arg.expr) && arg.expr.asset === asset) {
            usages.push({
              type: "component-arg",
              component,
              tpl,
              vs,
              arg,
            });
            addcomponent(component);
          }
        }
      }
      if (isTplImage(tpl)) {
        const attrExpr =
          tpl.tag === "img" ? vs.attrs["src"] : vs.attrs["outerHTML"];
        if (
          (isKnownImageAssetRef(attrExpr) && attrExpr.asset === asset) ||
          (isRealCodeExpr(attrExpr) &&
            isFallbackSet(attrExpr) &&
            isKnownImageAssetRef(attrExpr.fallback) &&
            attrExpr.fallback.asset === asset)
        ) {
          usages.push({
            type: "tpl-image",
            component,
            tpl,
            vs,
          });
          addcomponent(component);
        }
      } else {
        const val = vs.rs.values["background"];
        if (val && val.includes(cssRef)) {
          usages.push({
            type: "tpl-rs",
            component,
            tpl,
            vs,
          });
          addcomponent(component);
        }
      }
    }
  };

  const findUsagesInMixin = (mixin: Mixin) => {
    const val = mixin.rs.values["background"];
    if (val && val.includes(cssRef)) {
      usages.push({
        type: "mixin",
        mixin,
      });
      return true;
    }
    return false;
  };

  for (const component of site.components) {
    for (const param of component.params) {
      if (
        isKnownImageAssetRef(param.defaultExpr) &&
        param.defaultExpr.asset === asset
      ) {
        usages.push({
          type: "component-param",
          component,
          param,
        });
        usingComponents.add(component);
      }
    }
    traverseTpl(component.tplTree, component);
  }

  for (const mixin of site.mixins) {
    if (findUsagesInMixin(mixin)) {
      usingMixins.add(mixin);
    }
  }

  for (const page of site.components.filter(isPageComponent)) {
    if (page.pageMeta.openGraphImage === asset) {
      usages.push({
        type: "page-meta",
        pageMeta: page.pageMeta,
      });
      usingComponents.add(page);
    }
  }

  for (const theme of site.themes) {
    for (const style of theme.styles) {
      if (findUsagesInMixin(style.style)) {
        usingThemes.add({
          style: style.style,
          selector: style.selector,
        });
      }
    }
  }

  const arenaFrames = site.arenas.flatMap((arena) => getArenaFrames(arena));

  const usingFrames = [...usingComponents].filter(isFrameComponent).map((c) =>
    ensure(
      arenaFrames.find((frame) => frame.container.component === c),
      `ArenaFrame not found for component ${c.name}`
    )
  );

  return tuple(usages, {
    components: [...usingComponents].filter((c) => !isFrameComponent(c)),
    mixins: [...usingMixins],
    themes: [...usingThemes],
    frames: usingFrames,
  });
}

export function removeImageAssetUsage(
  asset: ImageAsset,
  usage: ImageAssetUsage
) {
  if (usage.type === "tpl-image") {
    const attr = usage.tpl.tag === "img" ? "src" : "outerHTML";
    delete usage.vs.attrs[attr];
  } else if (usage.type === "page-meta") {
    usage.pageMeta.openGraphImage = null;
  } else if (usage.type === "component-param") {
    usage.param.defaultExpr = null;
  } else if (usage.type === "component-arg") {
    tryRemove(usage.vs.args, usage.arg);
  } else {
    const cssRef = mkImageAssetRef(asset);
    const rs = usage.type === "tpl-rs" ? usage.vs.rs : usage.mixin.rs;
    const val = rs.values["background"];
    if (val) {
      const vals = splitCssValue("background", val);
      const indexes = findIndexes(vals, (v) => v.includes(cssRef));
      removeAtIndexes(vals, indexes);
      if (vals.length === 0) {
        rs.values["background"] = "none";
      } else {
        rs.values["background"] = joinCssValues("background", vals);
      }
    }
  }
}

const RE_ASSETREF = /var\(--image-([^)]+)\)/;
const RE_ASSETREF_ALL = new RegExp(RE_ASSETREF, "g");

export function tryParseImageAssetRef(
  ref: string,
  assets: ImageAsset[] | Record<string, ImageAsset>
) {
  const m = ref.match(RE_ASSETREF);
  if (!m) {
    return undefined;
  }
  return L.isArray(assets) ? assets.find((t) => t.uuid === m[1]) : assets[m[1]];
}

export function mkImageAssetRef(asset: ImageAsset) {
  return `var(--image-${asset.uuid})`;
}

export function hasImageAssetRef(str: string, asset: ImageAsset) {
  return str.includes(mkImageAssetRef(asset));
}

export function hasAssetRefs(str: string) {
  return !!str.match(RE_ASSETREF_ALL);
}

export const resolveAllAssetRefs = (
  str: string,
  assets: ImageAsset[] | Map<string, ImageAsset>
) => {
  const finder = Array.isArray(assets)
    ? (assetId: string) => assets.find((t) => t.uuid === assetId)
    : (assetId: string) => assets.get(assetId);
  return replaceAllAssetRefs(str, (assetId) => {
    const asset = finder(assetId);
    if (!asset) {
      return undefined;
    } else {
      return asset.dataUri ? `url("${asset.dataUri}")` : "";
    }
  });
};

export function extractAllAssetRefs(str: string) {
  return [...str.matchAll(RE_ASSETREF_ALL)].map((r) => r[1]);
}

export function replaceAllAssetRefs(
  str: string,
  getVal: (assetId: string) => string | undefined
) {
  return str.replace(RE_ASSETREF_ALL, (sub, assetId) => {
    const replace = getVal(assetId);
    return replace === undefined ? sub : replace;
  });
}

export function getImageAssetVarName(asset: ImageAsset) {
  return `--image-${asset.uuid}`;
}

export function getTagAttrForImageAsset(type: ImageAssetType) {
  return type === ImageAssetType.Icon ? "outerHTML" : "src";
}

export function getTagAttrForTplImage(tpl: TplImageTag) {
  return getTagAttrForImageAsset(
    tpl.tag === "svg" ? ImageAssetType.Icon : ImageAssetType.Picture
  );
}

export function getOnlyAssetRef(tpl: TplImageTag) {
  const attr = getTagAttrForTplImage(tpl);
  const assetRefs = L.uniq(
    tpl.vsettings
      .map((vs) => {
        const expr = vs.attrs[attr];
        if (isKnownImageAssetRef(expr) && expr.asset) {
          return expr.asset;
        }
        return undefined;
      })
      .filter(notNil)
  );
  if (assetRefs.length === 1) {
    return assetRefs[0];
  }
  return undefined;
}

export function isIcon(asset: ImageAsset) {
  return asset.type === ImageAssetType.Icon && asset.dataUri;
}
