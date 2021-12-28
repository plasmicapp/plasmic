import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import React, { useEffect, useRef } from "react";
import { ParallaxProvider, useController } from "react-scroll-parallax";
import { ParallaxProviderProps } from "react-scroll-parallax/dist/components/ParallaxProvider/types";
import ResizeObserver from "resize-observer-polyfill";

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
function ParallaxCacheUpdate({ children }: React.PropsWithChildren<{}>) {
  const parallaxController = useController();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current?.parentElement) {
      const targetNode = ref.current.parentElement;
      const observer = new ResizeObserver(() => {
        if (parallaxController) {
          parallaxController.update();
        }
      });
      observer.observe(targetNode);
      return () => {
        observer.disconnect();
      };
    }
    return () => {};
  }, [ref.current]);

  return (
    <div style={{ display: "contents" }} ref={ref}>
      {children}
    </div>
  );
}

export function ParallaxProviderWrapper({
  children,
  ...props
}: React.PropsWithChildren<ParallaxProviderProps>) {
  return (
    <ParallaxProvider {...props}>
      <ParallaxCacheUpdate>{children}</ParallaxCacheUpdate>
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
      ParallaxProviderWrapper,
      customParallaxProviderMeta ?? parallaxProviderMeta
    );
  } else {
    registerComponent(
      ParallaxProviderWrapper,
      customParallaxProviderMeta ?? parallaxProviderMeta
    );
  }
}
