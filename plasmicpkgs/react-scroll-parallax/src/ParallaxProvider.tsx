import registerComponent, {
  CodeComponentMeta,
} from "@plasmicapp/host/registerComponent";
import registerGlobalContext, {
  GlobalContextMeta,
} from "@plasmicapp/host/registerGlobalContext";
import React, { useEffect, useRef } from "react";
import { ParallaxProvider, useController } from "react-scroll-parallax";
import { ParallaxProviderProps } from "react-scroll-parallax/dist/components/ParallaxProvider/types";
import ResizeObserver from "resize-observer-polyfill";

/**
 * A safe wrapper around `useController()` to prevent errors when
 * `ParallaxProvider` is missing. If the context is unavailable,
 * `useController()` will throw an error, which we catch and handle
 * gracefully by returning `null` instead of crashing the component.
 */
function useSafeController() {
  try {
    return useController();
  } catch {
    return null; // Return null instead of throwing an error
  }
}

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
  const parallaxController = useSafeController();
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

/**
 * @deprecated use `globalParallaxProviderMeta` instead.
 */
export const parallaxProviderMeta: CodeComponentMeta<ParallaxProviderProps> = {
  name: "hostless-parallax-provider",
  displayName: "Parallax Provider",
  importName: "ParallaxProviderWrapper",
  importPath: "@plasmicpkgs/react-scroll-parallax",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "vbox",
        children: [
          {
            type: "text",
            value:
              "Wrap any element in a Scroll Parallax component. Ensure they're all inside this Parallax Provider. Example:",
            styles: {
              marginBottom: "20px",
            },
          },
          {
            type: "component",
            name: "hostless-scroll-parallax",
          },
        ],
      },
    },
    scrollAxis: {
      type: "choice",
      description: "Scroll axis for setting horizontal/vertical scrolling",
      options: ["vertical", "horizontal"],
      displayName: "Scroll Axis",
    },
  },
};

/**
 * @deprecated use `registerGlobalParallaxProvider` instead.
 */
export function registerParallaxProvider(
  loader?: { registerComponent: typeof registerComponent },
  customParallaxProviderMeta?: CodeComponentMeta<ParallaxProviderProps>
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

export const globalParallaxProviderMeta: GlobalContextMeta<ParallaxProviderProps> =
  {
    name: "global-parallax-provider",
    displayName: "Parallax Provider",
    importName: "ParallaxProviderWrapper",
    importPath: "@plasmicpkgs/react-scroll-parallax",
    props: {
      scrollAxis: {
        type: "choice",
        description: "Scroll axis for setting horizontal/vertical scrolling",
        options: ["vertical", "horizontal"],
        displayName: "Scroll Axis",
      },
    },
  };

export function registerGlobalParallaxProvider(
  loader?: { registerGlobalContext: typeof registerGlobalContext },
  customParallaxProviderMeta?: GlobalContextMeta<ParallaxProviderProps>
) {
  if (loader) {
    loader.registerGlobalContext(
      ParallaxProviderWrapper,
      customParallaxProviderMeta ?? globalParallaxProviderMeta
    );
  } else {
    registerGlobalContext(
      ParallaxProviderWrapper,
      customParallaxProviderMeta ?? globalParallaxProviderMeta
    );
  }
}
