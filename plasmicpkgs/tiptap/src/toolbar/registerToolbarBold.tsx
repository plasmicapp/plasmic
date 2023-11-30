import { useCurrentEditor } from "@tiptap/react";
import React from "react";
import { useTiptapContext } from "../contexts";
import { TIPTAP_COMPONENT_NAME } from "../registerTiptap";
import { Registerable, registerComponentHelper } from "../utils";

export interface ToolbarBoldProps {
  className: string;
  children: React.ReactNode;
  selectedClassName: string;
  toolbarBoldScopeClassName: string;
}

export function ToolbarBold(props: ToolbarBoldProps) {
  const { editor } = useCurrentEditor();
  const { bold } = useTiptapContext();

  const { className, children, toolbarBoldScopeClassName } = props;

  if (!editor || !bold) return null;

  return (
    <div
      // data-active attribute is used here to increase the priority/specificity of the selectedClassName prop styles
      data-active={editor.isActive("bold") ? true : false}
      className={`${className} ${toolbarBoldScopeClassName}`}
      style={{ cursor: "pointer" }}
      role="button"
      onClick={() => editor.chain().focus().toggleMark("bold").run()}
    >
      {children}
    </div>
  );
}
ToolbarBold.displayName = "ToolbarBold";

export function registerToolbarBold(loader?: Registerable) {
  registerComponentHelper(loader, ToolbarBold, {
    name: `${TIPTAP_COMPONENT_NAME}-toolbar-bold`,
    displayName: "Tiptap Bold Toolbar Option",
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
            src: "https://static1.plasmic.app/bold.svg",
          },
        ],
      },
      toolbarBoldScopeClassName: {
        type: "styleScopeClass",
        scopeName: "toolbarBold",
      } as any,
      selectedClassName: {
        type: "class",
        displayName: "Tool Selected",
        selectors: [
          {
            selector: ":toolbarBold[data-active=true]",
            label: "Base",
          },
        ],
      },
    },
    importName: "ToolbarBold",
    importPath: "@plasmicpkgs/tiptap/skinny/registerToolbarBold",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
