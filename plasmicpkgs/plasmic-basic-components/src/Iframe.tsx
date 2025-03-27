import { ComponentMeta, PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import React, { useContext } from "react";

export interface IframeProps {
  src: string;
  preview?: boolean;
  className?: string;
  onLoad?: React.ComponentProps<"iframe">["onLoad"];
}

export function Iframe({ preview, src, className, onLoad }: IframeProps) {
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
  return <iframe src={src} className={className} onLoad={onLoad} />;
}

export const iframeMeta: ComponentMeta<IframeProps> = {
  name: "hostless-iframe",
  displayName: "Iframe",
  importName: "Iframe",
  importPath: "@plasmicpkgs/plasmic-basic-components",
  props: {
    src: {
      type: "string",
      defaultValue: "https://www.example.com",
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
  customIframeMeta?: ComponentMeta<IframeProps>
) {
  if (loader) {
    loader.registerComponent(Iframe, customIframeMeta ?? iframeMeta);
  } else {
    registerComponent(Iframe, customIframeMeta ?? iframeMeta);
  }
}
