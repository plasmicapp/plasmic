import {
  ReadonlyIRuleSetHelpersX,
  RuleSetHelpers,
  readonlyRSH,
} from "@/wab/shared/RuleSetHelpers";
import possibleStandardNames from "@/wab/shared/codegen/react-attrs";
import { makeAssetIdFileName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { ImportAliasesMap } from "@/wab/shared/codegen/react-p/types";
import { getReactWebPackageName } from "@/wab/shared/codegen/react-p/utils";
import { ExportOpts } from "@/wab/shared/codegen/types";
import {
  jsLiteral,
  jsString,
  stripExtension,
  toClassName,
  toVarName,
} from "@/wab/shared/codegen/util";
import { assert, ensure, isNumeric, tuple } from "@/wab/shared/common";
import { isPageComponent } from "@/wab/shared/core/components";
import { ImageAssetType } from "@/wab/shared/core/image-asset-type";
import {
  extractAllAssetRefs,
  getTagAttrForImageAsset,
} from "@/wab/shared/core/image-assets";
import { allImageAssets } from "@/wab/shared/core/sites";
import { expandRuleSets } from "@/wab/shared/core/styles";
import {
  flattenTpls,
  isTplComponent,
  isTplIcon,
  isTplPicture,
  pushExprs,
} from "@/wab/shared/core/tpls";
import {
  parseDataUrl,
  parseDataUrlToSvgXml,
  parseSvgXml,
} from "@/wab/shared/data-urls";
import {
  Component,
  Expr,
  ImageAsset,
  Mixin,
  Site,
  TplNode,
  isKnownImageAsset,
  isKnownImageAssetRef,
  isKnownVarRef,
} from "@/wab/shared/model/classes";
import L, { last } from "lodash";
import mime from "mime/lite";
import { makeImportedPictureRef } from "src/wab/shared/codegen/react-p/image";

export function extractUsedIconAssetsForComponents(
  site: Site,
  components: Component[]
) {
  const assets = new Set<ImageAsset>();
  for (const component of components) {
    for (const tpl of flattenTpls(component.tplTree)) {
      collectUsedIconAssetsForTpl(assets, component, tpl);
    }
  }
  return assets;
}

export function collectUsedIconAssetsForTpl(
  assets: Set<ImageAsset>,
  component: Component,
  tpl: TplNode
) {
  if (isTplIcon(tpl)) {
    collectUsedImageAssetsForTplByAttrs(assets, component, tpl);
  }
}

export function collectUsedImageAssetsForTplByAttrs(
  assets: Set<ImageAsset>,
  component: Component,
  tpl: TplNode
) {
  const assetType = isTplIcon(tpl)
    ? ImageAssetType.Icon
    : isTplPicture(tpl)
    ? ImageAssetType.Picture
    : undefined;
  if (assetType) {
    for (const vs of tpl.vsettings) {
      const expr = vs.attrs[getTagAttrForImageAsset(assetType)];
      if (expr) {
        collectUsedImageAssetsByExpr(assets, component, expr);
      }
    }
  }
}

/**
 * Extracts used image assets by Expr.  Expr is found as referenced
 * by some tpl in `component`.
 */
export function collectUsedImageAssetsByExpr(
  assets: Set<ImageAsset>,
  component: Component,
  rootExpr: Expr
) {
  const exprs: Expr[] = [];
  pushExprs(exprs, rootExpr);
  exprs.forEach((expr) => {
    if (isKnownImageAssetRef(expr)) {
      assets.add(expr.asset);
    } else if (isKnownVarRef(expr)) {
      const param = component.params.find((p) => p.variable === expr.variable);
      if (param && isKnownImageAssetRef(param.defaultExpr)) {
        assets.add(param.defaultExpr.asset);
      }
    }
  });
}

export function extractUsedPictureAssetsForComponents(
  site: Site,
  components: Component[],
  opts:
    | { includeRuleSets: false }
    | { includeRuleSets: true; expandMixins: boolean }
) {
  const opts_ = opts.includeRuleSets
    ? {
        ...opts,
        allAssetsDict: L.keyBy(
          allImageAssets(site, { includeDeps: "all" }),
          "uuid"
        ),
      }
    : opts;
  const assets = new Set<ImageAsset>();
  for (const component of components) {
    for (const param of component.params) {
      if (param.defaultExpr) {
        collectUsedImageAssetsByExpr(assets, component, param.defaultExpr);
      }
    }
    for (const tpl of flattenTpls(component.tplTree)) {
      collectUsedPictureAssetsForTpl(assets, component, tpl, opts_);
    }
    if (
      isPageComponent(component) &&
      isKnownImageAsset(component.pageMeta.openGraphImage)
    ) {
      assets.add(component.pageMeta.openGraphImage);
    }
  }
  return assets;
}

export function collectUsedPictureAssetsForTpl(
  assets: Set<ImageAsset>,
  component: Component,
  tpl: TplNode,
  opts:
    | { includeRuleSets: false }
    | {
        includeRuleSets: true;
        expandMixins: boolean;
        allAssetsDict: Record<string, ImageAsset>;
      }
) {
  if (isTplPicture(tpl)) {
    collectUsedImageAssetsForTplByAttrs(assets, component, tpl);
  }

  if (isTplComponent(tpl)) {
    for (const vs of tpl.vsettings) {
      for (const arg of vs.args) {
        collectUsedImageAssetsByExpr(assets, component, arg.expr);
      }
    }
  }

  if (opts.includeRuleSets) {
    for (const vs of tpl.vsettings) {
      const rulesets = opts.expandMixins ? expandRuleSets([vs.rs]) : [vs.rs];
      for (const rs of rulesets) {
        for (const refId of extractPictureAssetRefsFromExp(
          readonlyRSH(rs, tpl)
        )) {
          if (L.has(opts.allAssetsDict, refId)) {
            assets.add(opts.allAssetsDict[refId]);
          }
        }
      }
    }
  }
}

export function extractUsedPictureAssetsFromMixins(
  site: Site,
  mixins: Mixin[]
) {
  const allAssets = L.keyBy(
    allImageAssets(site, { includeDeps: "all" }),
    (x) => x.uuid
  );
  const assets = new Set<ImageAsset>();
  for (const mixin of mixins) {
    for (const refId of extractPictureAssetRefsFromExp(
      new RuleSetHelpers(mixin.rs, "div")
    )) {
      if (L.has(allAssets, refId)) {
        assets.add(allAssets[refId]);
      }
    }
  }
  return assets;
}

function extractPictureAssetRefsFromExp(exp: ReadonlyIRuleSetHelpersX) {
  const refIds: string[] = [];
  if (exp.has("background")) {
    refIds.push(...extractAllAssetRefs(exp.get("background")));
  }
  return refIds;
}

export interface PictureAssetExport {
  id: string;
  name: string;
  blob: string;
  fileName: string;
}

export function exportPictureAsset(
  asset: ImageAsset,
  opts: { idFileNames?: boolean; data?: string } = {}
): PictureAssetExport {
  assert(
    asset.type === ImageAssetType.Picture,
    () => `Should only be called for Picture assets`
  );
  assert(asset.dataUri, () => `Must not be an empty asset`);

  let blob: string;
  let fileName: string;
  if (asset.dataUri.startsWith("http")) {
    const key = ensure(
      last(asset.dataUri.split("/")),
      () => `Must be a valid url`
    );
    const extension = key.split(".")[1];
    fileName = `${
      opts.idFileNames ? makeAssetIdFileName(asset) : toVarName(asset.name)
    }.${extension}`;
    // If data has been provided, and we use that as the blob; else we
    // just use the asset url, so that the cli can fetch it. Note this
    // really only affects codegen, as loader will always go through cdn.
    blob = opts.data ?? asset.dataUri;
  } else {
    const parsed = parseDataUrl(asset.dataUri);
    blob = parsed.toBuffer().toString("base64");
    fileName = opts.idFileNames
      ? `${makeAssetIdFileName(asset)}.${derivePictureExtension(asset, parsed)}`
      : makePictureAssetFileName(asset, { parsed });
  }

  return {
    id: asset.uuid,
    name: asset.name,
    blob,
    fileName,
  };
}

export interface IconAssetExport {
  id: string;
  name: string;
  module: string;
  fileName: string;
}

export function exportIconAsset(
  asset: ImageAsset,
  opts: { idFileNames?: boolean; skinnyReactWeb?: boolean } = {}
): IconAssetExport {
  assert(asset.type === ImageAssetType.Icon, () => `Only called for icons`);
  assert(asset.dataUri, `Must not be an empty asset`);

  const svgXml = parseDataUrlToSvgXml(asset.dataUri);
  const svgElt = parseSvgXml(svgXml);

  const assetClassName = makeAssetClassName(asset);
  const svgAttrs = serializeAttrsDict(svgElt);

  const serializedClassName = `classNames("plasmic-default__svg", className${
    svgAttrs.className ? `, ${svgAttrs.className}` : ""
  })`;
  svgAttrs.className = serializedClassName;

  let serializedStyle = `style`;
  if (svgAttrs.style) {
    const styleObj = stringToObjectStyle(svgAttrs.style);
    if (!L.isEmpty(styleObj)) {
      serializedStyle = `{
        ${Object.entries(styleObj)
          .map(([key, val]) => `${key}: ${jsString(val)},\n`)
          .join("")}
        ...style || {}
      }`;
    }
  }
  svgAttrs.style = serializedStyle;

  const renderModule = `
    // @ts-nocheck
    /* eslint-disable */
    /* tslint:disable */
    /* prettier-ignore-start */
    import React from "react";
    import {classNames} from "${getReactWebPackageName(opts)}";

    export type ${assetClassName}Props = React.ComponentProps<"svg"> & {
      title?: string;
    }

    export function ${assetClassName}(props: ${assetClassName}Props) {
      const {
        className,
        style,
        title,
        ...restProps
      } = props;
      return (
        <svg
          ${serializeAttrs(svgAttrs)}
          {...restProps}
        >
          {title && <title>{title}</title>}
          ${serializeNodes(svgElt.childNodes)}
        </svg>
      );
    }

    export default ${assetClassName};
    /* prettier-ignore-end */
  `;

  return {
    id: asset.uuid,
    name: assetClassName,
    module: renderModule,
    fileName: opts.idFileNames
      ? `${makeAssetIdFileName(asset)}.tsx`
      : makeIconAssetFileName(asset),
  };
}

function serializeElement(element: Element) {
  const attrs = serializeAttrsDict(element);
  if (attrs.style) {
    const styleObj = stringToObjectStyle(attrs.style);
    if (!L.isEmpty(styleObj)) {
      attrs.style = `{
        ${Object.entries(styleObj)
          .map(([key, val]) => `${key}: ${jsString(val)},\n`)
          .join("")}
      }`;
    } else {
      delete attrs.style;
    }
  }
  return `
    <${element.tagName}
      ${serializeAttrs(attrs)}
    >
      ${serializeNodes(element.childNodes)}
    </${element.tagName}>
  `;
}

function serializeAttrsDict(element: Element) {
  // serialize attr values
  return L.mapValues(getElementAttrs(element, true), (val) => jsLiteral(val));
}

function serializeAttrs(serializedAttrsDict: Record<string, string>) {
  return Object.entries(serializedAttrsDict)
    .map(([key, val]) => `${key}={${val}}`)
    .join(" ");
}

function serializeNodes(nodes: NodeList) {
  const results: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.nodeType === 1) {
      // 1 is Node.ELEMENT_NODE
      results.push(serializeElement(node as Element));
    } else if (node.nodeType === 3 && node.textContent) {
      // 3 is Node.TEXT_NODE
      results.push(node.textContent);
    }
  }
  return results.join("\n");
}

/**
 * Converts a style string to a object.
 * copied from
 * https://github.com/gregberge/svgr/blob/master/packages/hast-util-to-babel-ast/src/stringToObjectStyle.js
 */
function stringToObjectStyle(rawStyle: string) {
  const entries = rawStyle.split(";");

  const properties: [string, string][] = [];

  let index = -1;

  while (++index < entries.length) {
    const entry = entries[index];
    const style = entry.trim();
    const firstColon = style.indexOf(":");
    const value = style.substr(firstColon + 1).trim();
    const key = style.substr(0, firstColon);
    if (key !== "") {
      properties.push(tuple(L.camelCase(key), value));
    }
  }
  return Object.fromEntries(properties);
}

function getElementAttrs(element: Element, asReact?: boolean) {
  const attrs: Record<string, string | number> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attrs[asReact ? toReactAttr(attr.name) : attr.name] = asReact
      ? toReactAttrVal(attr.name, attr.value)
      : attr.value;
  }
  return attrs;
}

export function toReactAttr(attr: string) {
  if (attr.startsWith("data-") || attr.startsWith("aria-")) {
    return attr;
  } else if (attr in possibleStandardNames) {
    // Following what svgr does
    return possibleStandardNames[attr];
  } else {
    return L.camelCase(attr);
  }
}

const numericAttrs = ["tabIndex"];
function toReactAttrVal(attr: string, value: string) {
  if (numericAttrs.includes(attr) && isNumeric(value)) {
    return parseFloat(value);
  } else {
    return value;
  }
}

export function makeImportedAssetClassName(
  asset: ImageAsset,
  aliases: ReadonlyMap<Component | ImageAsset, string>
) {
  const alias = aliases.get(asset);
  return alias ?? makeAssetClassName(asset);
}

export function makeAssetClassName(asset: ImageAsset) {
  return `${toClassName(asset.name)}Icon`;
}

export function makeIconAssetFileName(asset: ImageAsset) {
  return `PlasmicIcon__${toClassName(asset.name)}.tsx`;
}

export function makeIconAssetFileNameWithoutExt(asset: ImageAsset) {
  return `PlasmicIcon__${toClassName(asset.name)}`;
}

type ParsedDataUrl = ReturnType<typeof parseDataUrl>;

export function makePictureAssetFileName(
  asset: ImageAsset,
  opts: {
    includeId?: boolean;
    parsed?: ParsedDataUrl;
  }
) {
  assert(asset.dataUri, "Must not be an empty asset");
  return `${toVarName(asset.name)}${
    opts.includeId ? `-${asset.uuid}` : ""
  }.${derivePictureExtension(asset, opts.parsed)}`;
}

function derivePictureExtension(asset: ImageAsset, parsed?: ParsedDataUrl) {
  assert(asset.dataUri, "Must not be an empty asset");
  parsed = parsed ?? parseDataUrl(asset.dataUri);
  return mime.getExtension(parsed.contentType);
}

export function makeIconImports(
  site: Site,
  component: Component,
  opts: ExportOpts,
  from: "skeleton" | "managed",
  aliases: ImportAliasesMap
) {
  const iconAssets = [
    ...extractUsedIconAssetsForComponents(site, [component]),
  ].filter((icon) => !!icon.dataUri);
  const relPath = from === "skeleton" ? opts.relPathFromImplToManagedDir : ".";
  const makeImportPath = (asset: ImageAsset) => {
    return `${relPath}/${
      opts.idFileNames
        ? makeAssetIdFileName(asset)
        : stripExtension(makeIconAssetFileName(asset))
    }`;
  };
  const usedNames = new Set<string>();
  for (const asset of iconAssets) {
    const name = makeAssetClassName(asset);
    if (usedNames.has(name)) {
      let count = 2;
      while (usedNames.has(name + count)) {
        count++;
      }
      aliases.set(asset, name + count);
      usedNames.add(name + count);
    } else {
      usedNames.add(name);
    }
  }
  return iconAssets
    .map(
      (asset) =>
        `import ${makeImportedAssetClassName(
          asset,
          aliases
        )} from "${makeImportPath(asset)}";  // plasmic-import: ${
          asset.uuid
        }/icon`
    )
    .join("\n");
}

export function makePictureImports(
  site: Site,
  component: Component,
  opts: ExportOpts,
  from: "skeleton" | "managed"
) {
  if (opts.imageOpts.scheme !== "files") {
    return "";
  }

  const relPath = from === "skeleton" ? opts.relPathFromImplToManagedDir : ".";
  const pictureAssets = [
    ...extractUsedPictureAssetsForComponents(site, [component], {
      includeRuleSets: false,
    }),
  ];
  const makeImportPath = (asset: ImageAsset) => {
    return `${relPath}/${
      opts.idFileNames
        ? makeAssetIdFileName(asset)
        : makePictureAssetFileName(asset, {
            includeId: true,
          })
    }`;
  };
  return pictureAssets
    .map(
      (asset) =>
        `import ${makeImportedPictureRef(
          asset
        )} from "${relPath}/${makeImportPath(asset)}";  // plasmic-import: ${
          asset.uuid
        }/picture`
    )
    .join("\n");
}

export function getImageFilename(asset: ImageAsset) {
  if (!asset.dataUri) {
    return asset.name;
  }
  let { contentType } = parseDataUrl(asset.dataUri);

  if (contentType === "image/jpg") {
    contentType = "image/jpeg";
  }

  const extension = mime.getExtension(contentType);
  return `${asset.name}.${extension}`;
}
