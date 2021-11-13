import registerComponent from "@plasmicapp/host/registerComponent";
import Slider from "react-slick";

// TODO Do not actually provide defaultValues everywhere.

registerComponent(Slider, {
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
      defaultValue: true,
      description: "Enables tabbing and arrow key navigation",
    },
    adaptiveHeight: {
      type: "boolean",
      defaultValue: false,
      description: "Adjust the slide's height automatically",
    },
    arrows: {
      type: "boolean",
      defaultValue: true,
      description: "Show next/prev arrows",
    },
    autoplay: {
      type: "boolean",
      defaultValue: false,
    },
    autoplaySpeed: {
      type: "number",
      defaultValue: 3000,
      description: "Delay between each auto scroll (in milliseconds)",
    },
    centerMode: {
      type: "boolean",
      defaultValue: false,
      description:
        "Enables centered view with partial prev/next slides. Use with odd numbered slidesToShow counts",
    },
    centerPadding: {
      type: "string",
      defaultValue: "50px",
      description: "Side padding when in center mode (px or %)",
    },
    dots: {
      type: "boolean",
      defaultValue: false,
      description: "Show dots for each slide",
    },
    draggable: {
      type: "boolean",
      defaultValue: true,
      description: "Enables mouse dragging on desktop",
    },
    easing: {
      type: "string",
      defaultValue: "linear",
      description: "Easing method for transition",
    },
    fade: {
      type: "boolean",
      defaultValue: false,
      description: "Cross-fade between slides",
    },
    focusOnSelect: {
      type: "boolean",
      defaultValue: false,
      description: "Go to slide on click",
    },
    infinite: {
      type: "boolean",
      defaultValue: true,
      description: "Infinitely wrap around contents",
    },
    initialSlide: {
      type: "number",
      defaultValue: 0,
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
      defaultValue: false,
      description: "Prevents autoplay while hovering on dots",
    },
    pauseOnFocus: {
      type: "boolean",
      defaultValue: true,
      description: "Prevents autoplay while focused on slides",
    },
    pauseOnHover: {
      type: "boolean",
      defaultValue: true,
      description: "Prevents autoplay while hovering on track",
    },
    rows: {
      type: "number",
      defaultValue: 1,
      description: "Number of rows per slide (enables grid mode)",
    },
    rtl: {
      type: "boolean",
      defaultValue: false,
      description: "Reverses the slide order",
    },
    slide: {
      type: "string",
      defaultValue: "div",
      description: "Slide container element type",
    },
    slidesPerRow: {
      type: "number",
      defaultValue: 1,
      description:
        "Number of slides to display in grid mode, this is useful with rows option",
    },
    slidesToScroll: {
      type: "number",
      defaultValue: 1,
      description: "Number of slides to scroll at once",
    },
    slidesToShow: {
      type: "number",
      defaultValue: 1,
      description: "Number of slides to show in one frame",
    },
    speed: {
      type: "number",
      defaultValue: 500,
      description: "Transition speed in milliseconds",
    },
    swipe: {
      type: "boolean",
      defaultValue: true,
      description: "Enable swiping to change slides",
    },
    swipeToSlide: {
      type: "boolean",
      defaultValue: false,
      description: "Enable drag/swipe irrespective of 'slidesToScroll'",
    },
    touchMove: {
      type: "boolean",
      defaultValue: true,
      description: "Enable slide moving on touch",
    },
    touchThreshold: {
      type: "number",
      defaultValue: 5,
      description: "Swipe distance threshold in pixels",
    },
    useCSS: {
      type: "boolean",
      defaultValue: true,
      description: "Enable/Disable CSS Transitions",
    },
    useTransform: {
      type: "boolean",
      defaultValue: true,
      description: "Enable/Disable CSS Transforms",
    },
    variableWidth: {
      type: "boolean",
      defaultValue: false,
      description: "Variable width slides",
    },
    vertical: {
      type: "boolean",
      defaultValue: false,
      description: "Vertical slide mode",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    width: "stretch",
    maxWidth: "100%",
  },
});
