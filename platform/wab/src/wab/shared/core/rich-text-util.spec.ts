import {
  renderRichTextChildren,
  RichTextRenderTarget,
} from "@/wab/shared/core/rich-text-util";
import { mkRuleSet } from "@/wab/shared/core/styles";
import { mkTplTagX } from "@/wab/shared/core/tpls";
import { NodeMarker, RawText, StyleMarker } from "@/wab/shared/model/classes";

type Call =
  | { kind: "text"; text: string }
  | { kind: "styledRun"; text: string; cssRules: Record<string, any> }
  | { kind: "nodeMarker"; tpl: any };

function recordingTarget(): {
  target: RichTextRenderTarget<Call>;
  calls: Call[];
} {
  const calls: Call[] = [];
  return {
    calls,
    target: {
      text: (text) => {
        const c: Call = { kind: "text", text };
        calls.push(c);
        return c;
      },
      styledRun: (text, cssRules) => {
        const c: Call = { kind: "styledRun", text, cssRules };
        calls.push(c);
        return c;
      },
      nodeMarker: (tpl) => {
        const c: Call = { kind: "nodeMarker", tpl };
        calls.push(c);
        return c;
      },
    },
  };
}

const opts = { spanClassName: "sc" };

describe("renderRichTextChildren", () => {
  it("emits a single text() call for no-marker input, applying cleanPlainText (U+2028 → \\n)", () => {
    const { target, calls } = recordingTarget();
    renderRichTextChildren(
      new RawText({ text: "a\u2028b", markers: [] }),
      target,
      opts
    );
    expect(calls).toEqual([{ kind: "text", text: "a\nb" }]);
  });

  it("splits text + styledRun for a style marker covering a subset and coerces fontWeight to a number", () => {
    const { target, calls } = recordingTarget();
    renderRichTextChildren(
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
      target,
      opts
    );
    expect(calls).toEqual([
      { kind: "text", text: "hello " },
      { kind: "styledRun", text: "world", cssRules: { fontWeight: 700 } },
    ]);
  });

  it("degenerates an empty-rules styleMarker into a plain text() call", () => {
    const { target, calls } = recordingTarget();
    renderRichTextChildren(
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
      target,
      opts
    );
    expect(calls).toEqual([{ kind: "text", text: "hello" }]);
  });

  it("strips a leading \\n after a block-level nodeMarker but preserves it after an inline one", () => {
    for (const [tag, expected] of [
      ["h1", "after"],
      ["span", "\nafter"],
    ] as const) {
      const { target, calls } = recordingTarget();
      const child = mkTplTagX(tag);
      renderRichTextChildren(
        new RawText({
          text: "X\nafter",
          markers: [new NodeMarker({ position: 0, length: 1, tpl: child })],
        }),
        target,
        opts
      );
      // normalizeMarkers (without isInline) inserts an empty leading text
      // before a tpl marker at position 0.
      expect(calls.map((c) => c.kind)).toEqual(["text", "nodeMarker", "text"]);
      expect((calls[0] as any).text).toBe("");
      expect((calls[1] as any).tpl).toBe(child);
      expect((calls[2] as any).text).toBe(expected);
    }
  });

  it("routes plain-text through plainTextToReact when whitespaceNormal is set", () => {
    const { target, calls } = recordingTarget();
    renderRichTextChildren(
      new RawText({ text: "<x>\ny", markers: [] }),
      target,
      { ...opts, whitespaceNormal: true }
    );
    expect(calls).toHaveLength(1);
    expect((calls[0] as any).text).toContain("&lt;x&gt;");
    expect((calls[0] as any).text).toContain("<br />");
  });

  // This is the test that would have caught the canvas/codegen `isTagInline`
  // divergence the refactor unified: regardless of what each target returns,
  // the helper must emit the same sequence of logical children.
  it("emits the same kind/text sequence regardless of target shape", () => {
    const child = mkTplTagX("span");
    const rawText = new RawText({
      text: "hello *world",
      markers: [
        new StyleMarker({
          position: 0,
          length: 5,
          rs: mkRuleSet({ values: { "font-weight": "700" } }),
        }),
        new NodeMarker({ position: 6, length: 1, tpl: child }),
      ],
    });

    const canvas = recordingTarget();
    renderRichTextChildren(rawText, canvas.target, opts);

    const codegenCalls: Call[] = [];
    renderRichTextChildren<string>(
      rawText,
      {
        text: (text) => {
          codegenCalls.push({ kind: "text", text });
          return text;
        },
        styledRun: (text, cssRules) => {
          codegenCalls.push({ kind: "styledRun", text, cssRules });
          return `<span>${text}</span>`;
        },
        nodeMarker: (tpl) => {
          codegenCalls.push({ kind: "nodeMarker", tpl });
          return `{${(tpl as any).uuid}}`;
        },
      },
      opts
    );

    expect(canvas.calls).toEqual(codegenCalls);
  });
});
