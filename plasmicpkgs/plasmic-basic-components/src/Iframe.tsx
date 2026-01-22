import { PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { useContext } from "react";

export interface IframeProps {
  useHtml?: boolean;
  srcDoc?: string;
  src?: string;
  sandbox?: string;
  preview?: boolean;
  className?: string;
  onLoad?: React.ComponentProps<"iframe">["onLoad"];
}

export function Iframe({
  preview,
  src,
  srcDoc,
  sandbox,
  useHtml,
  className,
  onLoad,
}: IframeProps) {
  const isEditing = useContext(PlasmicCanvasContext);
  if (isEditing && !preview) {
    return (
      <div className={className}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#eee",
            color: "#888",
            fontSize: "36px",
            fontFamily: "sans-serif",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          Iframe placeholder
        </div>
      </div>
    );
  }
  const srcProps = useHtml ? { srcDoc } : { src };
  return (
    <iframe
      {...srcProps}
      sandbox={sandbox}
      className={className}
      onLoad={onLoad}
    />
  );
}

export const iframeMeta: CodeComponentMeta<IframeProps> = {
  name: "hostless-iframe",
  displayName: "Iframe",
  importName: "Iframe",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    useHtml: {
      type: "boolean",
      displayName: "Use HTML source",
      description:
        "Insert custom HTML directly into the iframe instead of using a URL.",
      defaultValue: false,
      advanced: true,
    },
    sandbox: {
      type: "string",
      displayName: "Sandbox",
      description:
        "Controls the restrictions applied to the content embedded in the iframe.",
    },
    srcDoc: {
      type: "code",
      lang: "html",
      displayName: "HTML source",
      description: "Raw HTML content that will be rendered inside an iframe.",
      defaultValue: `<div><h3>Heading</h3><p>Example text...</p></div>`,
      hidden: (props) => !props.useHtml,
    },
    src: {
      type: "string",
      defaultValue: "https://www.example.com",
      hidden: (props) => !!props.useHtml,
    },
    preview: {
      type: "boolean",
      description: "Load the iframe while editing in Plasmic Studio",
    },
    onLoad: {
      type: "eventHandler",
      argTypes: [{ name: "event", type: "object" }],
    },
  },
  defaultStyles: {
    width: "300px",
    height: "150px",
    maxWidth: "100%",
  },
};

export function registerIframe(
  loader?: { registerComponent: typeof registerComponent },
  customIframeMeta?: CodeComponentMeta<IframeProps>
) {
  if (loader) {
    loader.registerComponent(Iframe, customIframeMeta ?? iframeMeta);
  } else {
    registerComponent(Iframe, customIframeMeta ?? iframeMeta);
  }
}
