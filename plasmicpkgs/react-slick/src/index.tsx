import registerComponent, {
  ActionProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import composeRefs from "@seznam/compose-react-refs";
import { Button, Select } from "antd";
import React, { forwardRef, Ref, useEffect, useRef } from "react";
import Slider, { Settings } from "react-slick";

const { Option } = Select;

function CurrentSlideDropdown({ componentProps, studioOps }: ActionProps<any>) {
  const editingSlide = componentProps.editingSlide ?? 0;
  const slidesCnt =
    componentProps.children.length ??
    (componentProps.children.type === "img" ? 1 : 0);

  const options = Array.from({ length: slidesCnt }, (_, i) => i).map((i) => {
    return <Option value={i.toString()}>Slide {i + 1}</Option>;
  });

  const handleChange = (value: string) => {
    const slideIdx = Number(value);
    studioOps.updateProps({ editingSlide: slideIdx % slidesCnt });
  };

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        gap: "10px",
        justifyContent: "space-between",
      }}
    >
      <div>Current slide:</div>
      <Select
        defaultValue={editingSlide.toString()}
        style={{ width: "100%" }}
        onChange={handleChange}
        value={editingSlide.toString()}
      >
        {options}
      </Select>
    </div>
  );
}

function NavigateSlides({ componentProps, studioOps }: ActionProps<any>) {
  const slidesCnt = componentProps.children.length;
  const editingSlide = componentProps.editingSlide ?? 0;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        gap: "10px",
        justifyContent: "space-between",
      }}
    >
      <Button
        style={{ width: "100%" }}
        onClick={() => {
          const prevSlide = (editingSlide - 1 + slidesCnt) % slidesCnt;
          studioOps.updateProps({ editingSlide: prevSlide });
        }}
      >
        Prev slide
      </Button>
      <Button
        style={{ width: "100%" }}
        onClick={() => {
          const nextSlide = (editingSlide + 1) % slidesCnt;
          studioOps.updateProps({ editingSlide: nextSlide });
        }}
      >
        Next slide
      </Button>
    </div>
  );
}

function OutlineMessage() {
  return <div>* To re-arrange slides, use the Outline panel</div>;
}

export const sliderMeta: ComponentMeta<Settings> = {
  name: "hostless-slider",
  displayName: "Slider Carousel",
  importName: "Slider",
  importPath: "react-slick",
  description:
    "[See tutorial video](https://www.youtube.com/watch?v=GMgXLbNHX8c)",
  actions: [
    {
      type: "custom-action",
      control: CurrentSlideDropdown,
    },
    {
      type: "custom-action",
      control: NavigateSlides,
    },
    {
      type: "button-action",
      label: "Append new slide",
      onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
        const slidesCnt = componentProps.children.length;
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
        studioOps.updateProps({ editingSlide: slidesCnt });
      },
    },
    {
      type: "button-action",
      label: "Delete current slide",
      onClick: ({
        componentProps,
        contextData,
        studioOps,
      }: ActionProps<any>) => {
        const editingSlide = contextData.editingSlide ?? 0;
        studioOps.removeFromSlotAt(editingSlide, "children");
        const slidesCnt = componentProps.children.length - 1;
        studioOps.updateProps({
          editingSlide: (editingSlide - 1 + slidesCnt) % slidesCnt,
        });
      },
    },
    {
      type: "custom-action",
      control: OutlineMessage,
    },
  ],
  props: {
    children: {
      type: "slot",
      defaultValue: [0, 1, 2].map((i) => ({
        type: "vbox",
        children: {
          type: "img",
          src:
            "https://static1.plasmic.app/components/react-slick/slide" +
            (i + 1) +
            ".png",
          styles: {
            maxWidth: "100%",
          },
        },
      })),
    },
    editingSlide: {
      displayName: "Currently edited slide",
      type: "number",
      description:
        "Switch to the specified slide (first is 0). Only affects the editor, not the final page.",
      defaultValueHint: 0,
      editOnly: true,
      hidden: () => true,
    },
    accessibility: {
      advanced: true,
      displayName: "Accessibility",
      type: "boolean",
      description: "Enables tabbing and arrow key navigation",
      defaultValueHint: true,
    },
    adaptiveHeight: {
      advanced: true,
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
      advanced: true,
      displayName: "Draggable",
      type: "boolean",
      description: "Enables mouse dragging on desktop",
      defaultValueHint: true,
    },
    easing: {
      advanced: true,
      displayName: "Easing",
      type: "string",
      description: "Easing method for transition",
      defaultValueHint: "linear",
    },
    fade: {
      advanced: true,
      displayName: "Fade",
      type: "boolean",
      description: "Cross-fade between slides",
      defaultValueHint: false,
    },
    focusOnSelect: {
      advanced: true,
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
      description: "Index of initial slide (first is 0)",
      defaultValueHint: 0,
    },
    lazyLoad: {
      advanced: true,
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
      advanced: true,
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
      advanced: true,
      displayName: "Slides To Scroll",
      type: "number",
      description: "Number of slides to scroll at once",
      defaultValueHint: 1,
    },
    slidesToShow: {
      advanced: true,
      displayName: "Slides To Show",
      type: "number",
      description: "Number of slides to show in one frame",
      defaultValueHint: 1,
    },
    speed: {
      advanced: true,
      displayName: "Speed",
      type: "number",
      description: "Transition speed in milliseconds",
      defaultValueHint: 500,
    },
    swipe: {
      advanced: true,
      displayName: "Swipe",
      type: "boolean",
      description: "Enable swiping to change slides",
      defaultValueHint: true,
    },
    swipeToSlide: {
      advanced: true,
      displayName: "Swipe To Slide",
      type: "boolean",
      description: "Enable drag/swipe irrespective of 'slidesToScroll'",
      defaultValueHint: false,
    },
    touchMove: {
      advanced: true,
      displayName: "Touch Move",
      type: "boolean",
      description: "Enable slide moving on touch",
      defaultValueHint: true,
    },
    touchThreshold: {
      advanced: true,
      displayName: "Touch Threshold",
      type: "number",
      description: "Swipe distance threshold in pixels",
      defaultValueHint: 5,
    },
    useCSS: {
      advanced: true,
      displayName: "Use CSS",
      type: "boolean",
      description: "Enable/Disable CSS Transitions",
      defaultValueHint: true,
    },
    useTransform: {
      advanced: true,
      displayName: "Use Transform",
      type: "boolean",
      description: "Enable/Disable CSS Transforms",
      defaultValueHint: true,
    },
    variableWidth: {
      advanced: true,
      displayName: "Variable Width",
      type: "boolean",
      description: "Variable width slides",
      defaultValueHint: false,
    },
    vertical: {
      advanced: true,
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
