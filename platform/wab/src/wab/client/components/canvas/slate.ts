import type { Expr } from "@/wab/classes";
import type { tags } from "@/wab/client/components/canvas/subdeps";
import { CSSProperties } from "react";
import {
  BaseEditor,
  Descendant,
  Editor,
  Element,
  Node,
  Point,
  Transforms,
} from "slate";
import type { ReactEditor } from "slate-react";
import type { MakeADT } from "ts-adt/MakeADT";

type ParagraphAttributes = {
  children: Descendant[];
};

type TplTagAttributes = {
  tag: (typeof tags)[number];
  children: Descendant[];
  uuid?: string;
  attributes?: Record<string, string>;
};

type TplTagExprTextAttributes = TplTagAttributes & {
  expr: Expr;
  html: boolean;
};

type CustomElement = MakeADT<
  "type",
  {
    paragraph: ParagraphAttributes;
    TplTag: TplTagAttributes;
    TplTagExprText: TplTagExprTextAttributes;
  }
>;
type CustomText = { text: string } & CSSProperties;
export type TplTagElement = Record<"type", "TplTag"> & TplTagAttributes;
export type ParagraphElement = Record<"type", "paragraph"> &
  ParagraphAttributes;
export type TplTagExprTextElement = Record<"type", "TplTagExprText"> &
  TplTagExprTextAttributes;

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export function mkTplTagElement(
  tag: (typeof tags)[number],
  attributes: Record<string, string>,
  children: Descendant[],
  uuid?: string
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
