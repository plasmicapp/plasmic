import type { MentionElement } from "@/wab/client/components/canvas/slate";
import { Descendant, Editor, Text, Transforms } from "slate";

export const isMentionElement = (x: any): x is MentionElement =>
  x?.type === "mention";

function mkMentionElement(raw: string): MentionElement {
  return { type: "mention", raw, children: [{ text: "" }] };
}

export function withMentions<T extends Editor>(editor: T): T {
  const { isVoid, isInline } = editor;

  // isVoid `true` = Slate doesn't manage this element's contents,
  // so the caret can't enter it: it deletes, traverses, and copies as one unit
  editor.isVoid = (element) =>
    isMentionElement(element) ? true : isVoid(element);
  editor.isInline = (element) =>
    isMentionElement(element) ? true : isInline(element);

  return editor;
}

/**
 * Inserts a mention chip at the caret, followed by a space so the user can keep
 * typing.
 */
export function insertMention(editor: Editor, raw: string) {
  Transforms.insertNodes<MentionElement>(editor, mkMentionElement(raw));
  Transforms.move(editor);
  Transforms.insertText(editor, " ");
}

/** Matches one whole `@<…>` mention. */
const MENTION_TEXT_REGEX = /@<([^>]*)>/g;

function serializeNode(node: Descendant): string {
  if (Text.isText(node)) {
    return node.text;
  }
  if (isMentionElement(node)) {
    return `@<${node.raw}>`;
  }
  return node.children.map(serializeNode).join("");
}

/**
 * Flattens the editor's nodes back to the plain-text mention format.
 */
export function serializeToText(nodes: Descendant[]): string {
  return nodes.map(serializeNode).join("\n");
}

function parseLine(line: string): Descendant[] {
  const children: Descendant[] = [];
  let last = 0;
  for (const match of line.matchAll(MENTION_TEXT_REGEX)) {
    const raw = match[1];
    // Slate requires a text node either side of an inline (mentions are inline nodes)
    // https://docs.slatejs.org/concepts/02-nodes#blocks-vs.-inlines
    children.push({ text: line.slice(last, match.index) });
    children.push(mkMentionElement(raw));
    last = match.index + match[0].length;
  }
  children.push({ text: line.slice(last) });
  return children;
}

/**
 * Parses plain text into editor nodes, turning every `@<…>` into a chip.
 */
export function parseTextToNodes(text: string): Descendant[] {
  return text.split("\n").map((line) => ({
    type: "paragraph" as const,
    children: parseLine(line),
  }));
}
