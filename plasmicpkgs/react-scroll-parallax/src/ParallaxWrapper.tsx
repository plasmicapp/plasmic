import { PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { useContext } from "react";
import { Parallax, ParallaxContext } from "react-scroll-parallax";

export interface ParallaxWrapperProps {
  xStart?: string;
  xEnd?: string;
  yStart?: string;
  yEnd?: string;
  disabled?: boolean;
  previewInEditor?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function ParallaxWrapper({
  xStart = "0",
  xEnd = "0",
  yStart = "0",
  yEnd = "0",
  disabled,
  previewInEditor,
  children,
  className,
}: ParallaxWrapperProps) {
  const inEditor = useContext(PlasmicCanvasContext);
  const hasContext = useContext(ParallaxContext) != null;
  if (!hasContext) {
    throw new Error(
      "Scroll Parallax can only be instantiated somewhere inside the Parallax Provider"
    );
  }
  return (
    <Parallax
      disabled={disabled || (inEditor && !previewInEditor)}
      x={[xStart, xEnd]}
      y={[yStart, yEnd]}
      className={className}
    >
      {children}
    </Parallax>
  );
}

const parallaxWrapperMeta: ComponentMeta<ParallaxWrapperProps> = {
  name: "Parallax",
  displayName: "Scroll Parallax",
  importPath: "@plasmicpkgs/react-scroll-parallax",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "img",
        src: "https://placekitten.com/300/200",
        style: {
          maxWidth: "100%",
        },
      },
    },
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
  defaultStyles: {
    maxWidth: "100%",
  },
};

export function registerParallaxWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customParallaxWrapperMeta?: ComponentMeta<ParallaxWrapperProps>
) {
  if (loader) {
    loader.registerComponent(
      ParallaxWrapper,
      customParallaxWrapperMeta ?? parallaxWrapperMeta
    );
  } else {
    registerComponent(
      ParallaxWrapper,
      customParallaxWrapperMeta ?? parallaxWrapperMeta
    );
  }
}
