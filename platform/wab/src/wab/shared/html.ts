import { isOneOf } from "@/wab/shared/common";

/**
 * Table tags are kept separate from TAGS because Studio attaches no metadata
 * to them; they are only used to detect table sub-elements.
 */
export const tableTags = [
  "table",
  "tr",
  "th",
  "thead",
  "tbody",
  "tfoot",
  "td",
] as const;

interface TagMeta {
  /** Human-friendly name shown in tag selectors. */
  displayName: string;
  /** Usable as an inline element inside a rich-text block. */
  richTextInline?: boolean;
  /** Usable as a block element inside a rich-text block. */
  richTextBlock?: boolean;
  /** Supports setting default styles in the Default Styles panel. */
  themable?: boolean;
}

/**
 * Master metadata for the tags Studio works with. The tag lists exported
 * below are all derived from this object; key order determines list order.
 *
 * Note this is not the full set of tags Studio can render: TplTag.tag is an
 * open string in the model, and tags outside this set (e.g. svg for icons,
 * img for images) exist. This is the set Studio attaches behavior to.
 *
 * When adding a tag, note the companion data that lives elsewhere: an icon in
 * INLINE_TAG_ICONS (RichTextToolbar) for richTextInline tags, an optional
 * hotkey shortcut in mkRichTextShortcuts (CanvasText), and the CSS resets in
 * cssInitialsOverrides (shared/css.ts).
 */
const TAGS = {
  div: { displayName: "Box" },
  button: { displayName: "Button" },
  a: { displayName: "Link", richTextInline: true, themable: true },
  h1: { displayName: "H1", richTextBlock: true, themable: true },
  h2: { displayName: "H2", richTextBlock: true, themable: true },
  h3: { displayName: "H3", richTextBlock: true, themable: true },
  h4: { displayName: "H4", richTextBlock: true, themable: true },
  h5: { displayName: "H5", richTextBlock: true, themable: true },
  h6: { displayName: "H6", richTextBlock: true, themable: true },
  hgroup: { displayName: "Heading group" },
  address: { displayName: "Address" },
  article: { displayName: "Article" },
  aside: { displayName: "Aside" },
  blockquote: {
    displayName: "Blockquote",
    richTextBlock: true,
    themable: true,
  },
  cite: { displayName: "Citation" },
  code: { displayName: "Code", richTextInline: true, themable: true },
  dl: { displayName: "Description list" },
  dt: { displayName: "Term" },
  dd: { displayName: "Description" },
  figure: { displayName: "Figure" },
  figcaption: { displayName: "Figure caption" },
  footer: { displayName: "Footer" },
  form: { displayName: "Form" },
  label: { displayName: "Label" },
  ul: { displayName: "Unordered list", themable: true },
  ol: { displayName: "Ordered list", themable: true },
  li: { displayName: "List item", themable: true },
  header: { displayName: "Header" },
  main: { displayName: "Main" },
  nav: { displayName: "Nav" },
  p: { displayName: "Paragraph", themable: true },
  pre: { displayName: "Pre", richTextBlock: true, themable: true },
  section: { displayName: "Section" },
  span: { displayName: "Span", richTextInline: true },
  input: { displayName: "Input" },
  textarea: { displayName: "Text area" },
  strong: { displayName: "Strong", richTextInline: true, themable: true },
  em: { displayName: "Emphasis", richTextInline: true, themable: true },
  b: { displayName: "Bold", richTextInline: true, themable: true },
  i: { displayName: "Italic", richTextInline: true, themable: true },
  sub: { displayName: "Subscript", richTextInline: true },
  sup: { displayName: "Superscript", richTextInline: true },
} as const satisfies Record<string, TagMeta>;

export type TagName = keyof typeof TAGS;
type TagFlag = Exclude<keyof TagMeta, "displayName">;

/** Tag names whose metadata sets flag `F` to true. */
type TagsWhere<F extends TagFlag> = {
  [K in TagName]: (typeof TAGS)[K] extends Record<F, true> ? K : never;
}[TagName];

function tagsWhere<F extends TagFlag>(flag: F): readonly TagsWhere<F>[] {
  return Object.entries(TAGS)
    .filter(([, meta]) => (meta as TagMeta)[flag] === true)
    .map(([tag]) => tag) as TagsWhere<F>[];
}

export const textInlineTags = tagsWhere("richTextInline");
export type TextInlineTag = (typeof textInlineTags)[number];
export const textBlockTags = tagsWhere("richTextBlock");
export const listContainerTags = [
  "ol",
  "ul",
] as const satisfies readonly TagName[];

/**
 * Tags that a generic element can be freely switched to. This is what the Tag
 * dropdown offers and what the web importer preserves (other tags are
 * imported as divs).
 *
 * Excludes list tags because they have structural constraints — a list
 * container should only contain list items and a list item should only live
 * in a list container — so freely switching an element to or from them would
 * corrupt list structure. They are handled by dedicated list UI instead.
 */
export const GENERAL_TAGS: readonly TagName[] = (
  Object.keys(TAGS) as TagName[]
).filter((tag) => !["ol", "ul", "li"].includes(tag));

/** Tags surfaced in the "Common" group of the Tag dropdown. */
export const COMMON_TAGS: readonly TagName[] = [
  "div",
  "button",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
];

export function isTagInline(tag: string): tag is TextInlineTag {
  return isOneOf(tag, textInlineTags);
}

export function isTagListContainer(
  tag: string
): tag is (typeof listContainerTags)[number] {
  return isOneOf(tag, listContainerTags);
}

/**
 * Base "tag" that is the root of all themable tags (the default typography).
 * Obviously not a real tag, but it represents all elements.
 * In some places, we split a selector into tag and pseudo-class parts,
 * so this just works for selectors like ":hover".
 */
export const BASE_THEMABLE_TAG = "";
export const THEMABLE_TAGS = tagsWhere("themable");

export type ThemableTag =
  | typeof BASE_THEMABLE_TAG
  | (typeof THEMABLE_TAGS)[number];

export function isTagThemable(
  tag: string
): tag is (typeof THEMABLE_TAGS)[number] {
  return isOneOf(tag, THEMABLE_TAGS);
}

export function tagDisplayLabel(tag: string) {
  const meta = TAGS[tag as TagName];
  return meta ? `${meta.displayName} <${tag}>` : `<${tag}>`;
}
