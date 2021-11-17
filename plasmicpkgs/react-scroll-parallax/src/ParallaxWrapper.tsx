import registerComponent from "@plasmicapp/host/registerComponent";
import { PlasmicCanvasContext } from "@plasmicapp/loader-nextjs";
import React, { useContext } from "react";
import { Parallax } from "react-scroll-parallax";

export interface ParallaxWrapperProps {
  xStart?: string;
  xEnd?: string;
  yStart?: string;
  yEnd?: string;
  disabled?: boolean;
  previewInEditor?: boolean;
}

export default function ParallaxWrapper({
  xStart = "0",
  xEnd = "0",
  yStart = "0",
  yEnd = "0",
  disabled,
  previewInEditor,
}: ParallaxWrapperProps) {
  const inEditor = useContext(PlasmicCanvasContext);
  return (
    <Parallax
      disabled={disabled || (inEditor && !previewInEditor)}
      x={[xStart, xEnd]}
      y={[yStart, yEnd]}
    />
  );
}

registerComponent(ParallaxWrapper, {
  name: "Parallax",
  importPath: "@plasmicpkgs/react-scroll-parallax/ParallaxWrapper",
  props: {
    children: "slot",
    yStart: {
      type: "string",
      defaultValue: "-50%",
      description:
        "The vertical offset at the start (when just scrolling into view). Can be % or px.",
    },
    yEnd: {
      type: "string",
      defaultValue: "50%",
      description:
        "The vertical offset at the end (when just scrolling out of view). Can be % or px.",
    },
    xStart: {
      type: "string",
      defaultValue: "50%",
      description:
        "The horizontal offset at the start (when just scrolling into view). Can be % or px.",
    },
    xEnd: {
      type: "string",
      defaultValue: "-50%",
      description:
        "The horizontal offset at the end (when just scrolling out of view). Can be % or px.",
    },
    disabled: {
      type: "boolean",
      description: "Disables the parallax effect.",
    },
    previewInEditor: {
      type: "boolean",
      description: "Enable the parallax effect in the editor.",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    maxWidth: "100%",
  },
});
