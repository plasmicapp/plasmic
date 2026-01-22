import { PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { useContext } from "react";
import { Parallax, ParallaxContext } from "react-scroll-parallax";

export interface ParallaxWrapperProps {
  speed?: number;
  disabled?: boolean;
  previewInEditor?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function ParallaxWrapper({
  speed,
  disabled,
  previewInEditor,
  children,
  className,
}: ParallaxWrapperProps) {
  const inEditor = useContext(PlasmicCanvasContext);
  const hasContext = useContext(ParallaxContext) != null;
  const isServer = typeof window === "undefined";
  if (!hasContext && !isServer) {
    throw new Error(
      "Scroll Parallax can only be instantiated somewhere inside the Parallax Provider"
    );
  }
  return (
    <Parallax
      disabled={disabled || (inEditor && !previewInEditor)}
      speed={speed}
      className={className}
    >
      {children}
    </Parallax>
  );
}

/**
 * We're keeping the old registration without attachments to avoid confusion
 * due to the parallax custom behavior not working in old projects that didn't
 * make use of global contexts (so simply adding the custom behavior would
 * break it and it wouldn't be clear that the user should also add a
 * `ParallaxProvider`).
 */
export const deprecated_parallaxWrapperMeta: CodeComponentMeta<ParallaxWrapperProps> =
  {
    name: "hostless-scroll-parallax",
    displayName: "Scroll Parallax",
    importName: "ParallaxWrapper",
    importPath: "@plasmicpkgs/react-scroll-parallax",
    props: {
      children: {
        type: "slot",
        defaultValue: {
          type: "img",
          src: "https://placekitten.com/300/200",
          styles: {
            maxWidth: "100%",
          },
        },
      },
      speed: {
        type: "number",
        description:
          "How much to speed up or slow down this element while scrolling. Try -20 for slower, 20 for faster.",
        defaultValue: 20,
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

export function deprecated_registerParallaxWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customParallaxWrapperMeta?: CodeComponentMeta<ParallaxWrapperProps>
) {
  if (loader) {
    loader.registerComponent(
      ParallaxWrapper,
      customParallaxWrapperMeta ?? deprecated_parallaxWrapperMeta
    );
  } else {
    registerComponent(
      ParallaxWrapper,
      customParallaxWrapperMeta ?? deprecated_parallaxWrapperMeta
    );
  }
}

/**
 * The new registration is only setting `isAttachment: true`.
 */
export const parallaxWrapperMeta: CodeComponentMeta<ParallaxWrapperProps> = {
  ...deprecated_parallaxWrapperMeta,
  isAttachment: true,
};

export function registerParallaxWrapper(
  loader?: { registerComponent: typeof registerComponent },
  customParallaxWrapperMeta?: CodeComponentMeta<ParallaxWrapperProps>
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
