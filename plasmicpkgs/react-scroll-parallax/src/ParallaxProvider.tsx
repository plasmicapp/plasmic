import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { useEffect } from "react";
import { ParallaxProvider, useController } from "react-scroll-parallax";
import { ParallaxProviderProps } from "react-scroll-parallax/dist/components/ParallaxProvider/types";

/**
 * This is required to ensure the parallax scrolling works correctly, since if
 * (for instance) images load after the parallax wrapper has calculated the
 * dimensions of the space, it will result in incorrect parallax scrolling
 * amounts.
 *
 * This is not great since we need to mutation-observe the whole section of the
 * document (which may be large), but we can probably optimize this in the
 * future.
 */
function ParallaxCacheUpdate() {
  const parallaxController = useController();

  useEffect(() => {
    const targetNode = document.body;
    const observer = new ResizeObserver(() => {
      if (parallaxController) {
        parallaxController.update();
      }
    });
    observer.observe(targetNode);
  });

  return null;
}

export function ParallaxProviderWrapper(props: React.PropsWithChildren<{}>) {
  return (
    <ParallaxProvider {...props}>
      <ParallaxCacheUpdate />
      {props.children}
    </ParallaxProvider>
  );
}

export const parallaxProviderMeta: ComponentMeta<ParallaxProviderProps> = {
  name: "hostless-parallax-provider",
  displayName: "Parallax Provider",
  importName: "ParallaxProviderWrapper",
  importPath: "@plasmicpkgs/react-scroll-parallax",
  props: {
    children: "slot",
    scrollAxis: {
      type: "choice",
      description: "Scroll axis for setting horizontal/vertical scrolling",
      options: ["vertical", "horizontal"],
      displayName: "Scroll Axis",
    },
  },
};

export function registerParallaxProvider(
  loader?: { registerComponent: typeof registerComponent },
  customParallaxProviderMeta?: ComponentMeta<ParallaxProviderProps>
) {
  if (loader) {
    loader.registerComponent(
      ParallaxProvider,
      customParallaxProviderMeta ?? parallaxProviderMeta
    );
  } else {
    registerComponent(
      ParallaxProvider,
      customParallaxProviderMeta ?? parallaxProviderMeta
    );
  }
}
