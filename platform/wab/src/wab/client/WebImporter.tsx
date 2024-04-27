import { RawText, TplNode, TplTag, VariantSetting } from "@/wab/classes";
import { AppCtx } from "@/wab/client/app-ctx";
import {
  addSvgImageAsset,
  SiteOps,
} from "@/wab/client/components/canvas/site-ops";
import { ALL_CONTAINER_TAGS } from "@/wab/client/components/sidebar-tabs/HTMLAttributesSection";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  assert,
  assertNever,
  crunch,
  ensure,
  ensureElt,
  groupConsecBy,
  only,
  tuple,
  withoutNils,
} from "@/wab/common";
import { resolveUrl } from "@/wab/commons/urls";
import { code, codeLit } from "@/wab/exprs";
import { ImageAssetType } from "@/wab/image-asset-type";
import { RSH } from "@/wab/shared/RuleSetHelpers";
import { VariantTplMgr } from "@/wab/shared/VariantTplMgr";
import { TplTagType } from "@/wab/tpls";
import parseCss from "@/wab/vendor/parse-css.js";
import cssBackgroundParser from "css-background-parser";
import L from "lodash";
import nodeHtmlParser, { NodeType } from "node-html-parser";
import { CSSProperties } from "react";
import replaceCssUrl from "replace-css-url";

const debugLogging = false;

export interface DomSnap {
  html: string;
  baseUrl: string;
  stylesheets: { href: string | null; content: string }[];
}

/**
 * This is just for debugging purposes, if we're stuck waiting for images to
 * load.
 */
const imgLoadDebugProgress = new Map<HTMLImageElement, boolean>();

/**
 * Adapted from https://stackoverflow.com/a/60949881/43118
 */
async function waitAllImages(doc = document) {
  // Images that have no src never fire load / error, but are also incomplete
  // (initially). At some point they get marked complete though. Not really sure
  // about the lifecycle, so just skipping them.
  return Promise.all(
    Array.from(doc.images)
      .filter((img) => !img.complete && img.getAttribute("src"))
      .map((img) => {
        imgLoadDebugProgress.set(img, false);
        return new Promise<void>((resolve) => {
          img.onload = img.onerror = () => {
            imgLoadDebugProgress.set(img, true);
            resolve();
          };
        });
      })
  );
}

/**
 * From https://stackoverflow.com/a/60516253/43118
 */
async function waitFonts(doc = document) {
  // .fonts is not in the built-in TS libraries.
  return (doc as any).fonts.ready;
}

const standardAttrs = ["class", "title", "id"];

type StyProp = keyof CSSProperties;

const textStyles: StyProp[] = [
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textDecorationLine",
];
function applyTypographyStyles(dst: HTMLElement, sty: CSSStyleDeclaration) {
  dst.style.setProperty("all", "initial");
  for (const prop of textStyles) {
    dst.style.setProperty(L.kebabCase(prop as string), sty[prop as string]);
  }
  dst.style.fontFamily = parseCss.parseACommaSeparatedListOfComponentValues(
    sty.fontFamily
  )[0][0].value;
}

const containerStyles: StyProp[] = [
  "alignItems",
  // "backgroundColor",
  // "backgroundImage",
  "borderBottomColor",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderBottomStyle",
  "borderBottomWidth",
  "borderLeftColor",
  "borderLeftStyle",
  "borderLeftWidth",
  "borderRightColor",
  "borderRightStyle",
  "borderRightWidth",
  "borderTopColor",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderTopStyle",
  "borderTopWidth",
  "boxShadow",
  "display",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "flexWrap",
  "rowGap",
  "columnGap",
  "justifyContent",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginTop",
  "objectFit",
  "opacity",
  "overflowX",
  "overflowY",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "transform",
  "transformOrigin",
  "visibility",
  "zIndex",
];

function normalizeBackgroundImage(sty: CSSStyleDeclaration) {
  let backgroundImage = sty.backgroundImage;
  if (backgroundImage !== "none") {
    const parsed = cssBackgroundParser.parseElementStyle(sty);
    const layers = parsed.backgrounds.map((layer) => {
      if (
        !layer.image.match(
          /linear-gradient\((\d+deg|to (bottom|top|left|right))/
        )
      ) {
        return layer.image.replace(
          "linear-gradient(",
          "linear-gradient(180deg, "
        );
      }
      return layer.image
        .replace("to top", "0deg")
        .replace("to bottom", "180deg")
        .replace("to left", "270deg")
        .replace("to right", "90deg");
    });
    backgroundImage = layers.join(",");

    // const layers = parseCss.parseACommaSeparatedListOfComponentValues(
    //   sty.backgroundImage
    // );
    // console.log("!!", layers);
    // layers.map((layer) => {
    //   console.log("!!!", layer);
    //   return layer[0].value
    //     .replace("to top", "0deg")
    //     .replace("to bottom", "180deg")
    //     .replace("to left", "270deg")
    //     .replace("to right", "90deg");
    // });
  }
  return backgroundImage;
}

/**
 * @param dst The element we're applying styles to.
 * @param sty The computed styles on the source element.
 * @param parentSty The computed styles on the source's parent.
 * @param extras Additional styles to pass-through.
 */
function applyStyles(
  dst: HTMLElement | SVGSVGElement,
  sty: CSSStyleDeclaration,
  parentSty: CSSStyleDeclaration,
  extras: StyProp[] = []
) {
  for (const prop of [...containerStyles, ...extras]) {
    if (prop === "alignItems" && dst.style.alignItems) {
      continue;
    }
    dst.style.setProperty(L.kebabCase(prop as string), sty[prop as string]);
  }
  let backgroundImage = normalizeBackgroundImage(sty);

  if (sty.backgroundColor !== "rgba(0, 0, 0, 0)") {
    const colorFill = `linear-gradient(${sty.backgroundColor}, ${sty.backgroundColor})`;
    if (backgroundImage !== "none") {
      backgroundImage = `${colorFill},${backgroundImage}`;
    } else {
      backgroundImage = colorFill;
    }
  }
  dst.style.backgroundImage = backgroundImage;

  dst.style.setProperty(
    "position",
    ["absolute", "fixed", "sticky"].includes(sty.position)
      ? "absolute"
      : "relative"
  );

  dst.style.setProperty(
    "display",
    sty.display === "none"
      ? "none"
      : sty.display.includes("inline") ||
        sty.float === "left" ||
        sty.float === "right"
      ? "inline-flex"
      : "flex"
  );

  dst.style.setProperty(
    "flex-direction",
    sty.display.includes("flex") && sty.flexDirection.match(/column|row/)
      ? sty.flexDirection
      : sty.display.includes("grid")
      ? "row"
      : dst.style.flexDirection || "column"
  );

  if (sty.display.includes("grid")) {
    dst.style.flexWrap = "wrap";
  }
  if (sty.display.includes("block")) {
    dst.style.alignItems = "stretch";
    dst.style.justifyContent = "flex-start";
  }

  if (sty.textAlign === "center") {
    dst.style.alignItems = "center";
  }
  if (sty.textAlign === "right") {
    dst.style.alignItems = "flex-end";
  }

  if (["absolute", "fixed", "sticky"].includes(sty.position)) {
    for (const prop of ["top", "left"]) {
      dst.style.setProperty(L.kebabCase(prop as string), sty[prop as string]);
    }
  }
}

/**
 * Import these tags as the same tag. Everything else is imported as a div.
 */
const tagsToImportAsSameTag = new Set([...ALL_CONTAINER_TAGS, "img", "svg"]);

/**
 * Skip these tags.
 */
const ignoredTags = new Set(["script", "style", "head", "noscript", "source"]);

/**
 * Do not try to nest divs under these or treat them as having flow layout.
 *
 * If you try to import a `p > div` via innerHTML, then you'll get two `p` tags
 * and a `div` that is hoisted outside the `p`!
 *
 * NOTE: I don't really know what counts as a paragraph - here are just some
 * common cases I can think of.
 */
const paragraphTags = new Set(["p", "h1", "h2", "h3"]);

function checkRecognizedStyles(sty: CSSProperties) {
  const unrecognized = Object.keys(sty).filter(
    (k) => k !== "all" && !recognizedStyles.has(k)
  );
  assert(
    unrecognized,
    () => `Unrecognized style props: ${unrecognized.join(", ")}`
  );
}

/**
 * We have a generic pass-through proxy server (tools/cors-proxy.ts) to get
 * around CORS. This is probably insecure in some way (and of course totally not
 * escaped).
 */
function getProxyUrl(url: string) {
  return `http://localhost:4400/${url}`;
}

function maybeCopyAttr(
  dst: SVGSVGElement | HTMLElement,
  src: SVGSVGElement | HTMLElement,
  attr: string
) {
  const value = src.getAttribute(attr);
  if (value !== null) {
    dst.setAttribute(attr, value);
  }
}

function maybeCopyAttrToTpl(
  dst: VariantSetting,
  src: SVGSVGElement | HTMLElement,
  attr: string
) {
  const value = src.getAttribute(attr);
  if (value !== null) {
    dst.attrs[attr === "class" ? "className" : attr] = codeLit(value);
  }
}

/**
 * Given the window and document for a "source" iframe, crawl its body's
 * elements and convert them to a new DOM tree (in whatever the current global
 * document is).
 *
 * This DOM tree is ready for importing directly as a TplTag tree.
 *
 * We bother with this intermediate step for a faster development cycle. We can
 * rapidly debug and iterate over just DOM with WebImporterSandbox.
 *
 * Also, return fontStyles, which are all @font-face CSS rules from the source
 * document.
 */
export function extractImportableDomFromIframe(iframe: HTMLIFrameElement) {
  const doc = ensure(iframe.contentDocument, "loaded");
  const win = ensure(iframe.contentWindow, "loaded");

  function rec(node: Node, parentSty: CSSStyleDeclaration) {
    if (L.isElement(node)) {
      const elt = ensureElt(node);
      const sty = win.getComputedStyle(elt);
      const tag = elt.tagName.toLowerCase();
      if (ignoredTags.has(tag)) {
        return undefined;
      }

      const dstTag =
        tag !== "span" && tagsToImportAsSameTag.has(tag) ? tag : "div";

      let dst =
        dstTag === "svg"
          ? document.createElementNS("http://www.w3.org/2000/svg", "svg")
          : document.createElement(dstTag);
      importableEltToIframeElt.set(dst, elt);

      // Just for identification purposes.

      dst.dataset.origTag = tag;

      // Copy accepted attributes.

      for (const prop of standardAttrs) {
        maybeCopyAttr(dst, elt, prop);
      }

      // Dimensions.

      for (const sizeAxis of ["width", "height"]) {
        if (sty[sizeAxis].match(/(rem|em)$/)) {
          dst.style[sizeAxis] = `${elt.getBoundingClientRect()[sizeAxis]}px`;
        }
        if (sty[sizeAxis].match(/(px|%|vw|vh)$/)) {
          dst.style[sizeAxis] = sty[sizeAxis];
        }
      }

      const recursedChildren = withoutNils(
        [...node.childNodes].map((child) => rec(child, sty))
      );

      // Process whitespace correctly. Following
      // https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace.

      const childrenCleanedWhitespace = recursedChildren.filter((child, i) => {
        // Remove any leading and trailing pure-whitespace text nodes.
        if (
          (i === 0 ||
            i === recursedChildren.length - 1 ||
            sty.display !== "inline") &&
          child.dataset.textnode &&
          child.textContent === " "
        ) {
          return false;
        }
        return true;
      });

      // Handle pseudo-elements before/after. Insert new tags that correspond to
      // them.

      function maybePseudo(selector: string) {
        const pseudoSty = win.getComputedStyle(elt, selector);
        if (
          pseudoSty.content.startsWith('"') ||
          pseudoSty.content.startsWith("'")
        ) {
          const pseudo = document.createElement("div");
          pseudo.setAttribute("class", "__pseudo");
          pseudo.textContent = eval(pseudoSty.content);
          applyStyles(pseudo, pseudoSty, sty, ["width", "height"]);
          return pseudo;
        } else {
          return undefined;
        }
      }
      const withPseudos = withoutNils([
        maybePseudo(":before"),
        ...childrenCleanedWhitespace,
        maybePseudo(":after"),
      ]);

      // Apply styles.

      applyStyles(dst, sty, parentSty);
      if (tag === "body") {
        dst.style.overflow = "";
      }

      // Translate normal flow (most elements with display:block) to flex.
      // For any consecutive inlines, we wrap them in a horizontal stack.
      // For any consecutive blocks, we wrap them in a vertical stack.
      //
      // Note we must skip paragraphs, since they are not allowed to contain
      // divs - even being display:block does not turn their contents into
      // normal flow, apparently.

      function applyStackStyles(
        layout: "vstack" | "hstack",
        container: HTMLElement
      ) {
        container.style.setProperty(
          "flex-direction",
          layout === "vstack" ? "column" : "row"
        );
        if (layout === "hstack") {
          container.style.alignItems = "baseline";
        }
      }
      function mkContainer(
        layout: "vstack" | "hstack",
        children: (HTMLElement | SVGSVGElement)[]
      ) {
        const container = document.createElement("div");
        container.style.setProperty("position", "relative");
        container.style.setProperty("display", "flex");
        applyStackStyles(layout, container);
        for (const child of children) {
          if (child.style.display !== "none") {
            child.style.setProperty("display", "flex");
          }
          container.appendChild(child);
        }
        return container;
      }
      let children: (HTMLElement | SVGSVGElement)[] = withPseudos;

      if (elt.getAttribute("class") === "slick-track") {
        debugger;
      }
      if (
        sty.display.includes("block") &&
        !paragraphTags.has(dstTag) &&
        dst instanceof HTMLElement
      ) {
        // Find consecutive inlines and group them into an hstack if nec.
        const rawRuns = groupConsecBy(withPseudos, (child) =>
          child.style.display.startsWith("inline")
        );
        // Runs of a single inline should be just treated as blocks, since
        // they're effectively going to behave as blocks when surrounded by
        // blocks.
        const runs = rawRuns.map(([isInline, group]) =>
          isInline && group.length === 1
            ? tuple(false, group)
            : tuple(isInline, group)
        );
        // Adjacent blocks (vstacks) should be merged into one continuous span.
        const merged = groupConsecBy(runs, ([isInline, group]) => isInline).map(
          ([isInline, runs_]) =>
            tuple(isInline, runs_.map((run) => run[1]).flat())
        );
        // If there's just one container, merge it into parent (the current dst)
        if (merged.length === 1) {
          const [[isInline, group]] = merged;
          applyStackStyles(isInline ? "hstack" : "vstack", dst);
          children = group;
        } else {
          children = rawRuns.map(([isInline, group]) =>
            mkContainer(isInline ? "hstack" : "vstack", group)
          );
        }
      }

      // Some debug logging.

      function* ancestors(n: Node) {
        while (n.parentNode) {
          yield n;
          n = n.parentNode;
        }
      }
      function path(e: HTMLElement) {
        return [...ancestors(e)]
          .reverse()
          .map((n) =>
            L.isElement(n) ? ensureElt(n).tagName.toLowerCase() : "[node]"
          )
          .join(".");
      }
      if (debugLogging) {
        console.log(
          path(elt),
          sty.display,
          "->",
          dst.style.display,
          dst.style.flexDirection
        );
      }

      // Further processing.

      if (tag === "img") {
        const img = elt as HTMLImageElement;
        dst.style.display = "inline-block";
        dst.setAttribute("src", img.currentSrc);
        maybeCopyAttr(dst, img, "alt");
      } else if (tag === "svg") {
        for (const { name, value } of elt.attributes) {
          dst.setAttribute(name, value);
        }
        dst.style.display = "inline-block";
        dst.innerHTML = elt.innerHTML;
        dst.style.color = sty.color;
      } else if (tag === "picture") {
        dst = only(
          children.filter((child) => child.tagName.toLowerCase() === "img")
        );
      } else {
        for (const child of children) {
          dst.appendChild(child);
        }
      }

      return dst;
    } else if (node.nodeType === Node.TEXT_NODE) {
      const span = document.createElement("span");
      span.dataset.textnode = "true";
      span.textContent = crunch(node.textContent);
      applyTypographyStyles(span, parentSty);
      span.style.display = "inline-block";
      span.style.whiteSpace = "pre-wrap";
      return span;
    }
    return undefined;
  }

  const result = ensure(
    rec(doc.body, getComputedStyle(doc.documentElement)),
    "loaded"
  );

  return {
    dom: result,
    fontStyles: [...doc.styleSheets]
      .map((ss) =>
        [...ss.cssRules]
          .map((cssRule) => cssRule.cssText)
          .filter((text) => text.startsWith("@font"))
          .join("\n")
      )
      .join("\n"),
  };
}

/**
 * Create an iframe, and set its contents from the DomSnap.
 *
 * Creates one stylesheet, resolves & fixes up stylesheet URLs, and uses <base>
 * so all other images etc. resolve correctly.
 *
 * Append this to the document, rendering it at full viewport size.
 *
 * Wait for the fonts and images to finish loading before returning, so that the
 * document is fully ready for further extraction.
 */
export async function createIframeFromDomSnap(snap: DomSnap) {
  const iframe = document.createElement("iframe");
  iframe.style.setProperty("width", "1366px");
  iframe.style.setProperty("height", "100vh");

  // Wait for the iframe to be first available to reach into.
  await new Promise((resolve) => {
    iframe.addEventListener("load", resolve);
    document.body.appendChild(iframe);
  });

  const doc = ensure(iframe.contentDocument, "loaded");

  // Set a <base> for correct resource resolution.
  const base = doc.createElement("base");
  base.setAttribute("href", snap.baseUrl);
  doc.head.appendChild(base);

  // Write the CSS.
  const processedCss = snap.stylesheets
    .map(({ href, content }) =>
      replaceCssUrl(content, (url) =>
        url.startsWith("data:")
          ? url
          : getProxyUrl(resolveUrl(url, href || snap.baseUrl))
      )
    )
    .join("\n\n");
  const style = doc.createElement("style");
  style.appendChild(doc.createTextNode(processedCss));
  doc.head.appendChild(style);

  // Write the HTML.
  const root = nodeHtmlParser(snap.html);
  const body = root.querySelector("body");
  for (const tag of body.querySelectorAll("script,link")) {
    tag.remove();
  }
  doc.body.outerHTML = body.outerHTML;

  console.log("waitAllImages start");
  await waitAllImages(doc);
  console.log("waitAllImages done");
  await waitFonts(doc);
  console.log("waitFonts done");
  return iframe;
}

const recognizedStyles = new Set<string>([
  "display",
  "position",
  "flexDirection",
  "width",
  "height",
  "minHeight",
  "maxHeight",
  "minWidth",
  "maxWidth",
  "top",
  "left",
  ...textStyles,
  ...containerStyles,
]);

function pickRecognizedStyles(sty: CSSProperties) {
  return Object.fromEntries(
    Object.entries(sty).filter(([k, v]) => recognizedStyles.has(k))
  );
}

const translationTable = {
  rowGap: "flexRowGap",
  columnGap: "flexColumnGap",
};

function translateStyles(sty: CSSProperties) {
  const translated = Object.fromEntries(
    Object.entries(sty).map(([k, v]) => tuple(translationTable[k] ?? k, v))
  );
  translated.backgroundImage = normalizeBackgroundImage(translated);
  return translated;
}

/**
 * Given the DOM tree from extractImportableDomFromIframe, now translate this
 * into TplTags.
 *
 * Creates image assets as needed into the current project.
 */
export function convertImportableDomToTpl(
  rootElt: HTMLElement | SVGSVGElement,
  vtm: VariantTplMgr,
  siteOps: SiteOps,
  appCtx: AppCtx
) {
  async function rec(elt: Node) {
    if (!(elt instanceof HTMLElement || elt instanceof SVGSVGElement)) {
      throw new Error();
    }

    const tag = elt.tagName.toLowerCase();
    if (![...ALL_CONTAINER_TAGS, "img", "svg"].includes(tag)) {
      throw new Error();
    }

    let tpl: TplTag | undefined = undefined;

    // Inline SVGs must result in an image asset getting added. Other images are
    // referenced by URL.

    if (tag === "svg") {
      const [minX, minY, width, height] = (
        elt.getAttribute("viewBox") || "0 0 300 150"
      )
        .split(/\s+/)
        .map(Number);
      try {
        const { asset } = await addSvgImageAsset(
          elt.outerHTML,
          true,
          width,
          height,
          siteOps,
          appCtx
        );
        assert(asset !== undefined, "added");
        tpl = vtm.mkTplImage({
          asset: asset.asset,
          type: ImageAssetType.Icon,
          iconColor: asset.iconColor,
        });
      } catch (e) {
        tpl = vtm.mkTplTagX("div");
      }
    }

    // Text nodes are elements that contain exactly one child that is either a
    // TextNode or a span marked as data-textnode.

    let text: RawText | undefined = undefined;
    if (elt.childNodes.length === 1) {
      const child = elt.childNodes[0];
      if (child.nodeType === NodeType.TEXT_NODE) {
        text = new RawText({
          markers: [],
          text: ensure(child.textContent, "has text"),
        });
      }
    }
    const isText = !!text;
    if (elt.dataset.textnode) {
      assert(isText, "has text");
    }

    // Create the actual TplTag (unless we already created it earlier).

    tpl =
      tpl ??
      vtm.mkTplTagX(
        tag,
        {
          type: isText
            ? TplTagType.Text
            : tag === "img"
            ? TplTagType.Image
            : TplTagType.Other,
        },
        isText ? [] : [...elt.childNodes].map((child) => rec(child))
      );

    const vs = vtm.ensureBaseVariantSetting(tpl);

    // To identify the tag.

    maybeCopyAttrToTpl(vs, elt, "class");
    maybeCopyAttrToTpl(vs, elt, "title");

    // Add additional attributes, based on the tag type.

    if (elt instanceof HTMLImageElement) {
      maybeCopyAttrToTpl(vs, elt, "alt");
      maybeCopyAttrToTpl(vs, elt, "src");
    }
    if (elt instanceof HTMLAnchorElement) {
      maybeCopyAttrToTpl(vs, elt, "href");
    }
    if (text) {
      vs.text = text;
    }

    // Finally, apply the styles!

    RSH(vs.rs, tpl).merge(
      translateStyles(pickRecognizedStyles(elt.style as CSSProperties))
    );

    return tpl;
  }

  return rec(rootElt);
}

export const importableEltToIframeElt = new WeakMap<Element, Element>();

export function domSnapIframeToTpl(
  snap: DomSnap,
  iframe: HTMLIFrameElement,
  vtm: VariantTplMgr,
  siteOps: SiteOps,
  appCtx: AppCtx
) {
  const { dom, fontStyles } = extractImportableDomFromIframe(iframe);
  const tpl = convertImportableDomToTpl(dom, vtm, siteOps, appCtx);
  iframe.remove();
  return tpl;
}

export async function createIframeFromNamedDomSnap(snapName: string) {
  const { airbnbSnap } = await import("./sandboxes/snaps/airbnb");
  const { playvsSnap } = await import("./sandboxes/snaps/playvs");
  const { gustoSnap } = await import("./sandboxes/snaps/gusto");
  const { forever21Snap } = await import("./sandboxes/snaps/forever21");

  const snap: DomSnap = ensure(
    { playvsSnap, airbnbSnap, gustoSnap, forever21Snap }[snapName + "Snap"],
    "exists"
  );

  const iframe = await createIframeFromDomSnap(snap);
  return { iframe, snap };
}

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
