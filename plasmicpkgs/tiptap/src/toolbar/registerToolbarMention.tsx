import { useCurrentEditor } from "@tiptap/react";
import React from "react";
import { useTiptapContext } from "../contexts";
import { TIPTAP_COMPONENT_NAME } from "../registerTiptap";
import { Registerable, registerComponentHelper } from "../utils";

export interface ToolbarMentionProps {
  className: string;
  children: React.ReactNode;
  selectedClassName: string;
  toolbarMentionScopeClassName: string;
}

export function ToolbarMention(props: ToolbarMentionProps) {
  const { editor } = useCurrentEditor();
  const { mention } = useTiptapContext();

  const { className, children, toolbarMentionScopeClassName } = props;

  if (!editor || !mention) return null;

  return (
    <div
      // data-active attribute is used here to increase the priority/specificity of the selectedClassName prop styles
      data-active={editor.isActive("mention") ? true : false}
      className={`${className} ${toolbarMentionScopeClassName}`}
      style={{ cursor: "pointer" }}
      role="button"
      onClick={() => editor.chain().focus().insertContent(" @").run()}
    >
      {children}
    </div>
  );
}
ToolbarMention.displayName = "ToolbarMention";

export function registerToolbarMention(loader?: Registerable) {
  registerComponentHelper(loader, ToolbarMention, {
    name: `${TIPTAP_COMPONENT_NAME}-toolbar-mention`,
    displayName: "Tiptap Mention Toolbar Option",
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
            src: "https://static1.plasmic.app/mention.svg",
          },
        ],
      },
      toolbarMentionScopeClassName: {
        type: "styleScopeClass",
        scopeName: "toolbarMention",
      } as any,
      selectedClassName: {
        type: "class",
        displayName: "Tool Selected",
        selectors: [
          {
            selector: ":toolbarMention[data-active=true]",
            label: "Base",
          },
        ],
      },
    },
    importName: "ToolbarMention",
    importPath: "@plasmicpkgs/tiptap/skinny/registerToolbarMention",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
