// Copied from https://github.com/jakearchibald/svgomg/blob/master/src/js/svgo-worker/index.js

"use strict";
import { ProcessSvgResponse } from "@/wab/shared/ApiSchema";
import { ensure } from "@/wab/shared/common";
import { parseSvgXml } from "@/wab/shared/data-urls";
import { JSDOM } from "jsdom";
import { optimize, PluginConfig } from "svgo";

const removeMarginStyle = {
  type: "visitor",
  name: "remove-margin-styles",

  fn() {
    return {
      element: {
        // Node, parentNode
        enter({ attributes }) {
          if (!attributes?.style) {
            return;
          }
          let styles: string = attributes.style;

          while (styles.includes("margin")) {
            const position = styles.indexOf("margin");
            const end = styles.indexOf(";", position);

            styles =
              (position !== 0 ? styles.slice(0, position) : "") +
              (end !== -1 ? styles.slice(end + 1) : "");
          }

          attributes.style = styles;
          return;
        },
      },
    };
  },
};

const createDimensionsExtractor = () => {
  const dimensions: { width?: number; height?: number; aspectRatio?: number } =
    {};
  const plugin = {
    type: "visitor",
    name: "extract-dimensions",
    fn() {
      return {
        element: {
          // Node, parentNode
          enter({ name, attributes }, { type }) {
            if (name === "svg" && type === "root") {
              if (
                attributes.width !== undefined &&
                attributes.height !== undefined
              ) {
                dimensions.width = Number.parseFloat(attributes.width);
                dimensions.height = Number.parseFloat(attributes.height);
              } else if (attributes.viewBox !== undefined) {
                const viewBox = attributes.viewBox.split(/,\s*|\s+/);
                dimensions.width = Number.parseFloat(viewBox[2]);
                dimensions.height = Number.parseFloat(viewBox[3]);
                const ratio = dimensions.width / dimensions.height;
                dimensions.aspectRatio =
                  ratio && isFinite(ratio) ? ratio : undefined;
              }
            }
          },
        },
      };
    },
  };

  return { dimensions, plugin };
};

const pluginsData: PluginConfig[] = [
  { name: "removeDoctype" },
  { name: "removeXMLProcInst" },
  { name: "removeComments" },
  { name: "removeMetadata" },
  { name: "removeEditorsNSData", params: {} },
  { name: "cleanupAttrs", params: {} },
  {
    name: "inlineStyles",
    params: {
      onlyMatchedOnce: false,
    },
  },
  { name: "minifyStyles", params: {} },
  { name: "convertStyleToAttrs", params: {} },
  {
    name: "cleanupIds",
    params: {
      force: true,
    },
  },
  { name: "removeUselessDefs" },
  { name: "cleanupNumericValues", params: {} },
  { name: "cleanupListOfValues", params: {} },
  { name: "convertColors", params: {} },
  { name: "removeNonInheritableGroupAttrs" },
  { name: "removeUselessStrokeAndFill", params: {} },
  { name: "removeViewBox" },
  { name: "cleanupEnableBackground" },
  { name: "removeHiddenElems", params: {} },
  { name: "removeEmptyText", params: {} },
  { name: "convertShapeToPath", params: {} },
  { name: "convertEllipseToCircle" },
  { name: "moveElemsAttrsToGroup" },
  { name: "moveGroupAttrsToElems" },
  { name: "collapseGroups" },
  { name: "convertPathData" },
  { name: "convertTransform" },
  { name: "removeEmptyAttrs" },
  { name: "removeEmptyContainers" },
  { name: "mergePaths" },
  { name: "removeUnusedNS" },
  { name: "reusePaths" },
  { name: "sortAttrs" },
  { name: "sortDefsChildren" },
  { name: "removeTitle" },
  { name: "removeDesc" },
  { name: "removeStyleElement" },
  { name: "removeScriptElement" },
  removeMarginStyle,
];

export function svgoProcess(svgXml: string): ProcessSvgResponse {
  try {
    const jsDom = new JSDOM();
    const domParser = new jsDom.window.DOMParser();
    const svgElt = parseSvgXml(addMissingXmlns(svgXml), domParser);

    const { dimensions, plugin: extractDimensionsPlugin } =
      createDimensionsExtractor();

    const { data: firstPass } = optimize(svgElt.outerHTML, {
      multipass: true,
      plugins: [...pluginsData, extractDimensionsPlugin],
      js2svg: {
        pretty: true,
        indent: 2,
      },
    });

    // Remove dimensions after all plugins, so the user can control it
    // in the UI
    const { data } = optimize(firstPass, {
      plugins: [{ name: "removeDimensions" }],
      js2svg: {
        pretty: true,
        indent: 2,
      },
    });

    return {
      status: "success",
      result: {
        xml: data,
        width: ensure(dimensions.width, "Svg must have defined width value"),
        height: ensure(dimensions.height, "Svg must have defined height value"),
        aspectRatio: dimensions.aspectRatio,
      },
    };
  } catch (e) {
    return {
      status: "failure",
      error: e,
    };
  }
}

// In some cases, a <svg> root element does not contain a xmlns
// attribute. Specifically, that happens when a HTML SVG element
// is pasted as plain text (i.e. using Ctrl+Shift+V shortcut).
// That is treated as an error by browsers when they create a
// HTMLImageElement from it (e.g. deriveImageSize() in
// dom-utils). That can be fixed by manually adding a xmlns attr.
function addMissingXmlns(svgXml: string) {
  if (!svgXml.includes("xmlns=")) {
    svgXml = svgXml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return svgXml;
}
