import {
  insertMention,
  isMentionElement,
  parseTextToNodes,
  serializeToText,
  withMentions,
} from "@/wab/client/components/mentions/mention-editor-utils";
import { Descendant, Editor, Transforms, createEditor } from "slate";

/** The nodes the single line `text` parses into. */
const nodesOf = (text: string): any[] =>
  (parseTextToNodes(text)[0] as any).children;

const roundTrip = (text: string) => serializeToText(parseTextToNodes(text));

describe("parseTextToNodes", () => {
  it("puts plain text in a single block", () => {
    expect(parseTextToNodes("hello")).toEqual([
      { type: "paragraph", children: [{ text: "hello" }] },
    ]);
  });

  it("splits a mention into its own atomic node", () => {
    expect(nodesOf("make @<page:Home> sticky")).toEqual([
      { text: "make " },
      {
        type: "mention",
        raw: "page:Home",
        children: [{ text: "" }],
      },
      { text: " sticky" },
    ]);
  });

  it("surrounds a mention with text nodes even when it is the whole value", () => {
    expect(nodesOf("@<page:Home>")).toEqual([
      { text: "" },
      {
        type: "mention",
        raw: "page:Home",
        children: [{ text: "" }],
      },
      { text: "" },
    ]);
  });

  it("handles several mentions in one line", () => {
    expect(
      nodesOf("@<page:Home> and @<component:Nav>").filter(isMentionElement)
    ).toEqual([
      {
        type: "mention",
        raw: "page:Home",
        children: [{ text: "" }],
      },
      {
        type: "mention",
        raw: "component:Nav",
        children: [{ text: "" }],
      },
    ]);
  });

  it("makes each line its own block", () => {
    expect(parseTextToNodes("a\nb")).toHaveLength(2);
  });

  it("produces one empty block for empty text", () => {
    expect(parseTextToNodes("")).toEqual([
      { type: "paragraph", children: [{ text: "" }] },
    ]);
  });
});

describe("serializeToText", () => {
  it("writes a mention back in its `@<…>` form", () => {
    const nodes: Descendant[] = [
      {
        type: "paragraph",
        children: [
          { text: "hi " },
          {
            type: "mention",
            raw: "page:Home",
            children: [{ text: "" }],
          },
        ],
      },
    ];
    expect(serializeToText(nodes)).toBe("hi @<page:Home>");
  });

  it("joins blocks with newlines", () => {
    expect(serializeToText(parseTextToNodes("a\nb"))).toBe("a\nb");
  });
});

describe("insertMention", () => {
  const mkEditor = (text: string) => {
    const editor = withMentions(createEditor());
    editor.children = parseTextToNodes(text);
    Transforms.select(editor, Editor.end(editor, []));
    return editor;
  };

  it("leaves the caret in editable text, not inside the chip", () => {
    const editor = mkEditor("hi ");
    insertMention(editor, "page:Home");

    // The caret lands on a text node either way; only the parent says whether
    // it's the chip's own text child, where typing would be swallowed.
    const [caretParent] = Editor.parent(editor, editor.selection!.anchor.path);
    expect(isMentionElement(caretParent)).toBe(false);
  });

  it("lets the user keep typing after picking", () => {
    const editor = mkEditor("hi ");
    insertMention(editor, "page:Home");
    Transforms.insertText(editor, "there");

    expect(serializeToText(editor.children)).toBe("hi @<page:Home> there");
  });

  it("puts the trailing space after the chip, not inside it", () => {
    const editor = mkEditor("");
    insertMention(editor, "page:Home");

    const mention = (editor.children[0] as any).children.find(isMentionElement);
    expect(mention.children).toEqual([{ text: "" }]);
    expect(serializeToText(editor.children)).toBe("@<page:Home> ");
  });
});

describe("round trip", () => {
  it.each([
    "",
    "no mentions here",
    "@<page:Home>",
    "make @<page:Home> sticky",
    "@<page:Home>@<component:Nav>",
    "line one\nwith @<token:Primary>\n\nline four",
    // A resolved mention, carrying a uuid alongside the label.
    "tag @<tpl:abc123/def456|(unnamed div)> please",
    // Malformed: no closing `>`, so there is nothing to turn into a chip.
    "half @<page:Home",
  ])("preserves %j", (text) => {
    expect(roundTrip(text)).toBe(text);
  });
});
