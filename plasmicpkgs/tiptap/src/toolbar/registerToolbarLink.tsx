import { useCurrentEditor } from "@tiptap/react";
import React from "react";
import { useTiptapContext } from "../contexts";
import { TIPTAP_COMPONENT_NAME } from "../registerTiptap";
import { Registerable, registerComponentHelper } from "../utils";

export interface ToolbarLinkProps {
  className: string;
  children: React.ReactNode;
  selectedClassName: string;
  toolbarLinkScopeClassName: string;
}

export function ToolbarLink(props: ToolbarLinkProps) {
  const { editor } = useCurrentEditor();
  const { link } = useTiptapContext();

  const { className, children, toolbarLinkScopeClassName } = props;

  if (!editor || !link) return null;

  return (
    <div
      // data-active attribute is used here to increase the priority/specificity of the selectedClassName prop styles
      data-active={editor.isActive("link") ? true : false}
      className={`${className} ${toolbarLinkScopeClassName}`}
      style={{ cursor: "pointer" }}
      role="button"
      onClick={() => editor.chain().focus().toggleMark("link").run()}
    >
      {children}
    </div>
  );
}
ToolbarLink.displayName = "ToolbarLink";

export function registerToolbarLink(loader?: Registerable) {
  registerComponentHelper(loader, ToolbarLink, {
    name: `${TIPTAP_COMPONENT_NAME}-toolbar-link`,
    displayName: "Tiptap Link Toolbar Option",
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
            src: "https://static1.plasmic.app/link.svg",
          },
        ],
      },
      toolbarLinkScopeClassName: {
        type: "styleScopeClass",
        scopeName: "toolbarLink",
      } as any,
      selectedClassName: {
        type: "class",
        displayName: "Tool Selected",
        selectors: [
          {
            selector: ":toolbarLink[data-active=true]",
            label: "Base",
          },
        ],
      },
    },
    importName: "ToolbarLink",
    importPath: "@plasmicpkgs/tiptap/skinny/registerToolbarLink",
    parentComponentName: TIPTAP_COMPONENT_NAME,
  });
}
