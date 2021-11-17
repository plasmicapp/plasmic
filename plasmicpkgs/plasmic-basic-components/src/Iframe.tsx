/** @format */

import { PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import React, { useContext } from "react";

export interface IframeProps {
  src: string;
  hideInEditor?: boolean;
  className?: string;
}

export default function Iframe({ hideInEditor, src, className }: IframeProps) {
  const isEditing = useContext(PlasmicCanvasContext);
  if (isEditing && !hideInEditor) {
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
  return <iframe src={src} className={className} />;
}

registerComponent(Iframe, {
  name: "Iframe",
  importPath: "@plasmicpkgs/plasmic-basic-components/Iframe",
  props: {
    src: {
      type: "string",
      defaultValue: "https://www.example.com",
    },
    hideInEditor: {
      type: "boolean",
      displayName: "Preview",
      description: "Load the iframe while editing in Plasmic Studio",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    width: "300px",
    height: "150px",
    maxWidth: "100%",
  },
});
