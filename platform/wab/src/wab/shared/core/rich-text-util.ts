import { cleanPlainText, plainTextToReact } from "@/wab/shared/codegen/util";
import { fontWeightNumber, getCssRulesFromRs } from "@/wab/shared/css";
import { isTagInline } from "@/wab/shared/html";
import {
  isKnownTplTag,
  type Marker,
  type NodeMarker,
  type RawText,
  type StyleMarker,
} from "@/wab/shared/model/classes";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import "@/wab/client/components/canvas/slate";
import L from "lodash";
import type { MakeADT } from "ts-adt/MakeADT";

// nodeMarkerText is the string that replaces NodeMarkers in RawText.text.
// This value is used, for example, in tpl-tree, i.e. a text like `This is a
// <a href="...">link</a>` will be seen as `This is a {nodeMarkerText}` there.
export const nodeMarkerText = "[child]";

export type NormalizedMarker = {
  position: number;
  length: number;
} & MakeADT<
  "type",
  {
    styleMarker: {
      rs: StyleMarker["rs"];
    };
    nodeMarker: {
      tpl: NodeMarker["tpl"];
    };
    text: {};
  }
>;

export function normalizeMarkers(
  markers: Marker[],
  length: number,
  isInline?: boolean
): Array<NormalizedMarker> {
  const newMarkers: NormalizedMarker[] = [];
  let lastInsertedMarker = 0;

  markers = markers.slice().sort((a, b) => a.position - b.position);
  for (const marker of markers) {
    // The check for "isInline" is to mimic Slate behavior. When it wraps
    // a snippet into a TplTag, it might add or not a {text: ""} to the
    // beginning of it depending if the element is a block or not. If we
    // don't do the same check here, Slate can crash after wrapping an
    // element into a TplTag, because its cursor position may change when
    // we re-evaluate the ValNode into Slate model.
    if (marker.position !== 0 || (!isInline && "tpl" in marker)) {
      newMarkers.push({
        type: "text",
        position: lastInsertedMarker,
        length: marker.position - lastInsertedMarker,
      });
    }
    lastInsertedMarker = marker.position + marker.length;
    const baseMarker = {
      position: marker.position,
      length: marker.length,
    };
    if ("rs" in marker) {
      newMarkers.push({ ...baseMarker, type: "styleMarker", rs: marker["rs"] });
    } else if ("tpl" in marker) {
      newMarkers.push({
        ...baseMarker,
        type: "nodeMarker",
        tpl: marker["tpl"],
      });
    }
  }
  if (
    length !== lastInsertedMarker ||
    (!isInline && markers.length > 0 && "tpl" in markers[markers.length - 1])
  ) {
    newMarkers.push({
      type: "text",
      position: lastInsertedMarker,
      length: length - lastInsertedMarker,
    });
  }
  return newMarkers;
}

export interface RichTextRenderTarget<T> {
  // Render a plain-text run. `text` has already been transformed via `cleanPlainText`
  // (or `plainTextToReact` if `whitespaceNormal` is set).
  text(text: string, key: string): T;
  // Render a styled-text run. `text` is already transformed. `cssRules` has
  // `fontWeight` parsed to a number.
  styledRun(
    text: string,
    cssRules: Record<string, any>,
    spanClassName: string,
    key: string
  ): T;
  // Render a nested child (NodeMarker).
  nodeMarker(tpl: NodeMarker["tpl"], key: string): T;
}

export interface RenderRichTextOpts {
  // Class string applied to <span> wrappers around styled runs. Canvas and
  // codegen use different bases so this is caller-supplied.
  spanClassName: string;
  // When true, plain-text runs are processed by `plainTextToReact`.
  // Only used by codegen.
  whitespaceNormal?: boolean;
}

// Walks a RawText's normalized markers and dispatches to the supplied `target` for
// each logical child. Used by codegen (JSX), canvas read-only rendering (React nodes),
// and localization (dummy React tree) so they all agree on the structure of rich-text.
export function renderRichTextChildren<T>(
  rawText: RawText,
  target: RichTextRenderTarget<T>,
  opts: RenderRichTextOpts
): T[] {
  const transform = opts.whitespaceNormal ? plainTextToReact : cleanPlainText;

  if (rawText.markers.length === 0) {
    return [target.text(transform(rawText.text), "t-0")];
  }

  const normalizedMarkers = normalizeMarkers(
    rawText.markers,
    rawText.text.length
  );
  const children: T[] = [];

  for (let i = 0; i < normalizedMarkers.length; i++) {
    const marker = normalizedMarkers[i];
    if (marker.type === "nodeMarker") {
      const key = isKnownTplTag(marker.tpl)
        ? `n-${i}-${marker.tpl.uuid}`
        : `n-${i}`;
      children.push(target.nodeMarker(marker.tpl, key));
      continue;
    }

    // If the previous marker was a block-level element, strip one leading line break from
    // the following text so `white-space: pre-wrap` doesn't print an unwanted line break.
    const prevMarker = i > 0 ? normalizedMarkers[i - 1] : undefined;
    const removeInitialLineBreak =
      prevMarker?.type === "nodeMarker" &&
      isKnownTplTag(prevMarker.tpl) &&
      !isTagInline(prevMarker.tpl.tag);
    const textPart = transform(
      rawText.text.substr(marker.position, marker.length),
      removeInitialLineBreak
    );

    if (marker.type === "styleMarker") {
      const cssRules: Record<string, any> = getCssRulesFromRs(marker.rs, true);
      if ("fontWeight" in cssRules) {
        cssRules["fontWeight"] = fontWeightNumber(
          String(cssRules["fontWeight"])
        );
      }
      if (L.isEmpty(cssRules)) {
        children.push(target.text(textPart, `t-${i}`));
      } else {
        children.push(
          target.styledRun(textPart, cssRules, opts.spanClassName, `s-${i}`)
        );
      }
    } else {
      children.push(target.text(textPart, `t-${i}`));
    }
  }

  return children;
}
