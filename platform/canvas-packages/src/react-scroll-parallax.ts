import {
  deprecated_registerParallaxWrapper,
  registerParallaxProvider,
} from "@plasmicpkgs/react-scroll-parallax";
export function register() {
  registerParallaxProvider();
  deprecated_registerParallaxWrapper();
}

register();
