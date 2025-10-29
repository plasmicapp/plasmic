/**
 * Extracts and removes color from <svg> element in browser's precedence:
 * 1. inline style color
 * 2. attribute color
 * 3. undefined
 * <svg style="color: 1" color="2"></svg>
 */
export function extractAndRemoveColorProperty(svg: SVGSVGElement) {
  // Extract color from both attribute and inline style
  const colorFromAttr = svg.attributes.getNamedItem("color")?.value;
  const colorFromStyle = svg.style.color || undefined;

  // Remove from both places
  svg.removeAttribute("color");
  svg.style.removeProperty("color");

  // Inline style takes precedence over attribute
  return colorFromStyle || colorFromAttr;
}

/**
 * Mutates the svg element to remove any references to
 * explicit colors, and set to currentColor instead.
 */
export function clearExplicitColors(svg: SVGSVGElement) {
  const colorProps = ["fill", "stroke"];
  const setColorProps: Set<string> = new Set();

  // We need to forcibly remove any fill attribute in all nodes of the tree,
  // because they have higher precedence than svg.style.fill
  const clearInlinedFill = (node: Element) => {
    for (const prop of colorProps) {
      const attr = node.attributes.getNamedItem(prop);
      if (attr && attr.value && attr.value.toLowerCase().trim() !== "none") {
        setColorProps.add(prop);
        attr.value = "currentColor";
      }
    }
    for (let i = 0; i < node.childElementCount; i++) {
      clearInlinedFill(node.children[i]);
    }
  };
  clearInlinedFill(svg);

  // If "stroke" or "fill" are not set anywhere, let's set fill by default
  if (setColorProps.size <= 0) {
    svg.style.fill = "currentColor";
  }

  return svg;
}

export function gatherSvgColors(elt: SVGSVGElement) {
  const colors = new Set<string>();
  const check = (sub: Element) => {
    for (const prop of ["fill", "stroke"]) {
      const attr = sub.attributes.getNamedItem(prop);
      if (attr) {
        const value = attr.value.toLowerCase().trim();
        if (value.length > 0 && value !== "none") {
          colors.add(value);
        }
      }
    }
    for (let i = 0; i < sub.children.length; i++) {
      check(sub.children[i]);
    }
  };

  check(elt);
  return colors;
}

/**
 * Mutates the svg element so that height is set to 1em,
 * and discards any existing width/height. Width will then
 * be proportional to height.
 */
export function convertSvgToTextSized(svg: SVGSVGElement) {
  svg.setAttribute("height", "1em");
  if (svg.style) {
    delete (svg as any).style["width"];
    delete (svg as any).style["height"];
  }
}

export function removeSvgIds(svg: SVGSVGElement) {
  // Implementation based on https://github.com/svg/svgo/blob/master/plugins/cleanupIDs.js
  const referencesProps = [
    "clip-path",
    "color-profile",
    "fill",
    "filter",
    "marker-start",
    "marker-mid",
    "marker-end",
    "mask",
    "stroke",
    "style",
  ];
  const regReferencesUrl = /\burl\(("|')?#(.+?)\1\)/;
  const regReferencesHref = /^#(.+?)$/;
  const regReferencesBegin = /(\w+)\./;

  function remove(element: Element) {
    if (element.hasAttribute("id")) {
      element.removeAttribute("id");
    }

    for (const attr of Array.from(element.attributes)) {
      if (
        (referencesProps.includes(attr.name) &&
          attr.value.match(regReferencesUrl)) ||
        (attr.localName === "href" && attr.value.match(regReferencesHref)) ||
        (attr.name === "begin" && attr.value.match(regReferencesBegin))
      ) {
        element.removeAttribute(attr.name);
      }
    }

    for (let i = 0; i < element.childElementCount; i++) {
      remove(element.children[i]);
    }
  }

  remove(svg);
  return svg;
}

export function isSVG(buffer: Buffer | ArrayBuffer) {
  // We get the first 10kB, just in case of
  // some very long comments before the svg tag
  const fileContent = buffer.toString("utf8", 0, 10240);
  return /<svg\s[\S\s]*?>/i.test(fileContent);
}
