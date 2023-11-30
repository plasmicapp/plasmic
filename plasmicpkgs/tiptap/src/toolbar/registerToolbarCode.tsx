import { useCurrentEditor } from "@tiptap/react";
import React from "react";
import { useTiptapContext } from "../contexts";
import { TIPTAP_COMPONENT_NAME } from "../registerTiptap";
import { Registerable, registerComponentHelper } from "../utils";

export interface ToolbarCodeProps {
  className: string;
  children: React.ReactNode;
  selectedClassName: string;
  toolbarCodeScopeClassName: string;
}

export function ToolbarCode(props: ToolbarCodeProps) {
  const { editor } = useCurrentEditor();
  const { code } = useTiptapContext();

  const { className, children, toolbarCodeScopeClassName } = props;

  if (!editor || !code) return null;

  return (
    <div
      // data-active attribute is used here to increase the priority/specificity of the selectedClassName prop styles
      data-active={editor.isActive("code") ? true : false}
      className={`${className} ${toolbarCodeScopeClassName}`}
      style={{ cursor: "pointer" }}
      role="button"
      onClick={() => editor.chain().focus().toggleMark("code").run()}
    >
      {children}
    </div>
  );
}
ToolbarCode.displayName = "ToolbarCode";

export function registerToolbarCode(loader?: Registerable) {
  registerComponentHelper(loader, ToolbarCode, {
    name: `${TIPTAP_COMPONENT_NAME}-toolbar-code`,
    displayName: "Tiptap Code Toolbar Option",
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
            src: "https://static1.plasmic.app/code.svg",
          },
        ],
      },
      toolbarCodeScopeClassName: {
        type: "styleScopeClass",
        scopeName: "toolbarCode",
      } as any,
      selectedClassName: {
        type: "class",
        displayName: "Tool Selected",
        selectors: [
          {
            selector: ":toolbarCode[data-active=true]",
            label: "Base",
          },
        ],
      },
    },
    importName: "ToolbarCode",
    importPath: "@plasmicpkgs/tiptap/skinny/registerToolbarCode",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
