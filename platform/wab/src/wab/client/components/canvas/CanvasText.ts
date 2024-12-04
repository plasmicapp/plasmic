import { withErrorDisplayFallback } from "@/wab/client/components/canvas/canvas-error";
import { resolveNodesToMarkers } from "@/wab/client/components/canvas/canvas-fns-impl";
import { mkUseCanvasObserver } from "@/wab/client/components/canvas/canvas-observer";
import {
  getSortedActiveVariantSettings,
  hasLoadingBoundaryKey,
  RenderingCtx,
  renderTplNode,
} from "@/wab/client/components/canvas/canvas-rendering";
import { mkSlateString } from "@/wab/client/components/canvas/RichText/SlateString";
import "@/wab/client/components/canvas/slate";
import {
  mkTplTagElement,
  ParagraphElement,
  TplTagElement,
} from "@/wab/client/components/canvas/slate";
import {
  tags as htmlTags,
  SubDeps,
} from "@/wab/client/components/canvas/subdeps";
import {
  reactPrompt,
  ReactPromptOpts,
} from "@/wab/client/components/quick-modals";
import type {
  EditingTextContext,
  ViewCtx,
} from "@/wab/client/studio-ctx/view-ctx";
import { makeWabFlexContainerClassName } from "@/wab/shared/codegen/react-p/serialize-utils";
import { cx, ensure, ensureInstance, spawn } from "@/wab/shared/common";
import {
  ExprCtx,
  getCodeExpressionWithFallback,
} from "@/wab/shared/core/exprs";
import {
  isTagInline,
  isTagListContainer,
  listContainerTags,
  normalizeMarkers,
  textInlineTags,
} from "@/wab/shared/core/rich-text-util";
import { hasGapStyle } from "@/wab/shared/core/styles";
import { isExprText, walkTpls } from "@/wab/shared/core/tpls";
import { getCssRulesFromRs } from "@/wab/shared/css";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { CanvasEnv, evalCodeWithEnv } from "@/wab/shared/eval";
import {
  CustomCode,
  ensureKnownRawText,
  ensureKnownTplTag,
  Marker,
  ObjectPath,
  TplNode,
  TplTag,
} from "@/wab/shared/model/classes";
import isHotkey from "is-hotkey";
import { camelCase, isEqual, kebabCase } from "lodash";
import { computedFn } from "mobx-utils";
import React, { CSSProperties } from "react";
import type {
  Descendant,
  Path,
  Editor as SlateEditor,
  Element as SlateElement,
  Node as SlateNode,
} from "slate";
import type { RenderElementProps } from "slate-react";

export interface SlateRenderNodeOpts {
  attributes: RenderElementProps["attributes"];
  children: Descendant[];
}

type RichTextProps = {
  node: TplTag;
  onChange: (text: string, markers: Marker[]) => void;
  onUpdateContext: (partialCtx: Partial<EditingTextContext>) => void;
  readOnly: boolean;
  inline: boolean;
  ctx: RenderingCtx;
  effectiveVs: EffectiveVariantSetting;
};

export type ShortcutFnOpts = {
  prompt: (opts: ReactPromptOpts) => Promise<string | undefined>;
};

// ShortcutFn is a function that is triggered by a shortcut.
type ShortcutFn = (
  editor: SlateEditor,
  opts: ShortcutFnOpts,
  sub: SubDeps,
  params?: any
) => Promise<void>;

// RunFn is like a ShortcutFn, but it gets an `action` string and params -
// does not need a Slate `editor` and ShortcutFnOpts. It is used from
// outside CanvasText by callers with no direct access to editor.
export type RunFn = (action: string, params?: any) => Promise<void>;

interface Shortcut {
  action: string;
  hotkey?: (event: KeyboardEvent) => boolean;
  fn: ShortcutFn;
}

/**
 * If `toggle` is true (default), the property will be unset if it's set to
 * the requested value (e.g. if you have a selection with `font-weight: 700`
 * and run wrapInStyleMarker({fontWeight: "700"}) it will unset font weight).
 */
function wrapInStyleMarker(
  props: CSSProperties,
  sub: SubDeps,
  toggle = true
): ShortcutFn {
  const { Editor } = sub.slate;
  return async function (editor: SlateEditor) {
    // Slate uses "Marks" to keep track of all the formats.
    // We use it to store CSS properties.
    const marks = Editor.marks(editor)!;
    Object.entries(props).forEach(([key, value]) => {
      const name = kebabCase(key);
      if ((toggle && value && marks[name] === value) || value === undefined) {
        Editor.removeMark(editor, name);
      } else {
        Editor.addMark(editor, name, value);
      }
    });
  };
}

type InlineTagProps = {
  attrs: Record<string, string>;
  children: Descendant[];
};

function wrapInInlineTag(
  tag: (typeof htmlTags)[number],
  sub: SubDeps,
  getProps?: (
    editor: SlateEditor,
    opts: ShortcutFnOpts
  ) => Promise<InlineTagProps | undefined>
): ShortcutFn {
  return async function (editor: SlateEditor, opts: ShortcutFnOpts) {
    // Unwrap existing element before adding a new one.
    sub.slate.Transforms.unwrapNodes(editor, {
      match: (n) => matchNodeMarker(n, sub, [tag]),
    });

    const props = getProps
      ? await getProps(editor, opts)
      : { attrs: {}, children: [{ text: "" }] };
    if (!props) {
      return;
    }
    const { children, attrs } = props;

    const element = mkTplTagElement(tag, attrs, children);
    wrapOrInsertTplTag(editor, element, sub);
  };
}

/**
 * This function changes the current block type to a given `tag`. If `tag`
 * is undefined, it turns it into a normal text (just unwrap the text from
 * the existing TplTag).
 *
 * Most of its complexity comes from handling lists, which works differently
 * from other blocks. See comments in the implementation to understand the
 * 10 different cases we're handling.
 */
function wrapInBlockTag(
  tag: (typeof htmlTags)[number] | null,
  sub: SubDeps
): ShortcutFn {
  const { Editor, Transforms } = sub.slate;
  return async function (editor: SlateEditor) {
    const existingBlock = Editor.above(editor, {
      match: (n) => matchBlockNodeMarker(n, sub),
    })?.[0] as TplTagElement | undefined;

    if (!tag) {
      // Case 1: User is setting block type to "Default", meaning we should
      // remove the (existing) innermost block. If there is no block, that's
      // a noop.

      if (!existingBlock) {
        // Case 1a: no block, no op.
      } else if (existingBlock.tag === "li") {
        // Case 1b: we are in a list item, lift the element splitting the list
        // in two, one before and other after the lifted element.
        splitListRemovingCurrentItem(editor, sub);
      } else {
        // Case 1c: we are in a block that is not a list, so unwrap the text
        // from that block.
        Transforms.unwrapNodes(editor, {
          match: (n) => n === existingBlock,
        });
      }
    } else if (existingBlock) {
      // Case 2: User is setting block type to a tag and we are already in
      // a TplTag. In this case, we want to change the current element's
      // tag.

      if (existingBlock.tag === tag) {
        // Case 2a: nothing to do; existing block already has `tag` type.
      } else if (isTagListContainer(tag) && existingBlock.tag === "li") {
        // Case 2b: Switch from a list container to another list container
        // (between ordered/unordered).
        const listContainer = Editor.above(editor, {
          match: (n) => matchNodeMarker(n, sub, listContainerTags),
        })?.[0] as TplTagElement | undefined;

        if (!listContainer) {
          // This should never happen, because all "li" should be in
          // list containers. Anyway, we make it a no-op.
        } else if (listContainer.tag === tag) {
          // Nothing to do; list container already has the tag we want.
        } else {
          // Switch list type (between ordered/unordered).
          Transforms.setNodes(
            editor,
            { uuid: undefined, tag },
            { match: (n) => n === listContainer }
          );
        }
      } else if (isTagListContainer(tag)) {
        // Case 2c: Switch from existing (non-list) block to a list. We
        // first set the block tag to "li", then wrap it in a list container.
        Transforms.setNodes(
          editor,
          {
            uuid: undefined,
            tag: "li",
          },
          { match: (n) => n === existingBlock }
        );
        const newListContainer = mkTplTagElement(tag, {}, [{ text: "" }]);
        Transforms.wrapNodes(editor, newListContainer, {
          match: (n) => matchNodeMarker(n, sub, ["li"]),
        });
      } else if (existingBlock.tag === "li") {
        // Case 2d: Switch from list item to non-list block. Lift the element
        // splitting the list in two, then wrap the current item into a new
        // element with the given tag.
        splitListRemovingCurrentItem(editor, sub);
        const element = mkTplTagElement(tag, {}, [{ text: "" }]);
        Transforms.wrapNodes(editor, element);
        Transforms.collapse(editor, { edge: "end" });
      } else {
        // Case 2e: Switching tag between non-list blocks. Simply change tag
        // and reset node UUID.
        Transforms.setNodes(
          editor,
          {
            uuid: undefined,
            tag,
          },
          { match: (n) => n === existingBlock }
        );
      }
    } else {
      // Case 3: There is no existing block. Just wrap current paragraph in
      // a new element.

      if (isTagListContainer(tag)) {
        // Case 3a: We want to wrap the item into a list, so first create an
        // item and then wrap it into a list container.
        const item = mkTplTagElement("li", {}, [{ text: "" }]);
        Transforms.wrapNodes(editor, item);
        const element = mkTplTagElement(tag, {}, [{ text: "" }]);
        Transforms.wrapNodes(editor, element, {
          match: (n) => matchNodeMarker(n, sub, ["li"]),
        });
      } else {
        // Case 3b: Wrap item into non-list element.
        const element = mkTplTagElement(tag, {}, [{ text: "" }]);
        Transforms.wrapNodes(editor, element);
      }
    }
  };
}

export type CustomCssProps = {
  toggle: boolean;
  props: CSSProperties;
};

const mkRichTextShortcuts: (sub: SubDeps) => Shortcut[] = computedFn(
  (sub: SubDeps) => [
    {
      action: "CUSTOM_CSS",
      fn: async (editor, opts, sub2, params: CustomCssProps) => {
        await wrapInStyleMarker(params.props, sub2, params.toggle)(
          editor,
          opts,
          sub
        );
      },
    },
    {
      action: "BOLD",
      hotkey: isHotkey("mod+b"),
      fn: wrapInStyleMarker({ fontWeight: 700 }, sub),
    },
    {
      action: "ITALIC",
      hotkey: isHotkey("mod+i"),
      fn: wrapInStyleMarker({ fontStyle: "italic" }, sub),
    },
    {
      action: "UNDERLINE",
      hotkey: isHotkey("mod+u"),
      fn: wrapInStyleMarker({ textDecorationLine: "underline" }, sub),
    },
    {
      action: "STRIKETHROUGH",
      hotkey: isHotkey("mod+shift+k"),
      fn: wrapInStyleMarker({ textDecorationLine: "line-through" }, sub),
    },
    {
      action: "LINK",
      hotkey: isHotkey("mod+k"),
      fn: wrapInInlineTag(
        "a",
        sub,
        async function (
          editor: SlateEditor,
          { prompt }
        ): Promise<InlineTagProps | undefined> {
          const href = await prompt({ message: "Destination URL" });
          sub.slateReact.ReactEditor.focus(editor);
          return href
            ? { attrs: { href }, children: [{ text: href }] }
            : undefined;
        }
      ),
    },
    {
      action: "CODE",
      hotkey: isHotkey("mod+shift+c"),
      fn: wrapInInlineTag("code", sub),
    },
    {
      action: "SPAN",
      hotkey: isHotkey("mod+shift+s"),
      fn: wrapInInlineTag("span", sub),
    },
    {
      action: "STRONG",
      hotkey: isHotkey("mod+shift+b"),
      fn: wrapInInlineTag("strong", sub),
    },
    {
      action: "ITALIC_TAG",
      hotkey: isHotkey("mod+shift+i"),
      fn: wrapInInlineTag("i", sub),
    },
    {
      action: "EMPHASIS",
      hotkey: isHotkey("mod+shift+e"),
      fn: wrapInInlineTag("em", sub),
    },
    {
      action: "SUBSCRIPT",
      hotkey: isHotkey("mod+shift+,"),
      fn: wrapInInlineTag("sub", sub),
    },
    {
      action: "SUPERSCRIPT",
      hotkey: isHotkey("mod+shift+."),
      fn: wrapInInlineTag("sup", sub),
    },
    {
      action: "WRAP_BLOCK",
      fn: async (editor, opts, sub2, tag: (typeof htmlTags)[number] | null) => {
        await wrapInBlockTag(tag, sub2)(editor, opts, sub2);
      },
    },
  ],
  {
    keepAlive: true,
  }
);

const MARKDOWN_BLOCKS: Record<
  string,
  (typeof htmlTags)[number] | Array<(typeof htmlTags)[number]>
> = {
  "#": "h1",
  "##": "h2",
  "###": "h3",
  "####": "h4",
  "#####": "h5",
  "######": "h6",
  ">": "blockquote",
  "```": "pre",
  "-": ["ul", "li"],
  "*": ["ul", "li"],
  "1.": ["ol", "li"],
};

function wrapOrInsertTplTag(
  editor: SlateEditor,
  element: SlateElement,
  sub: SubDeps
) {
  const { Range, Transforms } = sub.slate;
  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);

  if (isCollapsed) {
    Transforms.insertNodes(editor, element);
  } else {
    Transforms.wrapNodes(editor, element, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
}

function matchNodeMarker(n: SlateNode, sub: SubDeps, tags?: string[]): boolean {
  return (
    !sub.slate.Editor.isEditor(n) &&
    sub.slate.Element.isElement(n) &&
    n.type === "TplTag" &&
    (!tags || tags.includes(n.tag))
  );
}

function matchBlockNodeMarker(n: SlateNode, sub: SubDeps): boolean {
  return (
    !sub.slate.Editor.isEditor(n) &&
    sub.slate.Element.isElement(n) &&
    n.type === "TplTag" &&
    !isTagInline(n.tag)
  );
}

function isInNodeMarker(editor: SlateEditor, sub: SubDeps, tags?: string[]) {
  const [node] = sub.slate.Editor.nodes(editor, {
    match: (n) => matchNodeMarker(n, sub, tags),
  });
  return !!node;
}

function isInInlineNodeMarker(editor: SlateEditor, sub: SubDeps) {
  return isInNodeMarker(editor, sub, textInlineTags);
}

/**
 * Split the given list in the position of the cursor.
 *
 * Example input:
 *   1. Aa
 *   2. B[cursor]b
 *   3. Cc
 *
 * Example output:
 *   1. Aa
 *   2. B
 *   1. b
 *   2. Cc
 */
function splitList(editor: SlateEditor, list: TplTagElement, sub: SubDeps) {
  const { Transforms } = sub.slate;
  Transforms.splitNodes(editor, { match: (n) => n === list });
  Transforms.setNodes(
    editor,
    { uuid: undefined },
    { match: (n) => matchNodeMarker(n, sub, listContainerTags) && n !== list }
  );
}

/**
 * Split the given list in the position of the cursor, removing/lifting
 * current item.
 *
 * Example input:
 *   1. Aa
 *   2. B[cursor]b
 *   3. Cc
 *
 * Example output:
 *   1. Aa
 *   Bb
 *   1. Cc
 */
function splitListRemovingCurrentItem(editor: SlateEditor, sub: SubDeps) {
  const { Editor, Transforms } = sub.slate;

  // Lift text from list item.
  Transforms.liftNodes(editor);

  // Lift text from list container.
  Transforms.liftNodes(editor);

  // Reset UUID of list right after the current element.
  Transforms.setNodes(
    editor,
    { uuid: undefined },
    {
      at: Editor.after(editor, Editor.above(editor)![1]),
      match: (n) => matchNodeMarker(n, sub, listContainerTags),
    }
  );
}

/**
 * This function is used to handle Enter inside lists. When Enter is pressed
 * with the cursor in a list item, the following actions can happen:
 *
 * - If the item is empty (i.e., its text is ""), that item should be
 * turned into a paragraph. If the item is not the last one in the list,
 * the list should be split in two (one before the new paragraph and other
 * after).
 * - If the item is not empty, we should add a new item to the list by
 * splitting the current one based in the position of the cursor, i.e.,
 * "- Hello<cursor>World" should be transformed in "- Hello\n- World".
 *
 * The function returns true iff the cursor is in a list and it performed
 * such actions.
 */
function maybeAddNewItem(editor: SlateEditor, sub: SubDeps): boolean {
  const { Editor, Path, Transforms } = sub.slate;
  const list = Editor.above(editor, {
    match: (n) =>
      Editor.isBlock(editor, n) &&
      n.type === "TplTag" &&
      isTagListContainer(n.tag),
  });
  if (!list) {
    // We are not in a list.
    return false;
  }

  const current = Editor.above(editor, {
    match: (n) =>
      Editor.isBlock(editor, n) && n.type === "TplTag" && n.tag === "li",
  });
  if (!current) {
    // We are not in a list item. This should never happen.
    return false;
  }

  const range = {
    anchor:
      Editor.before(editor, current[1]) || Editor.start(editor, current[1]),
    focus: Editor.end(editor, current[1]),
  };
  const text = Editor.string(editor, range);
  if (text === "") {
    // Current item is empty. Should split list and add paragraph.

    splitList(editor, list[0] as TplTagElement, sub);

    // Delete last (empty) line.
    Transforms.select(editor, range);
    Transforms.delete(editor);

    // Insert empty paragraph after the (existing) list.
    Transforms.insertNodes(
      editor,
      {
        type: "paragraph",
        children: [{ text: "" }],
      },
      {
        at: Path.next(list[1]),
      }
    );

    // Move cursor to new paragraph.
    Transforms.move(editor, { unit: "line" });
    return true;
  }

  // Text of the list item is not empty, so split list item.
  Transforms.splitNodes(editor, {
    always: true,
    match: (n) =>
      Editor.isBlock(editor, n) && n.type === "TplTag" && n.tag === "li",
  });
  const newItem = Editor.above(editor, {
    match: (n) =>
      Editor.isBlock(editor, n) && n.type === "TplTag" && n.tag === "li",
  });

  // Reset UUID of the new list item.
  Transforms.setNodes(
    editor,
    { uuid: undefined },
    { match: (n) => !!newItem && n === newItem[0] }
  );

  return true;
}

/**
 * This function is used to replace an empty line in the end of a block
 * element with an empty paragraph after that block. It's called when
 * the user presses Enter inside a block, so if the user types
 * "# Title[Enter][Enter]" we are able to leave the block element and
 * add a paragraph.
 *
 * It does several checks to see if we're in that case. If any of the
 * checks fail, it returns false. Otherwise (i.e. if it decides to leave
 * the block), it leaves the block adding a new empty paragraph and
 * returns true.
 */
function maybeLeaveBlock(editor: SlateEditor, sub: SubDeps): boolean {
  const { Editor, Path, Transforms } = sub.slate;
  const paragraph = Editor.above(editor, {
    match: (n) => Editor.isBlock(editor, n) && n.type === "paragraph",
  }) as [ParagraphElement, Path] | undefined;
  if (!paragraph) {
    // This means we're not in a paragraph. This should never happen.
    return false;
  }
  if (
    paragraph[0].type !== "paragraph" ||
    paragraph[0].children.length !== 1 ||
    paragraph[0].children[0]["text"] !== ""
  ) {
    // The paragraph is not empty, so there's nothing to do.
    return false;
  }

  const block = Editor.above(editor, {
    match: (n) =>
      Editor.isBlock(editor, n) && n.type === "TplTag" && !isTagInline(n.tag),
  }) as [TplTagElement, Path] | undefined;
  if (!block) {
    // We're not in a block-level element.
    return false;
  }
  if (block[0].children.length < 2) {
    // The block has less than 2 lines. In this case, we don't want
    // to leave it.
    return false;
  }

  const start = Editor.start(editor, paragraph[1]);
  const anchor = Editor.before(editor, start);
  const range = {
    anchor: anchor || start,
    focus: Editor.end(editor, block[1]),
  };

  const text = Editor.string(editor, range);
  if (text !== "") {
    // There's some text after the pressed Enter, before the end of the block.
    return false;
  }

  // Delete last (empty) line.
  Transforms.select(editor, range);
  Transforms.delete(editor);

  // Insert empty paragraph after the block.
  Transforms.insertNodes(
    editor,
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
    {
      at: Path.next(block[1]),
    }
  );

  // Move cursor to new paragraph.
  Transforms.move(editor, { unit: "line" });

  return true;
}

/**
 * Recursively reset uuid for all TplTags under `node`.
 */
function resetUuids<T extends SlateNode>(node: T, sub: SubDeps): T {
  const { Element } = sub.slate;
  if (Element.isElement(node)) {
    if (node.type === "TplTag" && node.uuid) {
      node.uuid = undefined;
    }
    node.children = node.children.map((c) => resetUuids(c, sub));
  }
  return node;
}

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
// Reference:
// https://github.com/ianstormtaylor/slate/commit/f1b7d18f43913474617df02f747afa0e78154d85

// We add lineHeight: 0 to the span to work around this bug:
// https://plasmiccommunity.slack.com/archives/C013DHGMJTA/p1670258681054929
// Reference on font sizing: https://iamvdo.me/en/blog/css-font-metrics-line-height-and-vertical-align
const inlineCursorFix = (key: number, sub: SubDeps) =>
  sub.React.createElement(
    "span",
    {
      contentEditable: false,
      key,
      style: { fontSize: 0, lineHeight: 0 },
    },
    String.fromCodePoint(160)
  );

const isModEnter = isHotkey("mod+enter");
const isEscape = isHotkey("escape");
const isSpace = isHotkey("space");

type PlasmicRichTextOpts = {
  inline: boolean;
};

// Inject Plasmic rich text editor functionality into Slate Editor.
const withPlasmic = (
  editor: SlateEditor,
  opts: PlasmicRichTextOpts,
  sub: SubDeps
) => {
  const { insertData, insertFragment, insertText, isInline, isVoid } = editor;

  editor.isInline = (element) => {
    if (element.type === "TplTag" || element.type === "TplTagExprText") {
      return isTagInline(element.tag);
    }

    return isInline(element);
  };

  editor.isVoid = (element) => {
    if (element.type === "TplTagExprText") {
      return true;
    }

    return isVoid(element);
  };

  editor.insertData = (data) => {
    if (opts.inline || isInInlineNodeMarker(editor, sub)) {
      const text = data.getData("text/plain").replace(/[\r\n]+/g, " ");
      insertText(text);
    } else {
      insertData(data);
    }
  };

  editor.insertFragment = (fragment: SlateNode[]) => {
    // When Slate nodes are pasted, we reset the uuids in the tpls to ensure
    // that we don't have multiple TplTags with the same uuid.
    insertFragment(fragment.map((n) => resetUuids(n, sub)));
  };

  editor.insertText = (text) => {
    const { Editor, Range, Transforms } = sub.slate;
    const { selection } = editor;

    // If user presses space, we check what is in the line before the space.
    // That may be interpreted as a Markdown shortcut to create a block-level
    // element. The logic comes from slate's markdown-shortcuts example:
    // https://github.com/ianstormtaylor/slate/blob/main/site/examples/markdown-shortcuts.tsx
    if (text === " " && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;
      const block = Editor.above(editor, {
        match: (n) => Editor.isBlock(editor, n),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range);
      const type = MARKDOWN_BLOCKS[beforeText];

      if (type) {
        const tag = Array.isArray(type) ? type[type.length - 1] : type;

        Transforms.select(editor, range);
        Transforms.delete(editor);

        const element = mkTplTagElement(tag, {}, [{ text: "" }]);
        Transforms.wrapNodes(editor, element);
        Transforms.collapse(editor, { edge: "end" });

        if (tag === "li") {
          // For list items, we need to create the container wrapping them.
          const list = mkTplTagElement(
            type[0] as (typeof htmlTags)[number],
            {},
            []
          );
          Transforms.wrapNodes(editor, list, {
            match: (n) => matchNodeMarker(n, sub, ["li"]),
          });
        }

        return;
      }
    }

    insertText(text);
  };

  return editor;
};

function mkRunFn(
  editor: SlateEditor,
  opts: ShortcutFnOpts,
  sub: SubDeps
): RunFn {
  return async function (act: string, params: any) {
    sub.slateReact.ReactEditor.focus(editor);
    for (const { fn } of mkRichTextShortcuts(sub).filter(
      ({ action }) => act === action
    )) {
      await fn(editor, opts, sub, params);
    }
  };
}

function mkExprTextProps(
  node: TplTag,
  effectiveVs: EffectiveVariantSetting,
  env: CanvasEnv,
  exprCtx: ExprCtx
) {
  if (!isExprText(effectiveVs.text)) {
    throw new Error("mkExprTextProps expects ValTag with ExprText");
  }
  const expr = getCodeExpressionWithFallback(
    ensureInstance(effectiveVs.text.expr, CustomCode, ObjectPath),
    exprCtx
  );
  const content = evalCodeWithEnv(expr, env);
  if (content && typeof content === "object") {
    throw new Error(
      `Invalid dynamic text content; expected text or number, but found: ${JSON.stringify(
        content
      )}`
    );
  }
  return effectiveVs.text.html
    ? { dangerouslySetInnerHTML: { __html: content } }
    : { children: content };
}

export const mkCanvasText = computedFn(
  (react: typeof React) =>
    function CanvasText({
      node,
      onChange,
      onUpdateContext,
      readOnly,
      inline,
      ctx,
      effectiveVs,
    }: RichTextProps) {
      return mkUseCanvasObserver(ctx.sub, ctx.viewCtx)(() => {
        const { sub, viewCtx: vc } = ctx;
        const initialValue = tplToSlateNodes(node, ctx, effectiveVs);
        const win = ctx.viewCtx.canvasCtx.win();
        const doc = ctx.viewCtx.canvasCtx.doc();

        const { createEditor, Range, Transforms } = sub.slate;
        const { Editable, ReactEditor, Slate, withReact } = sub.slateReact;

        const [value, setValue] = react.useState(initialValue);
        const editor = react.useMemo(
          () => withPlasmic(withReact(createEditor()), { inline }, sub),
          [inline]
        );

        const shortcutOpts: ShortcutFnOpts = { prompt: reactPrompt };

        const onSlateChange = react.useCallback(
          (newValue: Descendant[]) => {
            // @hack Some browsers will try to get the contenteditable
            // to stay focused. So we're clearing the scrollTop of the
            // content HTML.
            doc.documentElement.scrollTop = 0;

            // Update context even when there's no change in value, because there
            // may be change in cursor selection.
            onUpdateContext({ editor });

            if (newValue === value) {
              return;
            }

            // We keep a copy of updated value locally; currently we're
            // not using RichText as a controlled component.
            setValue(newValue);

            const newVals = resolveNodesToMarkers(newValue, true);
            onChange(newVals.text, newVals.markers);

            if (newVals.newTpls) {
              // We have new tpls, so we must run onRefresh(). We wrap it in a
              // setTimeout so it uses the updated value we've just set.
              win.setTimeout(() => {
                if (vc.studioCtx.isDevMode) {
                  vc.change(() => {
                    vc.getViewOps().saveText();
                  });
                }
              }, 0);
            }
          },
          [doc, win, value, setValue, onChange]
        );

        react.useEffect(() => {
          onUpdateContext({
            run: mkRunFn(editor, shortcutOpts, sub),
          });
        }, [editor, initialValue]);

        react.useEffect(() => {
          if (readOnly) {
            // Reset editor selection when this becomes readOnly, so Slate does
            // not try to access a path that may not exist (because when readOnly
            // is set we don't render `children` on renderElement).
            editor.selection = {
              anchor: { path: [0, 0], offset: 0 },
              focus: { path: [0, 0], offset: 0 },
            };
            return;
          }
          ReactEditor.focus(editor);
          const domNode = ReactEditor.toDOMNode(editor, editor);
          const range = doc.createRange();
          range.selectNodeContents(domNode);
          const sel = ensure(
            win.getSelection(),
            "Window should have selection"
          );
          sel.removeAllRanges();
          sel.addRange(range);
        }, [doc, win, readOnly, editor]);

        const prevInitialValueRef = react.useRef(initialValue);
        react.useEffect(() => {
          if (!isEqual(prevInitialValueRef.current, initialValue)) {
            // A different initialValue has been specified; reset draft value
            setValue(initialValue);
            prevInitialValueRef.current = initialValue;
            editor.children = initialValue;

            // We used to reset value selection here using:
            //   editor.selection = {
            //     anchor: { path: [0, 0], offset: 0 },
            //     focus: { path: [0, 0], offset: 0 },
            //   };
            // (ref: https://github.com/ianstormtaylor/slate/issues/3332) because
            // value state and selection state are controlled separately in Slate
            // and when value is set we might want to reset selection as well.
            // We no longer do it because we want to persist selection when the
            // text is refreshed (e.g. a link is added and onRefresh() is run).
          }
        }, [initialValue, prevInitialValueRef, setValue, editor]);

        if (isExprText(effectiveVs.text)) {
          // If node.text is a custom code expression, there's no need to use Slate.
          // We just evaluate and render the content. Note that we set content using
          // dangerouslySetInnerHTML instead of children if node.text.html.
          return withErrorDisplayFallback(
            react,
            ctx,
            node,
            () => {
              const className = mkClassName(node, inline);
              const exprTextProps = mkExprTextProps(
                node,
                effectiveVs,
                ctx.env,
                {
                  projectFlags: ctx.projectFlags,
                  component: ctx.ownerComponent ?? null,
                  inStudio: true,
                }
              );
              return inline
                ? react.createElement("span", {
                    className,
                    style: {
                      ...DEFAULT_TEXT_STYLE,
                    },
                    ...exprTextProps,
                  })
                : react.createElement("div", {
                    className,
                    style: DEFAULT_TEXT_STYLE,
                    ...exprTextProps,
                  });
            },
            {
              hasLoadingBoundary: ctx.env.$ctx[hasLoadingBoundaryKey],
            }
          );
        }

        const descendants = getDescendentsAndRelativeValKeys(node);
        return react.createElement(Slate, {
          editor,
          value,
          onChange: onSlateChange,
          children: react.createElement(Editable, {
            renderElement: ({ attributes, children, element }) => {
              let inlineElement = true;
              let tag = inline ? "span" : "div";

              if (
                element.type === "TplTag" ||
                element.type === "TplTagExprText"
              ) {
                tag = element.tag;
                inlineElement = isTagInline(element.tag);
                if (element.uuid) {
                  const tplNodeData = descendants.find(
                    ([tpl]) => tpl.uuid === element.uuid
                  );
                  if (tplNodeData) {
                    const [child, suffix] = tplNodeData;
                    return ctx.sub.React.createElement(
                      mkTextChild(ctx.viewCtx),
                      {
                        node: child,
                        ctx: {
                          ...ctx,
                          valKey: suffix
                            ? ctx.valKey + "." + suffix
                            : ctx.valKey,
                          inline: inlineElement,
                          // `slate` is passed only when this rich text is being
                          // edited. Slate REQUIRES them to be rendered; if not, the
                          // editor crashes.
                          ...(!readOnly
                            ? {
                                slate: {
                                  attributes,
                                  children,
                                },
                              }
                            : {}),
                        },
                      }
                    );
                  }
                }
              }

              return react.createElement(
                tag as (typeof htmlTags)[number],
                { ...attributes },
                children
              );
            },
            renderLeaf: ({ attributes, children, leaf }) => {
              if ("placeholder" in leaf) {
                return react.createElement("span", attributes, children);
              }

              function getChildrenNode() {
                if (React.isValidElement(children)) {
                  const childrenProps = children.props as any;
                  // If we are dealing with a leaf that is rendered with String
                  // from Slate, we will render it ourselves.
                  if ("leaf" in childrenProps) {
                    return react.createElement(
                      mkSlateString(react, ctx.sub.slateReact),
                      childrenProps
                    );
                  } else {
                    return children;
                  }
                } else {
                  return children;
                }
              }

              let childrenNode = getChildrenNode();
              Object.entries(leaf).forEach(([key, val]) => {
                if (key === "text") {
                  return;
                }
                key = camelCase(key);
                childrenNode = react.createElement(sub.React.Fragment, {}, [
                  inlineCursorFix(0, sub),
                  react.createElement(
                    "span",
                    { key: 1, style: { [key]: val } },
                    childrenNode
                  ),
                  inlineCursorFix(2, sub),
                ]);
              });
              return react.createElement("span", attributes, childrenNode);
            },

            // TODO: Don't set a placeholder for now, as doing so may cause
            // Slate to resize the wrong text element. See
            // https://github.com/ianstormtaylor/slate/issues/5117
            // placeholder: "Enter some text…",
            className: mkClassName(node, inline),
            style: DEFAULT_TEXT_STYLE,
            spellCheck: true,
            readOnly,
            onKeyDown: (event) => {
              event.stopPropagation();
              if (isSpace(event.nativeEvent)) {
                editor.insertText(" ");
                // some accessible code components like button may trigger press events when pressing space
                // `stopPropagation` alone does not stop propagation of events to code components, and thus events may leak
                event.preventDefault();
              }
              if (
                isModEnter(event.nativeEvent) ||
                isEscape(event.nativeEvent)
              ) {
                // End the editing session
                event.preventDefault();
                (event.target as HTMLElement).blur();
                if (vc.studioCtx.isDevMode) {
                  vc.tryBlurEditingText();
                }
              }

              if (
                event.nativeEvent.key === "Enter" &&
                (inline || isInInlineNodeMarker(editor, sub))
              ) {
                // Disable line breaks inside inline marker tpls.
                event.preventDefault();
                return;
              }

              const { selection } = editor;
              if (selection && Range.isCollapsed(selection)) {
                // If Enter is pressed and we're in a block-level marker, we may
                // want to leave the block. We let maybeLeaveBlock decide whether
                // to do that; if it returns true, it did that so we must prevent
                // default.
                if (
                  event.nativeEvent.key === "Enter" &&
                  isInNodeMarker(editor, sub)
                ) {
                  if (maybeAddNewItem(editor, sub)) {
                    event.preventDefault();
                    return;
                  }
                  if (maybeLeaveBlock(editor, sub)) {
                    event.preventDefault();
                    return;
                  }
                }

                // Let cursor step into and out inline elements without stepping
                // over characters.
                if (isHotkey("left")(event.nativeEvent)) {
                  event.preventDefault();
                  Transforms.move(editor, { unit: "offset", reverse: true });
                  return;
                }
                if (isHotkey("right")(event.nativeEvent)) {
                  event.preventDefault();
                  Transforms.move(editor, { unit: "offset" });
                  return;
                }
              }

              mkRichTextShortcuts(sub)
                .filter(({ hotkey }) => hotkey?.(event.nativeEvent))
                .forEach(({ fn }) => {
                  event.preventDefault();
                  spawn(fn(editor, shortcutOpts, sub));
                });
            },

            // Shouldn't leak key events to code components.
            onKeyUp: (e) => e.stopPropagation(),
            // Shouldn't leak click events in non-interactive mode only
            onClick: (e) => {
              if (readOnly) {
                return;
              }
              // NOTE: we must not use e.preventDefault in any other event handler below, or the Slate cursor will stop moving on click events
              // Meanwhile, preventDefault here in the onCLick event handler is required to make stopPropagation work in other click event handlers
              e.stopPropagation();
              e.preventDefault();
            },
            onMouseDown: (e) => {
              if (readOnly) {
                return;
              }
              e.stopPropagation();
            },
            onMouseUp: (e) => {
              if (readOnly) {
                return;
              }
              e.stopPropagation();
            },
            onPointerDown: (e) => {
              if (readOnly) {
                return;
              }
              e.stopPropagation();
            },
            onPointerUp: (e) => {
              if (readOnly) {
                return;
              }
              e.stopPropagation();
            },
            onDoubleClick: (e) => {
              if (readOnly) {
                return;
              }
              e.stopPropagation();
            },
            onDragStart: (e) => {
              if (readOnly) {
                return;
              }
              e.stopPropagation();
            },
          }),
        });
      }, `mkCanvasText(${node.uuid})`);
    },
  {
    keepAlive: true,
  }
);

const mkTextChild = computedFn(
  (vc: ViewCtx) =>
    ({ node, ctx }: { node: TplNode; ctx: RenderingCtx }) =>
      mkUseCanvasObserver(vc.canvasCtx.Sub, vc)(
        () => renderTplNode(node, ctx),
        `mkTextChild(${node.uuid})`
      ),
  { keepAlive: true }
);

interface SlateChildrenProps {
  node: TplTag;
  inline: boolean;
  slate: SlateRenderNodeOpts;
  effectiveVs: EffectiveVariantSetting;
  ctx: RenderingCtx;
}

// SlateChildren is used when a parent rich text is being edited. In that
// case we must simply render slate children to avoid having Slate instances
// inside other Slate instances and to render the children that Slate
// expects.
export const mkSlateChildren = computedFn(
  (react: typeof React) =>
    function SlateChildren({
      node,
      inline,
      slate,
      ctx,
      effectiveVs,
    }: SlateChildrenProps) {
      return mkUseCanvasObserver(ctx.sub, ctx.viewCtx)(
        () =>
          withErrorDisplayFallback(
            react,
            ctx,
            node,
            () => {
              const { sub } = ctx;
              const selected = sub.slateReact.useSelected();
              const className = mkClassName(node, inline);

              const exprTextElement = isExprText(effectiveVs.text)
                ? react.createElement("span", {
                    ...mkExprTextProps(node, effectiveVs, ctx.env, {
                      projectFlags: ctx.projectFlags,
                      component: ctx.ownerComponent ?? null,
                      inStudio: true,
                    }),
                  })
                : null;

              return inline
                ? react.createElement("span", {
                    className,
                    style: {
                      ...DEFAULT_TEXT_STYLE,
                      ...(selected ? { boxShadow: "0 0 0 3px #0070f311" } : {}),
                    },
                    children: [
                      inlineCursorFix(0, sub),
                      slate.children,
                      exprTextElement,
                      inlineCursorFix(2, sub),
                    ],
                  })
                : react.createElement("div", {
                    className,
                    style: DEFAULT_TEXT_STYLE,
                    children: [slate.children, exprTextElement],
                  });
            },
            {
              hasLoadingBoundary: ctx.env.$ctx[hasLoadingBoundaryKey],
            }
          ),
        `mkSlateChildren(${node.uuid})`
      );
    },
  {
    keepAlive: true,
  }
);

function mkClassName(node: TplTag, inline: boolean): string {
  return cx(
    node.type === "text"
      ? "__wab_rich_text"
      : hasGapStyle(node)
      ? makeWabFlexContainerClassName({ targetEnv: "canvas" })
      : undefined,
    inline ? "__wab_inline" : undefined
  );
}

const DEFAULT_TEXT_STYLE: React.CSSProperties = {
  // inherit the white-space property from text element
  whiteSpace: undefined,
  overflowWrap: "normal",
  // Reset `position: relative` set by Slate's Editable element. That's
  // needed to make background clipped to text work properly. References:
  // - https://app.shortcut.com/plasmic/story/20229/
  // - https://stackoverflow.com/q/55856550
  position: "static",
};

/**
 * This function returns whether a paragraph is a block TplTag paragraph.
 * A paragraph is a block TplTag paragraph if it has the form
 * `[{text: ""}, {type: "TplTag", tag: "<tag>"}, {text: ""}]` where <tag>
 * is not an inline tag.
 */
function isBlockTplTagParagraph(children: Descendant[]) {
  if (children.length !== 3) {
    return false;
  }

  if (children[0]["text"] !== "" || children[2]["text"] !== "") {
    return false;
  }

  return children[1]["tag"] && !isTagInline(children[1]["tag"]);
}

function tplToSlateNodes(
  node: TplTag,
  ctx: Pick<RenderingCtx, "site" | "activeVariants" | "ownerComponent">,
  effectiveVs: EffectiveVariantSetting
): Descendant[] {
  if (!effectiveVs.text) {
    // If the node is not of "text" type, we should simply convert and return
    // its children.
    return node.children.flatMap((c) => {
      const child = ensureKnownTplTag(c);
      const childVSettings = getSortedActiveVariantSettings(child, ctx);
      const childEffectiveVs = new EffectiveVariantSetting(
        child,
        childVSettings,
        ctx.site
      );
      return {
        type: "TplTag",
        tag: child.tag as (typeof htmlTags)[number],
        uuid: child.uuid,
        children: tplToSlateNodes(child, ctx, childEffectiveVs),
      };
    });
  }

  if (isExprText(effectiveVs.text)) {
    return [
      {
        expr: effectiveVs.text.expr,
        html: effectiveVs.text.html,
        children: [{ text: "" }],
      } as SlateElement,
    ];
  }

  const rawText = ensureKnownRawText(effectiveVs.text);
  let minMarkerPosition = 0;
  const sortedMarkers = rawText.markers
    .slice()
    .sort((mark1, mark2) => mark1.position - mark2.position);
  const nodes: Descendant[] = rawText.text
    .split("\n")
    .map((markerText): Descendant => {
      // Need to add 1 to account for '\n', which is not in markerText.
      const maxMarkerPosition = minMarkerPosition + markerText.length + 1;
      const markersForThisSlice = sortedMarkers
        .filter(
          (marker) =>
            marker.position >= minMarkerPosition &&
            marker.position < maxMarkerPosition
        )
        .map((marker) =>
          Object.assign({}, marker, {
            position: marker.position - minMarkerPosition,
          })
        );

      minMarkerPosition += markerText.length + 1;

      const children = normalizeMarkers(
        markersForThisSlice,
        markerText.length,
        isTagInline(node.tag)
      ).flatMap((marker): Descendant => {
        if (marker.type === "styleMarker") {
          return {
            text: markerText.slice(
              marker.position,
              marker.position + marker.length
            ),
            ...getCssRulesFromRs(marker.rs),
          };
        }

        if (marker.type === "nodeMarker") {
          const childTpl = ensureKnownTplTag(marker.tpl);
          const childVSettings = getSortedActiveVariantSettings(childTpl, ctx);
          const childEffectiveVs = new EffectiveVariantSetting(
            childTpl,
            childVSettings,
            ctx.site
          );
          const meta = {
            type: isExprText(childEffectiveVs.text)
              ? "TplTagExprText"
              : "TplTag",
            tag: childTpl.tag,
            uuid: childTpl.uuid,
          };
          const _children = tplToSlateNodes(childTpl, ctx, childEffectiveVs);
          if (
            _children.length === 1 &&
            (isExprText(childEffectiveVs.text) || isTagInline(childTpl.tag))
          ) {
            return { ..._children[0], ...meta } as SlateElement;
          } else {
            return { children: _children, ...meta } as SlateElement;
          }
        }

        return {
          text: markerText.slice(
            marker.position,
            marker.position + marker.length
          ),
        };
      });

      // When we get a line with "[child]", it could be either a paragraph
      // with an inline tag inside (e.g. a line containing only a link) or
      // a block-level element (e.g. a heading). This `if` deals with the
      // latter; in that case we don't want to return {type: "paragraph",
      // children}, but simply the TplTag element, which is in children[1]
      // because children[0] and children[2] will be empty texts.
      if (isBlockTplTagParagraph(children)) {
        return children[1];
      }

      return {
        type: "paragraph",
        children: children.length ? children : [{ text: markerText }],
      };
    });
  return nodes;
}

function getDescendentsAndRelativeValKeys(root: TplTag) {
  const result: [TplNode, string][] = [];
  walkTpls(root, {
    pre: (tpl, path) => {
      result.push([
        tpl,
        [...path, tpl]
          .filter((v) => v !== root)
          .map((v) => v.uuid)
          .join("."),
      ]);
    },
  });
  return result;
}
