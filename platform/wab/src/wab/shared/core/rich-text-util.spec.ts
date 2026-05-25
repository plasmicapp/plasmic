import {
  renderRichTextChildren,
  RichTextRenderTarget,
} from "@/wab/shared/core/rich-text-util";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { NodeMarker, RawText, StyleMarker } from "@/wab/shared/model/classes";

type Child =
  | { kind: "text"; text: string }
  | { kind: "styledRun"; text: string; cssRules: Record<string, any> }
  | { kind: "nodeMarker"; tpl: any };

// Returns each call's arguments as a plain object so the function's return
// value IS the sequence of logical children we want to assert against.
const descriptorTarget: RichTextRenderTarget<Child> = {
  text: (text) => ({ kind: "text", text }),
  styledRun: (text, cssRules) => ({ kind: "styledRun", text, cssRules }),
  nodeMarker: (tpl) => ({ kind: "nodeMarker", tpl }),
};

const opts = { spanClassName: "sc" };

describe("renderRichTextChildren", () => {
  it("emits a single text child for no-marker input, applying cleanPlainText (U+2028 -> \\n)", () => {
    const children = renderRichTextChildren(
      new RawText({ text: "a\u2028b", markers: [] }),
      descriptorTarget,
      opts
    );
    expect(children).toEqual([{ kind: "text", text: "a\nb" }]);
  });

  it("splits text + styledRun for a style marker covering a subset and coerces fontWeight to a number", () => {
    const children = renderRichTextChildren(
      new RawText({
        text: "hello world",
        markers: [
          new StyleMarker({
            position: 6,
            length: 5,
            rs: mkRuleSet({ values: { "font-weight": "700" } }),
          }),
        ],
      }),
      descriptorTarget,
      opts
    );
    expect(children).toEqual([
      { kind: "text", text: "hello " },
      { kind: "styledRun", text: "world", cssRules: { fontWeight: 700 } },
    ]);
  });

  it("degenerates an empty-rules styleMarker into a plain text child", () => {
    const children = renderRichTextChildren(
      new RawText({
        text: "hello",
        markers: [
          new StyleMarker({
            position: 0,
            length: 5,
            rs: mkRuleSet({ values: {} }),
          }),
        ],
      }),
      descriptorTarget,
      opts
    );
    expect(children).toEqual([{ kind: "text", text: "hello" }]);
  });

  it("strips a leading \\n after a block-level nodeMarker but preserves it after an inline one", () => {
    for (const [tag, expectedTrailingText] of [
      ["h1", "after"],
      ["span", "\nafter"],
    ] as const) {
      const child = mkTplTagX(tag);
      const children = renderRichTextChildren(
        new RawText({
          text: "X\nafter",
          markers: [new NodeMarker({ position: 0, length: 1, tpl: child })],
        }),
        descriptorTarget,
        opts
      );
      // normalizeMarkers (without isInline) inserts an empty leading text
      // before a tpl marker at position 0.
      expect(children).toEqual([
        { kind: "text", text: "" },
        { kind: "nodeMarker", tpl: child },
        { kind: "text", text: expectedTrailingText },
      ]);
    }
  });

  it("routes plain-text through plainTextToReact when whitespaceNormal is set", () => {
    const children = renderRichTextChildren(
      new RawText({ text: "<x>\ny", markers: [] }),
      descriptorTarget,
      { ...opts, whitespaceNormal: true }
    );
    expect(children).toHaveLength(1);
    expect(children[0]).toEqual({
      kind: "text",
      text: `&lt;x&gt;<br />\ny`,
    });
  });
});
