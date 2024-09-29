import type {
  Marker,
  NodeMarker,
  StyleMarker,
} from "@/wab/shared/model/classes";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import "@/wab/client/components/canvas/slate";
import type { MakeADT } from "ts-adt/MakeADT";

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

export const textInlineTags = [
  "a",
  "code",
  "span",
  "strong",
  "i",
  "em",
  "sub",
  "sup",
];
export const textBlockTags = [
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
];
export const listContainerTags = ["ol", "ul"];

/**
 * This function is used in several places to decide whether a TplTag
 * inside a rich-text block should be inline or not. It decides that
 * based in the tag (e.g. "span" is inline, while "div" isn't).
 */
export function isTagInline(tag: string) {
  return textInlineTags.includes(tag);
}

export function isTagListContainer(tag: string) {
  return listContainerTags.includes(tag);
}
