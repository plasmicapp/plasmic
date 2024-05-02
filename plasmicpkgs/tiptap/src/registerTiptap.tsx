import { usePlasmicCanvasContext } from "@plasmicapp/host";
import { ActionProps } from "@plasmicapp/host/registerComponent";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import type { Extensions, JSONContent } from "@tiptap/react";
import { EditorProvider } from "@tiptap/react";
import { Switch } from "antd";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  allExtensions,
  TiptapContextProvider,
  useTiptapContext,
} from "./contexts";
import { useIsClient } from "./useIsClient";
import {
  Registerable,
  registerComponentHelper,
  traverseReactEltTree,
} from "./utils";

export const TIPTAP_COMPONENT_NAME = "hostless-tiptap";

export type TiptapProps = {
  contentHtml?: string;
  contentJson?: JSONContent;
  defaultContentJson?: JSONContent;
  useJson: boolean;
  extensions?: React.ReactElement;
  toolbar?: React.ReactElement;
  className: string;
  onChange: (content: JSONContent) => void;
};

export function Tiptap(props: TiptapProps) {
  const isClient = useIsClient();
  const [active, setActive] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const activeRef = useRef<boolean>();
  activeRef.current = active;

  const {
    extensions,
    contentHtml,
    defaultContentJson,
    className,
    onChange,
    toolbar,
    useJson,
  } = props;
  const { ...tiptapContext } = useTiptapContext();
  const usedExtensions: Record<string, any> = allExtensions.reduce(
    (acc: any, ext) => {
      if (tiptapContext[ext] !== undefined) {
        acc[ext] = tiptapContext[ext];
      }
      return acc;
    },
    {}
  );

  const extensionsProp: Extensions = [
    Document,
    Paragraph,
    Text,
    ...Object.values(usedExtensions),
  ];

  const isCanvas = usePlasmicCanvasContext();
  const defaultContent = useJson ? defaultContentJson : contentHtml;

  // If you try to update the content via the content prop (as opposed to directly typing into the tiptap editor), the new content won't show. So we got to refresh the editor to make the default content appear.
  useEffect(() => {
    // only refresh key if the user is not typing
    if (activeRef.current) return;
    setRefreshKey(Math.random() * 1000000);
  }, [...(isCanvas ? [defaultContent] : [])]);

  if (!isClient) {
    return null;
  }

  const css = `
    .tiptap {
      padding: 0;
      outline: none;
    }
  `;

  const toolbarProp = toolbar ? (
    <div style={{ display: "flex", alignItems: "center" }}>{toolbar}</div>
  ) : null;

  return (
    <div className={className} style={{ position: "relative" }}>
      {/* Editor provider is an uncontrolled component */}
      <EditorProvider
        extensions={extensionsProp}
        key={`${extensionsProp.length}${refreshKey}`}
        content={defaultContent}
        onCreate={({ editor }) => {
          onChange(editor.getJSON());
        }}
        onUpdate={({ editor }) => {
          onChange(editor.getJSON());
        }}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        slotBefore={toolbarProp}
        // slotAfter={<MyEditorFooter />}

        // TODO: HIDE children prop
        children={undefined}
        editorProps={{
          attributes: {
            className,
          },
        }}
      />
      {extensions}
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </div>
  );
}

export function TiptapWrapper(props: TiptapProps) {
  return (
    <TiptapContextProvider>
      <Tiptap {...props} />
    </TiptapContextProvider>
  );
}

export function AddExtension({
  studioOps,
  componentProps,
}: ActionProps<TiptapProps>) {
  const usedExtensions: string[] = useMemo(() => {
    const list: string[] = [];
    traverseReactEltTree(componentProps?.extensions, (elt) => {
      const ext = elt?.type?.displayName?.toLowerCase?.();
      if (ext) {
        list.push(ext);
      }
    });
    return list;
  }, [componentProps?.extensions]);

  const usedExtensionTools: string[] = useMemo(() => {
    const list: string[] = [];
    traverseReactEltTree(componentProps?.toolbar, (elt) => {
      const ext = elt?.type?.displayName?.toLowerCase?.();
      if (ext && ext.includes("toolbar")) {
        list.push(ext.replace("toolbar", ""));
      }
    });
    return list;
  }, [componentProps?.toolbar]);

  const handleChange = (extName: string, add: boolean) => {
    if (add) {
      studioOps.appendToSlot(
        {
          type: "component",
          name: `${TIPTAP_COMPONENT_NAME}-extension-${extName}`,
          props: {},
        },
        "extensions"
      );
      studioOps.appendToSlot(
        {
          type: "component",
          name: `${TIPTAP_COMPONENT_NAME}-toolbar-${extName}`,
          props: {},
        },
        "toolbar"
      );
    } else {
      const extIndices = usedExtensions.flatMap((ext, i) =>
        ext === extName ? i : []
      );
      extIndices
        .reverse()
        .forEach(
          (i) => i !== -1 && studioOps.removeFromSlotAt(i, "extensions")
        );

      const toolIndices = usedExtensionTools.flatMap((ext, i) =>
        ext === extName ? i : []
      );
      toolIndices
        .reverse()
        .forEach((i) => i !== -1 && studioOps.removeFromSlotAt(i, "toolbar"));
    }
  };

  return (
    <div
      style={{
        marginBottom: 10,
        paddingBottom: 10,
        borderBottom: "1px dashed #ccc",
      }}
    >
      <p>
        You can add capabilities to Tiptap Rich Text Editor using the tools
        below.
      </p>
      <p>
        To further customize the extensions, find them under the Editor's
        "extensions" and "toolbar" slots
      </p>
      {allExtensions.map((ext) => (
        <label
          key={ext}
          data-test-id={`custom-action-${ext}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
            color: "#1b1b18",
          }}
        >
          <span>{ext}</span>
          <Switch
            size="small"
            checked={
              usedExtensions.includes(ext) || usedExtensionTools.includes(ext)
            }
            onChange={(checked) => handleChange(ext, checked)}
          />
        </label>
      ))}
    </div>
  );
}

export function registerTiptap(loader?: Registerable) {
  registerComponentHelper(loader, TiptapWrapper, {
    name: TIPTAP_COMPONENT_NAME,
    displayName: "Tiptap Rich Text Editor",
    defaultStyles: {
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "rgb(204,204,204)",
      borderRadius: "4px",
      padding: "10px",
      width: "300px",
    },
    actions: [
      {
        type: "custom-action",
        control: AddExtension,
      },
    ],
    props: {
      useJson: {
        displayName: "Use JSON default content",
        type: "boolean",
        defaultValue: false,
      },
      // a better naming for this would be defaultContentHtml, but we can't change the name anymore for backwards compatibility reasons (can't change the name of an existing prop)
      contentHtml: {
        type: "string",
        displayName: "HTML Content",
        description: "Provide default content as HTML",
        hidden: (ps) => ps.useJson,
      },
      defaultContentJson: {
        type: "object",
        displayName: "JSON Content",
        description: "Provide default content as JSON",
        hidden: (ps) => !ps.useJson,
      },
      // contentJson is exposed as state, and its not combined with defaultContentJson via "editOnly/uncontrolledProp" fields because
      // that pattern is for controlled components, while the wrapped component (EditorProvider) is an uncontrolled component.
      contentJson: {
        type: "object",
        hidden: () => true,
      },
      extensions: {
        type: "slot",
        hidePlaceholder: true,
        allowedComponents: allExtensions.map(
          (ext) => `${TIPTAP_COMPONENT_NAME}-extension-${ext}`
        ),
      },
      toolbar: {
        type: "slot",
        hidePlaceholder: true,
        allowedComponents: allExtensions.map(
          (ext) => `${TIPTAP_COMPONENT_NAME}-toolbar-${ext}`
        ),
      },
      onChange: {
        type: "eventHandler",
        argTypes: [{ name: "content", type: "object" }],
      },
    },
    states: {
      content: {
        type: "writable",
        variableType: "object",
        valueProp: "contentJson",
        onChangeProp: "onChange",
      },
    },
    importName: "TiptapWrapper",
    importPath: "@plasmicpkgs/tiptap/skinny/registerTiptap",
  });
}
