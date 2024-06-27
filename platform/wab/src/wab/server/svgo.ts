// Copied from https://github.com/jakearchibald/svgomg/blob/master/src/js/svgo-worker/index.js

"use strict";
import { ensure, mkShortId } from "@/wab/shared/common";
import { BadRequestError } from "@/wab/shared/ApiErrors/errors";
import { ProcessSvgResponse } from "@/wab/shared/ApiSchema";
import { parseSvgXml } from "@/wab/shared/data-urls";
import { JSDOM } from "jsdom";
import js2svg from "svgo/lib/svgo/js2svg";
import applyPlugins from "svgo/lib/svgo/plugins";
import svg2js from "svgo/lib/svgo/svg2js";
import cleanupAttrs from "svgo/plugins/cleanupAttrs";
import cleanupEnableBackground from "svgo/plugins/cleanupEnableBackground";
import cleanupIDs from "svgo/plugins/cleanupIDs";
import cleanupListOfValues from "svgo/plugins/cleanupListOfValues";
import cleanupNumericValues from "svgo/plugins/cleanupNumericValues";
import collapseGroups from "svgo/plugins/collapseGroups";
import convertColors from "svgo/plugins/convertColors";
import convertEllipseToCircle from "svgo/plugins/convertEllipseToCircle";
import convertPathData from "svgo/plugins/convertPathData";
import convertShapeToPath from "svgo/plugins/convertShapeToPath";
import convertStyleToAttrs from "svgo/plugins/convertStyleToAttrs";
import convertTransform from "svgo/plugins/convertTransform";
import inlineStyles from "svgo/plugins/inlineStyles";
import mergePaths from "svgo/plugins/mergePaths";
import minifyStyles from "svgo/plugins/minifyStyles";
import moveElemsAttrsToGroup from "svgo/plugins/moveElemsAttrsToGroup";
import moveGroupAttrsToElems from "svgo/plugins/moveGroupAttrsToElems";
import removeComments from "svgo/plugins/removeComments";
import removeDesc from "svgo/plugins/removeDesc";
import { fn as removeDimensions } from "svgo/plugins/removeDimensions";
import removeDoctype from "svgo/plugins/removeDoctype";
import removeEditorsNSData from "svgo/plugins/removeEditorsNSData";
import removeEmptyAttrs from "svgo/plugins/removeEmptyAttrs";
import removeEmptyContainers from "svgo/plugins/removeEmptyContainers";
import removeEmptyText from "svgo/plugins/removeEmptyText";
import removeHiddenElems from "svgo/plugins/removeHiddenElems";
import removeMetadata from "svgo/plugins/removeMetadata";
import removeNonInheritableGroupAttrs from "svgo/plugins/removeNonInheritableGroupAttrs";
import removeScriptElement from "svgo/plugins/removeScriptElement";
import removeStyleElement from "svgo/plugins/removeStyleElement";
import removeTitle from "svgo/plugins/removeTitle";
import removeUnusedNS from "svgo/plugins/removeUnusedNS";
import removeUselessDefs from "svgo/plugins/removeUselessDefs";
import removeUselessStrokeAndFill from "svgo/plugins/removeUselessStrokeAndFill";
import removeViewBox from "svgo/plugins/removeViewBox";
import removeXMLNS from "svgo/plugins/removeXMLNS";
import removeXMLProcInst from "svgo/plugins/removeXMLProcInst";
import reusePaths from "svgo/plugins/reusePaths";
import sortAttrs from "svgo/plugins/sortAttrs";
import sortDefsChildren from "svgo/plugins/sortDefsChildren";

const removeMarginStyle = {
  type: "perItem",
  active: true,
  description: "Remove margins styles from the svg",
  fn: (node: any) => {
    if (!node.attrs?.style) {
      return true;
    }
    let styles: string = node.attrs.style.value;

    while (styles.includes("margin")) {
      const position = styles.indexOf("margin");
      const end = styles.indexOf(";", position);

      styles =
        (position !== 0 ? styles.slice(0, position) : "") +
        (end !== -1 ? styles.slice(end + 1) : "");
    }

    node.attrs.style.value = styles;
    return true;
  },
};

// the order is from https://github.com/svg/svgo/blob/master/.svgo.yml
// Some are commented out if they have no default action.
const pluginsData = {
  removeDoctype,
  removeXMLProcInst,
  removeComments,
  removeMetadata,
  removeXMLNS,
  removeEditorsNSData,
  cleanupAttrs,
  inlineStyles,
  minifyStyles,
  convertStyleToAttrs,
  cleanupIDs,
  removeUselessDefs,
  cleanupNumericValues,
  cleanupListOfValues,
  convertColors,
  // removeUnknownsAndDefaults,
  removeNonInheritableGroupAttrs,
  removeUselessStrokeAndFill,
  removeViewBox,
  cleanupEnableBackground,
  removeHiddenElems,
  removeEmptyText,
  convertShapeToPath,
  convertEllipseToCircle,
  moveElemsAttrsToGroup,
  moveGroupAttrsToElems,
  collapseGroups,
  convertPathData,
  convertTransform,
  removeEmptyAttrs,
  removeEmptyContainers,
  mergePaths,
  removeUnusedNS,
  reusePaths,
  sortAttrs,
  sortDefsChildren,
  removeTitle,
  removeDesc,
  removeStyleElement,
  removeScriptElement,
  removeMarginStyle,
};

// we always inline styles, so remove style element
removeStyleElement.active = true;

// no reason for script
removeScriptElement.active = true;

// always inline styles, even if same style class used by multiple elements
inlineStyles.active = true;
inlineStyles.params.onlyMatchedOnce = false;

// Arrange plugins by type - this is what plugins() expects
function optimizePluginsArray(plugins) {
  return plugins
    .map((item) => [item])
    .reduce((arr, item) => {
      const last = arr[arr.length - 1];

      if (last && item[0].type === last[0].type) {
        last.push(item[0]);
      } else {
        arr.push(item);
      }
      return arr;
    }, []);
}

const optimisedPluginsData = optimizePluginsArray(Object.values(pluginsData));

function getDimensions(parsedSvg) {
  const svgEl = parsedSvg.content.filter((el) => el.isElem("svg"))[0];

  if (!svgEl) {
    return {};
  }

  let aspectRatio: number | undefined = undefined;

  if (svgEl.hasAttr("viewBox")) {
    const viewBox = svgEl.attr("viewBox").value.split(/(?:,\s*|\s+)/);
    const ratio = parseFloat(viewBox[2]) / parseFloat(viewBox[3]);
    if (ratio && isFinite(ratio)) {
      aspectRatio = ratio;
    }
  }

  if (svgEl.hasAttr("width") && svgEl.hasAttr("height")) {
    return {
      width: parseFloat(svgEl.attr("width").value),
      height: parseFloat(svgEl.attr("height").value),
    };
  }

  if (svgEl.hasAttr("viewBox")) {
    const viewBox = svgEl.attr("viewBox").value.split(/(?:,\s*|\s+)/);

    return {
      width: parseFloat(viewBox[2]),
      height: parseFloat(viewBox[3]),
      aspectRatio,
    };
  }

  return {};
}

export function svgoProcess(svgXml: string): ProcessSvgResponse {
  // prefix IDs with random uuids, so that we don't collide on global IDs.
  // Specifically, SVGs copied from Figma may reuse the same global IDs
  // for different defs.
  cleanupIDs.active = true;
  cleanupIDs.params.prefix = mkShortId();
  cleanupIDs.params.force = true;
  try {
    const domParser = new new JSDOM().window.DOMParser();
    const svgElt = parseSvgXml(svgXml, domParser);
    const svg = parseSvg(svgElt.outerHTML);

    // Search for the <svg> tag, it may not be the first element (i.e. if there are comments)
    svg.content.forEach((c) => {
      if (c.elem === "svg" && !c.attrs.xmlns) {
        // In some cases, a <svg> root element does not contain a xmlns
        // attribute. Specifically, that happens when a HTML SVG element
        // is pasted as plain text (i.e. using Ctrl+Shift+V shortcut).
        // That is treated as an error by browsers when they create a
        // HTMLImageElement from it (e.g. deriveImageSize() in
        // dom-utils). That can be fixed by manually adding a xmlns attr.
        c.attrs.xmlns = {
          local: "",
          name: "xmlns",
          prefix: "xmlns",
          value: "http://www.w3.org/2000/svg",
        };
      }
    });

    let svgData: string | undefined = undefined;
    let previousDataLength: number | undefined = undefined;

    let limit = 0;
    while (svgData === undefined || svgData.length !== previousDataLength) {
      previousDataLength = svgData?.length;

      applyPlugins(svg, { input: "string" }, optimisedPluginsData);

      // Remove dimensions only after all plugins are applied
      removeDimensions(svg.content[0]);

      svgData = js2svg(svg, {
        indent: "  ",
        pretty: true,
      }).data;

      // TODO: Remove this. Workaround to see if this is causing an infinite loop
      limit = limit + 1;
      if (limit > 100) {
        return {
          status: "failure",
          error: new BadRequestError(
            `There was an issue trying to process SVG. Please contact a Plasmic employee`
          ),
        };
      }
    }

    const dims = getDimensions(svg);

    return {
      status: "success",
      result: {
        xml: svgData,
        width: ensure(dims.width, "Svg must have defined width value"),
        height: ensure(dims.height, "Svg must have defined height value"),
        aspectRatio: dims.aspectRatio,
      },
    };
  } catch (e) {
    return {
      status: "failure",
      error: e,
    };
  }
}

function parseSvg(svgXml: string) {
  // svg2js is actually synchronous, it's just callback-based.
  let result;
  svg2js(svgXml, (parsed) => {
    if (parsed.error) {
      throw new Error(parsed.error);
    } else {
      result = parsed;
    }
  });
  return ensure(result, "Unexpected undefined svg");
}
