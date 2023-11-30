import { useCurrentEditor } from "@tiptap/react";
import React from "react";
import { useTiptapContext } from "../contexts";
import { TIPTAP_COMPONENT_NAME } from "../registerTiptap";
import { Registerable, registerComponentHelper } from "../utils";

export interface ToolbarUnderlineProps {
  className: string;
  children: React.ReactNode;
  selectedClassName: string;
  toolbarUnderlineScopeClassName: string;
}

export function ToolbarUnderline(props: ToolbarUnderlineProps) {
  const { editor } = useCurrentEditor();
  const { underline } = useTiptapContext();

  const { className, children, toolbarUnderlineScopeClassName } = props;

  if (!editor || !underline) return null;

  return (
    <div
      // data-active attribute is used here to increase the priority/specificity of the selectedClassName prop styles
      data-active={editor.isActive("underline") ? true : false}
      className={`${className} ${toolbarUnderlineScopeClassName}`}
      style={{ cursor: "pointer" }}
      role="button"
      onClick={() => editor.chain().focus().toggleMark("underline").run()}
    >
      {children}
    </div>
  );
}
ToolbarUnderline.displayName = "ToolbarUnderline";

export function registerToolbarUnderline(loader?: Registerable) {
  registerComponentHelper(loader, ToolbarUnderline, {
    name: `${TIPTAP_COMPONENT_NAME}-toolbar-underline`,
    displayName: "Tiptap Underline Toolbar Option",
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
            src: "https://static1.plasmic.app/underline.svg",
          },
        ],
      },
      toolbarUnderlineScopeClassName: {
        type: "styleScopeClass",
        scopeName: "toolbarUnderline",
      } as any,
      selectedClassName: {
        type: "class",
        displayName: "Tool Selected",
        selectors: [
          {
            selector: ":toolbarUnderline[data-active=true]",
            label: "Base",
          },
        ],
      },
    },
    importName: "ToolbarUnderline",
    importPath: "@plasmicpkgs/tiptap/skinny/registerToolbarUnderline",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
