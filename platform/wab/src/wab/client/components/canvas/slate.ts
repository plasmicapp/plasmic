import { TagName } from "@/wab/shared/html";
import type { Expr } from "@/wab/shared/model/classes";
import { CSSProperties } from "react";
import {
  BaseEditor,
  Descendant,
  Editor,
  Element,
  Node,
  Point,
  Range,
  Text,
  Transforms,
} from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor } from "slate-react";
import type { MakeADT } from "ts-adt/MakeADT";

type ParagraphAttributes = {
  children: Descendant[];
};

type TplTagAttributes = {
  tag: TagName;
  children: Descendant[];
  uuid?: string;
  attributes?: Record<string, string>;
};

type TplTagExprTextAttributes = TplTagAttributes & {
  expr: Expr;
  html: boolean;
};

/**
 * A `@`-mention chip
 */
type MentionAttributes = {
  /** The raw text the mention serializes to between `@<` and `>` */
  raw: string;
  /** Always a single empty text node: the element is void. */
  children: Descendant[];
};

type CustomElement = MakeADT<
  "type",
  {
    paragraph: ParagraphAttributes;
    TplTag: TplTagAttributes;
    TplTagExprText: TplTagExprTextAttributes;
    mention: MentionAttributes;
  }
>;
type CustomText = { text: string } & CSSProperties;
export type TplTagElement = Record<"type", "TplTag"> & TplTagAttributes;
export type ParagraphElement = Record<"type", "paragraph"> &
  ParagraphAttributes;
export type TplTagExprTextElement = Record<"type", "TplTagExprText"> &
  TplTagExprTextAttributes;
export type MentionElement = Record<"type", "mention"> & MentionAttributes;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export function mkTplTagElement(
  uuid: string,
  tag: TagName,
  attributes: Record<string, string>,
  children: Descendant[]
): Element {
  return {
    type: "TplTag",
    tag,
    attributes,
    children,
    uuid,
  };
}

/**
 * resetNodes resets the value of the editor.
 * It should be noted that passing the `at` parameter may cause a "Cannot resolve a DOM point from Slate point" error.
 * https://docs.slatejs.org/walkthroughs/06-saving-to-a-database
 */
export function resetNodes(
  editor: Editor,
  options: {
    nodes?: Node | Node[];
    at?: Location;
  } = {}
): void {
  const children = [...editor.children];

  children.forEach((node) =>
    editor.apply({ type: "remove_node", path: [0], node })
  );

  if (options.nodes) {
    const nodes = Node.isNode(options.nodes) ? [options.nodes] : options.nodes;

    nodes.forEach((node, i) =>
      editor.apply({ type: "insert_node", path: [i], node: node })
    );
  }

  const point =
    options.at && Point.isPoint(options.at)
      ? options.at
      : Editor.end(editor, []);

  if (point) {
    Transforms.select(editor, point);
  }
}

/**
 * The built-in {@link Editor.marks} doesn't work at the boundary of two texts.
 *
 * Take the following example where [1] and [2] are cursor positions.
 *  <span>Hello [1]</span><bold>[2]world</bold>
 *
 * Editor.marks() at both [1] and [2] would return no marks.
 * marksForToolbar() correctly returns no marks for [1] and bold for [2].
 */
export function marksForToolbar(editor: Editor): Omit<Text, "text"> | null {
  // When the user toggles a mark on the toolbar without typing anything yet,
  // this might be set.
  if (editor.marks) {
    return editor.marks;
  }

  // Use Editor.marks if there's no selection or it's is a range.
  if (!editor.selection || Range.isExpanded(editor.selection)) {
    return Editor.marks(editor);
  }

  if (!Node.has(editor, editor.selection.anchor.path)) {
    return Editor.marks(editor);
  }
  const [leaf] = Editor.leaf(editor, editor.selection.anchor.path);
  const { text: _text, ...leafMarks } = leaf;
  return leafMarks as Omit<Text, "text">;
}
