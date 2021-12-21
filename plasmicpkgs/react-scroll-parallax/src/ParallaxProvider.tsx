import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { ParallaxProvider, ParallaxProviderProps } from "react-scroll-parallax";

export const parallaxProviderMeta: ComponentMeta<ParallaxProviderProps> = {
  name: "hostless-parallax-provider",
  displayName: "Parallax Provider",
  importName: "ParallaxProvider",
  importPath: "react-scroll-parallax",
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
