import { ComponentMeta } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import Lottie from "lottie-react";
import React from "react";

export interface LottieWrapperProps {
  className?: string;
  animationData?: {};
  loop?: boolean;
  autoplay?: boolean;
  preview?: boolean;
}

export function LottieWrapper({
  className,
  animationData,
  loop,
  autoplay,
  preview = false,
}: LottieWrapperProps) {
  if (!animationData) {
    throw new Error("animationData is required");
  }
  return (
    <Lottie
      className={className}
      animationData={animationData}
      loop={loop}
      autoplay={autoplay || preview}
    />
  );
}

export const lottieWrapper: ComponentMeta<LottieWrapperProps> = {
  name: "hostless-lottie-react",
  displayName: "Lottie",
  importName: "LottieWrapper",
  importPath: "@plasmicpkgs/lottie-react",
  props: {
    animationData: {
      type: "object",
      description: "The animation JSON data",
    },
    loop: {
      type: "boolean",
      description: "Whether to loop the animation",
      defaultValueHint: true,
    },
    autoplay: {
      type: "boolean",
      description: "Whether to autoplay the animation",
      defaultValueHint: true,
    },
    preview: {
      type: "boolean",
      description: "Whether to preview the animation in the editor",
      defaultValueHint: false,
    },
  },
};

export function registerNavContainer(
  loader?: { registerComponent: typeof registerComponent },
  customNavContainer?: ComponentMeta<LottieWrapperProps>
) {
  if (loader) {
    loader.registerComponent(
      LottieWrapper,
      customNavContainer ?? lottieWrapper
    );
  } else {
    registerComponent(LottieWrapper, customNavContainer ?? lottieWrapper);
  }
}
