import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import composeRefs from "@seznam/compose-react-refs";
import React, { forwardRef, Ref, useEffect, useRef } from "react";
import Slider, { Settings } from "react-slick";

export const sliderMeta: ComponentMeta<Settings> = {
  name: "hostless-slider",
  displayName: "Slider",
  importName: "Slider",
  importPath: "react-slick",
  actions: [
    {
      type: "button-action",
      label: "Append new slide",
      onClick: ({ studioOps }) => {
        studioOps.appendToSlot(
          {
            type: "img",
            src: "",
            styles: {
              maxWidth: "100%",
            },
          },
          "children"
        );
      },
    },
    {
      type: "button-action",
      label: "Delete current slide",
      onClick: ({ contextData, studioOps }) =>
        studioOps.removeFromSlotAt(contextData.editingSlide ?? 0, "children"),
    },
  ],
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "img",
          src: "https://via.placeholder.com/150x90/FF0000/FFFFFF/?text=Slide_1",
          styles: {
            maxWidth: "100%",
          },
        },
        {
          type: "img",
          src: "https://via.placeholder.com/150x90/00FF00/FFFFFF/?text=Slide_2",
          styles: {
            maxWidth: "100%",
          },
        },
        {
          type: "img",
          src: "https://via.placeholder.com/150x90/0000FF/FFFFFF/?text=Slide_3",
          styles: {
            maxWidth: "100%",
          },
        },
      ],
    },
    editingSlide: {
      displayName: "Currently edited slide",
      type: "number",
      description:
        "Switch to the specified slide (first is 0). Only affects the editor, not the final page.",
      defaultValueHint: 0,
      editOnly: true,
    },
    // TODO Ideally, we are not showing any labels on these buttons, and we can place them in the same row.
    // insertSlide: {
    //   displayName: "",
    //   type: "custom",
    //   description: "Insert a new slide right after the current slide.",
    //   control: MyReactComponent,
    // },
    // deleteSlide: {
    //   displayName: "",
    //   type: "custom",
    //   description: "Delete the current slide.",
    //   control: MyReactComponent,
    // },
    accessibility: {
      displayName: "Accessibility",
      type: "boolean",
      description: "Enables tabbing and arrow key navigation",
      defaultValueHint: true,
    },
    adaptiveHeight: {
      displayName: "Adaptive Height",
      type: "boolean",
      description: "Adjust the slide's height automatically",
      defaultValueHint: false,
    },
    arrows: {
      displayName: "Arrows",
      type: "boolean",
      description: "Show next/prev arrows",
      defaultValueHint: true,
    },
    autoplay: {
      displayName: "Auto Play",
      type: "boolean",
      description: "Automatically start scrolling",
      defaultValueHint: false,
    },
    autoplaySpeed: {
      displayName: "Auto Play Speed",
      type: "number",
      description: "Delay between each auto scroll, in milliseconds",
      defaultValueHint: 3000,
      hidden: (props) => !props.autoplay,
    },
    centerMode: {
      displayName: "Center Mode",
      type: "boolean",
      description:
        "Enables centered view with partial prev/next slides. Use with odd numbered slidesToShow counts",
      defaultValueHint: false,
    },
    centerPadding: {
      displayName: "Center Padding",
      type: "string",
      description: "Side padding when in center mode (px or %)",
      defaultValueHint: "50px",
      hidden: (props) => !props.centerMode,
    },
    dots: {
      displayName: "Dots",
      type: "boolean",
      description: "Show dots for each slide",
      defaultValueHint: false,
    },
    draggable: {
      displayName: "Draggable",
      type: "boolean",
      description: "Enables mouse dragging on desktop",
      defaultValueHint: true,
    },
    easing: {
      displayName: "Easing",
      type: "string",
      description: "Easing method for transition",
      defaultValueHint: "linear",
    },
    fade: {
      displayName: "Fade",
      type: "boolean",
      description: "Cross-fade between slides",
      defaultValueHint: false,
    },
    focusOnSelect: {
      displayName: "Focus On Select",
      type: "boolean",
      description: "Go to slide on click",
      defaultValueHint: false,
    },
    infinite: {
      displayName: "Infinite",
      type: "boolean",
      description: "Infinitely wrap around contents",
      defaultValueHint: true,
    },
    initialSlide: {
      displayName: "Initial Slide",
      type: "number",
      description: "Index of initial slide",
      defaultValueHint: 0,
    },
    lazyLoad: {
      displayName: "Lazy Load",
      type: "choice",
      options: ["ondemand", "progressive"],
      description:
        "Load images or render components on demand or progressively",
    },
    pauseOnDotsHover: {
      displayName: "Pause On Dots Hover",
      type: "boolean",
      description: "Prevents autoplay while hovering on dots",
      defaultValueHint: false,
    },
    pauseOnFocus: {
      displayName: "Pause On Focus",
      type: "boolean",
      description: "Prevents autoplay while focused on slides",
      defaultValueHint: false,
    },
    pauseOnHover: {
      displayName: "Pause On Hover",
      type: "boolean",
      description: "Prevents autoplay while hovering on track",
      defaultValueHint: true,
    },
    rows: {
      displayName: "Rows",
      type: "number",
      description: "Number of rows per slide (enables grid mode)",
      defaultValueHint: 1,
    },
    rtl: {
      displayName: "Reverse",
      type: "boolean",
      description: "Reverses the slide order",
      defaultValueHint: false,
    },
    // Looks like the `slide` prop is not being used to set the container tag:
    // https://github.com/akiran/react-slick/issues/1318
    // https://github.com/akiran/react-slick/pull/1885
    // https://stackoverflow.com/questions/51492535/wrap-react-slick-li-slides-inside-ul
    //
    // slide: {
    //   displayName: "Slide Tag",
    //   type: "string",
    //   description: 'Slide container element type',
    //   defaultValueHint: "div",
    // },
    slidesPerRow: {
      displayName: "Slides Per Row",
      type: "number",
      description:
        "Number of slides to display in grid mode, this is useful with rows option",
      defaultValueHint: 1,
    },
    slidesToScroll: {
      displayName: "Slides To Scroll",
      type: "number",
      description: "Number of slides to scroll at once",
      defaultValueHint: 1,
    },
    slidesToShow: {
      displayName: "Slides To Show",
      type: "number",
      description: "Number of slides to show in one frame",
      defaultValueHint: 1,
    },
    speed: {
      displayName: "Speed",
      type: "number",
      description: "Transition speed in milliseconds",
      defaultValueHint: 500,
    },
    swipe: {
      displayName: "Swipe",
      type: "boolean",
      description: "Enable swiping to change slides",
      defaultValueHint: true,
    },
    swipeToSlide: {
      displayName: "Swipe To Slide",
      type: "boolean",
      description: "Enable drag/swipe irrespective of 'slidesToScroll'",
      defaultValueHint: false,
    },
    touchMove: {
      displayName: "Touch Move",
      type: "boolean",
      description: "Enable slide moving on touch",
      defaultValueHint: true,
    },
    touchThreshold: {
      displayName: "Touch Threshold",
      type: "number",
      description: "Swipe distance threshold in pixels",
      defaultValueHint: 5,
    },
    useCSS: {
      displayName: "Use CSS",
      type: "boolean",
      description: "Enable/Disable CSS Transitions",
      defaultValueHint: true,
    },
    useTransform: {
      displayName: "Use Transform",
      type: "boolean",
      description: "Enable/Disable CSS Transforms",
      defaultValueHint: true,
    },
    variableWidth: {
      displayName: "Variable Width",
      type: "boolean",
      description: "Variable width slides",
      defaultValueHint: false,
    },
    vertical: {
      displayName: "Vertical",
      type: "boolean",
      description: "Vertical slide mode",
      defaultValueHint: false,
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    width: "stretch",
    maxWidth: "100%",
    flexDirection: "column",
  },
};

export const SliderWrapper = forwardRef(function SliderWrapper_(
  {
    editingSlide,
    setControlContextData,
    ...props
  }: Settings & {
    editingSlide?: number;
    setControlContextData?: (data: {
      editingSlide: number | undefined;
    }) => void;
  },
  userRef?: Ref<Slider>
) {
  setControlContextData?.({ editingSlide: editingSlide });
  const slider = useRef<Slider>(null);
  useEffect(() => {
    if (editingSlide !== undefined) {
      slider.current!.slickGoTo(editingSlide);
    }
  }, [editingSlide]);
  return <Slider ref={composeRefs(slider, userRef)} {...props} />;
});

export function registerSlider(
  loader?: { registerComponent: typeof registerComponent },
  customSliderMeta?: ComponentMeta<Settings>
) {
  if (loader) {
    loader.registerComponent(SliderWrapper, customSliderMeta ?? sliderMeta);
  } else {
    registerComponent(SliderWrapper, customSliderMeta ?? sliderMeta);
  }
}
