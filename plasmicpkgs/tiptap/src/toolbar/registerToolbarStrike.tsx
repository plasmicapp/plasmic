import { useCurrentEditor } from "@tiptap/react";
import React from "react";
import { useTiptapContext } from "../contexts";
import { TIPTAP_COMPONENT_NAME } from "../registerTiptap";
import { Registerable, registerComponentHelper } from "../utils";

export interface ToolbarStrikeProps {
  className: string;
  children: React.ReactNode;
  selectedClassName: string;
  toolbarStrikeScopeClassName: string;
}

export function ToolbarStrike(props: ToolbarStrikeProps) {
  const { editor } = useCurrentEditor();
  const { strike } = useTiptapContext();

  const { className, children, toolbarStrikeScopeClassName } = props;

  if (!editor || !strike) return null;

  return (
    <div
      // data-active attribute is used here to increase the priority/specificity of the selectedClassName prop styles
      data-active={editor.isActive("strike") ? true : false}
      className={`${className} ${toolbarStrikeScopeClassName}`}
      style={{ cursor: "pointer" }}
      role="button"
      onClick={() => editor.chain().focus().toggleMark("strike").run()}
    >
      {children}
    </div>
  );
}
ToolbarStrike.displayName = "ToolbarStrike";

export function registerToolbarStrike(loader?: Registerable) {
  registerComponentHelper(loader, ToolbarStrike, {
    name: `${TIPTAP_COMPONENT_NAME}-toolbar-strike`,
    displayName: "Tiptap Strike Toolbar Option",
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
            src: "https://static1.plasmic.app/strikethrough.svg",
          },
        ],
      },
      toolbarStrikeScopeClassName: {
        type: "styleScopeClass",
        scopeName: "toolbarStrike",
      } as any,
      selectedClassName: {
        type: "class",
        displayName: "Tool Selected",
        selectors: [
          {
            selector: ":toolbarStrike[data-active=true]",
            label: "Base",
          },
        ],
      },
    },
    importName: "ToolbarStrike",
    importPath: "@plasmicpkgs/tiptap/skinny/registerToolbarStrike",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
