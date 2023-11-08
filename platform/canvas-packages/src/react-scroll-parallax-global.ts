import {
  registerGlobalParallaxProvider,
  registerParallaxWrapper,
} from "@plasmicpkgs/react-scroll-parallax";
export function register() {
  registerGlobalParallaxProvider();
  registerParallaxWrapper();
}

register();
