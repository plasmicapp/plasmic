import { useCurrentEditor } from "@tiptap/react";
import React from "react";
import { useTiptapContext } from "../contexts";
import { TIPTAP_COMPONENT_NAME } from "../registerTiptap";
import { Registerable, registerComponentHelper } from "../utils";

export interface ToolbarItalicProps {
  className: string;
  children: React.ReactNode;
  selectedClassName: string;
  toolbarItalicScopeClassName: string;
}

export function ToolbarItalic(props: ToolbarItalicProps) {
  const { editor } = useCurrentEditor();
  const { italic } = useTiptapContext();

  const { className, children, toolbarItalicScopeClassName } = props;

  if (!editor || !italic) return null;

  return (
    <div
      // data-active attribute is used here to increase the priority/specificity of the selectedClassName prop styles
      data-active={editor.isActive("italic") ? true : false}
      className={`${className} ${toolbarItalicScopeClassName}`}
      style={{ cursor: "pointer" }}
      role="button"
      onClick={() => editor.chain().focus().toggleMark("italic").run()}
    >
      {children}
    </div>
  );
}
ToolbarItalic.displayName = "ToolbarItalic";

export function registerToolbarItalic(loader?: Registerable) {
  registerComponentHelper(loader, ToolbarItalic, {
    name: `${TIPTAP_COMPONENT_NAME}-toolbar-italic`,
    displayName: "Tiptap Italic Toolbar Option",
    defaultStyles: {
      width: "hug",
      padding: "5px",
    },
    props: {
      children: {
        type: "slot",
        hidePlaceholder: true,
        defaultValue: [
          {
            type: "img",
            src: "https://static1.plasmic.app/italic.svg",
            styles: {
              width: "hug",
            },
          },
        ],
      },
      toolbarItalicScopeClassName: {
        type: "styleScopeClass",
        scopeName: "toolbarItalic",
      } as any,
      selectedClassName: {
        type: "class",
        displayName: "Tool Selected",
        selectors: [
          {
            selector: ":toolbarItalic[data-active=true]",
            label: "Base",
          },
        ],
      },
    },
    importName: "ToolbarItalic",
    importPath: "@plasmicpkgs/tiptap/skinny/registerToolbarItalic",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
