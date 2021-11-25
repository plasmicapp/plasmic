import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import Slider, { Settings } from "react-slick";

export const sliderMeta: ComponentMeta<Settings> = {
  name: "Slider",
  importPath: "react-slick",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "img",
          src: "https://via.placeholder.com/350x150",
          style: {
            maxWidth: "100%",
          },
        },
        {
          type: "img",
          src: "https://via.placeholder.com/350x150",
          style: {
            maxWidth: "100%",
          },
        },
        {
          type: "img",
          src: "https://via.placeholder.com/350x150",
          style: {
            maxWidth: "100%",
          },
        },
      ],
    },
    accessibility: {
      type: "boolean",
      description: "Enables tabbing and arrow key navigation (default: true)",
    },
    adaptiveHeight: {
      type: "boolean",
      description: "Adjust the slide's height automatically (default: false)",
    },
    arrows: {
      type: "boolean",
      description: "Show next/prev arrows (default: true)",
    },
    autoplay: {
      type: "boolean",
    },
    autoplaySpeed: {
      type: "number",
      description:
        "Delay between each auto scroll, in milliseconds (default: 3000)",
    },
    centerMode: {
      type: "boolean",
      description:
        "Enables centered view with partial prev/next slides. Use with odd numbered slidesToShow counts (default: false)",
    },
    centerPadding: {
      type: "string",
      description: "Side padding when in center mode (px or %)",
    },
    dots: {
      type: "boolean",
      description: "Show dots for each slide",
    },
    draggable: {
      type: "boolean",
      description: "Enables mouse dragging on desktop (default: true)",
    },
    easing: {
      type: "string",
      description: "Easing method for transition",
    },
    fade: {
      type: "boolean",
      description: "Cross-fade between slides",
    },
    focusOnSelect: {
      type: "boolean",
      description: "Go to slide on click",
    },
    infinite: {
      type: "boolean",
      defaultValue: true,
      description: "Infinitely wrap around contents",
    },
    initialSlide: {
      type: "number",
      description: "Index of initial slide",
    },
    lazyLoad: {
      type: "choice",
      options: ["ondemand", "progressive"],
      description:
        "Load images or render components on demand or progressively",
    },
    pauseOnDotsHover: {
      type: "boolean",
      description: "Prevents autoplay while hovering on dots",
    },
    pauseOnFocus: {
      type: "boolean",
      description: "Prevents autoplay while focused on slides",
    },
    pauseOnHover: {
      type: "boolean",
      description: "Prevents autoplay while hovering on track",
    },
    rows: {
      type: "number",
      description: "Number of rows per slide (enables grid mode)",
    },
    rtl: {
      type: "boolean",
      description: "Reverses the slide order",
    },
    slide: {
      type: "string",
      description: 'Slide container element type (defaults to "div")',
    },
    slidesPerRow: {
      type: "number",
      description:
        "Number of slides to display in grid mode, this is useful with rows option",
    },
    slidesToScroll: {
      type: "number",
      description: "Number of slides to scroll at once",
    },
    slidesToShow: {
      type: "number",
      description: "Number of slides to show in one frame",
    },
    speed: {
      type: "number",
      description: "Transition speed in milliseconds (defaults to 500)",
    },
    swipe: {
      type: "boolean",
      description: "Enable swiping to change slides",
    },
    swipeToSlide: {
      type: "boolean",
      description: "Enable drag/swipe irrespective of 'slidesToScroll'",
    },
    touchMove: {
      type: "boolean",
      description: "Enable slide moving on touch",
    },
    touchThreshold: {
      type: "number",
      defaultValue: 5,
      description: "Swipe distance threshold in pixels",
    },
    useCSS: {
      type: "boolean",
      description: "Enable/Disable CSS Transitions",
    },
    useTransform: {
      type: "boolean",
      description: "Enable/Disable CSS Transforms",
    },
    variableWidth: {
      type: "boolean",
      description: "Variable width slides",
    },
    vertical: {
      type: "boolean",
      description: "Vertical slide mode",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    width: "stretch",
    maxWidth: "100%",
  },
};

export function registerSlider(
  loader?: { registerComponent: typeof registerComponent },
  customSliderMeta?: ComponentMeta<Settings>
) {
  if (loader) {
    loader.registerComponent(Slider, customSliderMeta ?? sliderMeta);
  } else {
    registerComponent(Slider, customSliderMeta ?? sliderMeta);
  }
}
