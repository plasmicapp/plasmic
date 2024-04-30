/**
This file was copied from https://github.com/ianstormtaylor/slate/blob/slate-react%400.72.1/packages/slate-react/src/components/string.tsx
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
import React from "react";
import { Editor, Element, Node, Path, Text } from "slate";
import SlateReact from "slate-react";

/**
 * Leaf content strings.
 */

export const mkSlateString = computedFn(
  (react: typeof React, slateReact: typeof SlateReact) =>
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

      // COMPAT: Render text inside void nodes with a zero-width space.
      // So the node can contain selection but the text is not visible.
      if (editor.isVoid(parent)) {
        // return <ZeroWidthString length={Node.string(parent).length} />
        return react.createElement(mkZeroWidthString(react), {
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
        // return <ZeroWidthString isLineBreak />;
        return react.createElement(mkZeroWidthString(react), {
          isLineBreak: true,
        });
      }

      // COMPAT: If the text is empty, it's because it's on the edge of an inline
      // node, so we render a zero-width space so that the selection can be
      // inserted next to it still.
      if (leaf.text === "") {
        // return <ZeroWidthString />;
        return react.createElement(mkZeroWidthString(react));
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
      const getTextContent = () => {
        return `${text ?? ""}${isTrailing ? "\n" : ""}`;
      };
      const ref = react.useRef<HTMLSpanElement>(null);
      const forceUpdateCount = react.useRef(0);

      if (ref.current && ref.current.textContent !== text) {
        forceUpdateCount.current += 1;
      }

      // return (
      //   <span data-slate-string ref={ref} key={forceUpdateCount.current}>
      //     {text}
      //     {isTrailing ? "\n" : null}
      //   </span>
      // );

      return react.createElement(
        "span",
        {
          "data-slate-string": true,
          ref,
          key: forceUpdateCount.current,
        },
        getTextContent()
      );
    },
  {
    keepAlive: true,
  }
);

/**
 * Leaf strings without text, render as zero-width strings.
 */

const mkZeroWidthString = computedFn(
  (react: typeof React) =>
    function ZeroWidthString(props: {
      length?: number;
      isLineBreak?: boolean;
    }) {
      const { length = 0, isLineBreak = false } = props;

      const attributes: {
        "data-slate-zero-width": string;
        "data-slate-length": number;
      } = {
        "data-slate-zero-width": isLineBreak ? "n" : "z",
        "data-slate-length": length,
      };

      // return (
      //   <span
      //     data-slate-zero-width={isLineBreak ? "n" : "z"}
      //     data-slate-length={length}
      //   >
      //     {"\uFEFF"}
      //     {isLineBreak ? <br /> : null}
      //   </span>
      // );

      return react.createElement("span", attributes, [
        "\uFEFF",
        isLineBreak ? react.createElement("br") : null,
      ]);
    },
  {
    keepAlive: true,
  }
);
