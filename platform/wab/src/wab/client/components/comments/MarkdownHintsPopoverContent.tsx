import { MarkdownHintRow } from "@/wab/client/components/comments/MarkdownHintRow";
import {
  DefaultMarkdownHintsPopoverContentProps,
  PlasmicMarkdownHintsPopoverContent,
} from "@/wab/client/plasmic/plasmic_kit_comments/PlasmicMarkdownHintsPopoverContent";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export type MarkdownHintsPopoverContentProps =
  DefaultMarkdownHintsPopoverContentProps;

const MARKDOWN_HINTS = [
  {
    name: "Heading",
    rules: ["# H1", "## H2", "### H3"],
  },
  { name: "Bold", rules: ["**bold**"] },
  { name: "Italic", rules: ["*italic*"] },
  { name: "Blockquote", rules: ["> blockquote"] },
  {
    name: "Ordered list",
    rules: ["1. First item", "2. Second item", "3. Third item"],
  },
  {
    name: "Unordered list",
    rules: ["- First item", "- Second item", "- Third item"],
  },
  { name: "Code", rules: ["`code`"] },
  { name: "Horizontal rule", rules: ["---"] },
  { name: "Link", rules: ["[title](https://www.link.com)"] },
];

function MarkdownHintsPopoverContent_(
  props: MarkdownHintsPopoverContentProps,
  ref: HTMLElementRefOf<"div">
) {
  return (
    <PlasmicMarkdownHintsPopoverContent
      root={{ ref }}
      {...props}
      content={{
        children: MARKDOWN_HINTS.map((hint) => (
          <MarkdownHintRow name={hint.name} rules={hint.rules} />
        )),
      }}
    />
  );
}

export const MarkdownHintsPopoverContent = React.forwardRef(
  MarkdownHintsPopoverContent_
);
