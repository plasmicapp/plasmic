import { registerSlider } from "@plasmicpkgs/react-slick";
import "slick-carousel/slick/slick.css";
// react-slick requires global CSS:
// import "slick-carousel/slick/slick-theme.css";
import "./slick-carousel-theme.css";

export function register() {
  registerSlider();
}

register();
