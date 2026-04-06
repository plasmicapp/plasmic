/**
This file was copied from https://github.com/ianstormtaylor/slate/blob/slate%400.124.0/packages/slate-react/src/components/string.tsx
and modified to support our specific use case, which contains multiple iframes.

The modifications include:
- Change in the signature of the function to receive the correct react and slateReact objects, from the canvas-packages.
- Usage of the computedFn function from mobx-utils to memoize the functions that create the elements.
- Usage of the react.createElement function to create the elements, instead of JSX.

No change was made to the logic of the file, only to the way the elements are created.

Issues with slate and iframes have already been reported in the following issue:
https://github.com/ianstormtaylor/slate/issues/3917

The issue in our case is the need to have an invariant that guarantees that the
elements are properly rendered/created in the right DOM. This seems to be a mixed
issue with the way slate breaks the text combined with our elements handling.
Also together with the check for a dom node by slate.
 */
import { computedFn } from "mobx-utils";
import type React from "react";
import { Editor, Element, Node, Path, Text } from "slate";
import type SlateDom from "slate-dom";
import type SlateReact from "slate-react";

/**
 * Leaf content strings.
 */
export const mkSlateString = computedFn(
  (
    react: typeof React,
    slateDom: typeof SlateDom,
    slateReact: typeof SlateReact
  ) =>
    function SlateString(props: {
      isLast: boolean;
      leaf: Text;
      parent: Element;
      text: Text;
    }) {
      const { isLast, leaf, parent, text } = props;
      const editor = slateReact.useSlateStatic();
      const path = slateReact.ReactEditor.findPath(editor, text);
      const parentPath = Path.parent(path);
      const isMarkPlaceholder = Boolean(leaf[slateDom.MARK_PLACEHOLDER_SYMBOL]);

      // COMPAT: Render text inside void nodes with a zero-width space.
      // So the node can contain selection but the text is not visible.
      if (editor.isVoid(parent)) {
        // return <ZeroWidthString length={Node.string(parent).length} />
        return react.createElement(mkZeroWidthString(react, slateDom), {
          length: Node.string(parent).length,
        });
      }

      // COMPAT: If this is the last text node in an empty block, render a zero-
      // width space that will convert into a line break when copying and pasting
      // to support expected plain text.
      if (
        leaf.text === "" &&
        parent.children[parent.children.length - 1] === text &&
        !editor.isInline(parent) &&
        Editor.string(editor, parentPath) === ""
      ) {
        // return <ZeroWidthString isLineBreak isMarkPlaceholder={isMarkPlaceholder} />;
        return react.createElement(mkZeroWidthString(react, slateDom), {
          isLineBreak: true,
          isMarkPlaceholder,
        });
      }

      // COMPAT: If the text is empty, it's because it's on the edge of an inline
      // node, so we render a zero-width space so that the selection can be
      // inserted next to it still.
      if (leaf.text === "") {
        // return <ZeroWidthString isMarkPlaceholder={isMarkPlaceholder} />;
        return react.createElement(mkZeroWidthString(react, slateDom), {
          isMarkPlaceholder,
        });
      }

      // COMPAT: Browsers will collapse trailing new lines at the end of blocks,
      // so we need to add an extra trailing new lines to prevent that.
      if (isLast && leaf.text.slice(-1) === "\n") {
        // return <TextString isTrailing text={leaf.text} />;
        return react.createElement(mkTextString(react), {
          text: leaf.text,
          isTrailing: true,
        });
      }

      // return <TextString text={leaf.text} />;
      return react.createElement(mkTextString(react), {
        text: leaf.text,
      });
    },
  {
    keepAlive: true,
  }
);

/**
 * Leaf strings with text in them.
 */
export const mkTextString = computedFn(
  (react: typeof React) =>
    function TextString(props: { text: string; isTrailing?: boolean }) {
      const { text, isTrailing = false } = props;
      const ref = react.useRef<HTMLSpanElement>(null);
      const getTextContent = () => {
        return `${text ?? ""}${isTrailing ? "\n" : ""}`;
      };
      const [initialText] = react.useState(getTextContent);

      // This is the actual text rendering boundary where we interface with the DOM
      // The text is not rendered as part of the virtual DOM, as since we handle basic character insertions natively,
      // updating the DOM is not a one way dataflow anymore. What we need here is not reconciliation and diffing
      // with previous version of the virtual DOM, but rather diffing with the actual DOM element, and replace the DOM <span> content
      // exactly if and only if its current content does not match our current virtual DOM.
      // Otherwise the DOM TextNode would always be replaced by React as the user types, which interferes with native text features,
      // eg makes native spellcheck opt out from checking the text node.

      // useLayoutEffect: updating our span before browser paint
      // Using react.useLayoutEffect (not an imported hook) to ensure we use
      // the canvas iframe's React instance, not the wab host bundle's.
      react.useLayoutEffect(() => {
        // null coalescing text to make sure we're not outputing "null" as a string in the extreme case it is nullish at runtime
        const textWithTrailing = getTextContent();

        if (ref.current && ref.current.textContent !== textWithTrailing) {
          ref.current.textContent = textWithTrailing;
        }

        // intentionally not specifying dependencies, so that this effect runs on every render
        // as this effectively replaces "specifying the text in the virtual DOM under the <span> below" on each render
      });

      // We intentionally render a memoized <span> that only receives the initial text content when the component is mounted.
      // We defer to the layout effect above to update the `textContent` of the span element when needed.
      //return <MemoizedText ref={ref}>{initialText}</MemoizedText>;
      return react.createElement(mkMemoizedText(react), {
        ref,
        children: initialText,
      });
    },
  {
    keepAlive: true,
  }
);

const mkMemoizedText = computedFn(
  (react: typeof React) =>
    react.memo(
      react.forwardRef<HTMLSpanElement, { children: string }>((props, ref) => {
        // return (
        //   <span data-slate-string ref={ref}>
        //     {props.children}
        //   </span>
        // );
        return react.createElement("span", {
          "data-slate-string": true,
          ref: ref,
          children: props.children,
        });
      })
    ),
  {
    keepAlive: true,
  }
);

/**
 * Leaf strings without text, render as zero-width strings.
 */
const mkZeroWidthString = computedFn(
  (react: typeof React, slateDom: typeof SlateDom) =>
    function ZeroWidthString(props: {
      length?: number;
      isLineBreak?: boolean;
      isMarkPlaceholder?: boolean;
    }) {
      const {
        length = 0,
        isLineBreak = false,
        isMarkPlaceholder = false,
      } = props;

      const attributes: {
        "data-slate-zero-width": string;
        "data-slate-length": number;
        "data-slate-mark-placeholder"?: boolean;
      } = {
        "data-slate-zero-width": isLineBreak ? "n" : "z",
        "data-slate-length": length,
      };

      if (isMarkPlaceholder) {
        attributes["data-slate-mark-placeholder"] = true;
      }

      // FIXME: Inserting the \uFEFF on iOS breaks capitalization at the start of an
      // empty editor (https://github.com/ianstormtaylor/slate/issues/5199).
      //
      // However, not inserting the \uFEFF on iOS causes the editor to crash when
      // inserting any text using an IME at the start of a block. This appears to
      // be because accepting an IME suggestion when at the start of a block (no
      // preceding \uFEFF) removes one or more DOM elements that `toSlateRange`
      // depends on. (https://github.com/ianstormtaylor/slate/issues/5703)

      // return (
      //   <span {...attributes}>
      //     {!IS_ANDROID || !isLineBreak ? "\uFEFF" : null}
      //     {isLineBreak ? <br /> : null}
      //   </span>
      // );
      return react.createElement("span", attributes, [
        !slateDom.IS_ANDROID || !isLineBreak ? "\uFEFF" : null,
        isLineBreak ? react.createElement("br") : null,
      ]);
    },
  {
    keepAlive: true,
  }
);
