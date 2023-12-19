import { usePlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent, {
  ActionProps,
  ComponentHelpers,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Button } from "antd";
import React, {
  ChangeEvent,
  forwardRef,
  Ref,
  useEffect,
  useRef,
  useState,
} from "react";
import Slider, { Settings } from "react-slick";

type SliderProps = Settings & {
  arrowColor?: string;
  sliderScopeClassName: string;
};

export const sliderHelpers: ComponentHelpers<SliderProps> = {
  states: {
    currentSlide: {
      onChangeArgsToValue: (_: number, newIndex: number) => newIndex,
      onMutate: (stateValue, $ref) => {
        $ref.slickGoTo(stateValue);
      },
    },
  },
};

function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export type SliderMethods = Pick<
  Slider,
  "slickGoTo" | "slickNext" | "slickPause" | "slickPlay" | "slickPrev"
>;

export const SliderWrapper = forwardRef(function SliderWrapper_(
  props: SliderProps,
  userRef?: Ref<SliderMethods>
) {
  const {
    initialSlide,
    arrowColor,
    className,
    sliderScopeClassName,
    autoplay,
    ...rest
  } = props;
  // "data-plasmic-canvas-envs" prop only exists in studio canvas
  const inCanvas = !!usePlasmicCanvasContext();
  const slider = useRef<Slider>(null);
  const debouncedInitialSlide = useDebounce(initialSlide);

  useEffect(() => {
    if (debouncedInitialSlide !== undefined) {
      slider.current?.slickGoTo(debouncedInitialSlide);
    }
  }, [debouncedInitialSlide, inCanvas]);

  React.useImperativeHandle(
    userRef,
    () => ({
      slickGoTo(index, dontAnimate) {
        if (slider.current) {
          const { slickGoTo } = slider.current;
          slickGoTo(index, dontAnimate);
        }
      },
      slickNext() {
        if (slider.current) {
          const { slickNext } = slider.current;
          slickNext();
        }
      },
      slickPause() {
        if (slider.current) {
          const { slickPause } = slider.current;
          slickPause();
        }
      },
      slickPlay() {
        if (slider.current) {
          const { slickPlay } = slider.current;
          slickPlay();
        }
      },
      slickPrev() {
        if (slider.current) {
          const { slickPrev } = slider.current;
          slickPrev();
        }
      },
    }),
    []
  );

  const css = `
    .${sliderScopeClassName} .slick-arrow:before {
      color: ${arrowColor ?? "black"};
    }
    .${sliderScopeClassName} .slick-slide img:only-child,
    .${sliderScopeClassName} .slick-slide .__wab_img-wrapper:only-child {
      ${
        /* NOTE: this is otherwise explicitly set to "block" by react-slick  (which should also fix this issue but somehow doesn't.).  */ ""
      }
      ${
        /* This style override is added to fix a well-known issue with images inside divs. https://stackoverflow.com/questions/5804256/image-inside-div-has-extra-space-below-the-image  */ ""
      }
      display: inline-block;
      vertical-align: top;
    }
  `;

  return (
    <>
      <Slider
        className={`${className} ${sliderScopeClassName}`}
        ref={slider}
        // We don't want to turn on autoplay while editing in canvas, because this
        // leads to a state update for current slide, which ends up re-rendering
        // the entire artboard.
        autoplay={autoplay && !inCanvas ? autoplay : undefined}
        {...rest}
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
});

export function registerSlider(loader?: {
  registerComponent: typeof registerComponent;
}) {
  function getSlideInfo({
    rows = 1,
    slidesPerRow = 1,
    initialSlide = 0,
    children,
  }: SliderProps) {
    const slidesCnt = Array.isArray(children) ? children.length : 1;

    const slidesPerDot = rows * slidesPerRow;
    const dotCount = Math.ceil(slidesCnt / slidesPerDot);
    const currentDotIndex =
      initialSlide >= dotCount ? dotCount - 1 : initialSlide;

    return {
      currentDotIndex,
      slidesPerDot,
      dotCount,
      totalSlides: slidesCnt,
    };
  }

  function CurrentSlideDropdown({
    componentProps,
    studioOps,
  }: ActionProps<any>) {
    const { dotCount, currentDotIndex } = getSlideInfo(componentProps);

    const options = Array.from({ length: dotCount }, (_, i) => i).map((i) => {
      return (
        <option key={i} value={i.toString()}>
          Slide {i}
        </option>
      );
    });

    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
      studioOps.updateStates({ currentSlide: Number(e.target.value) });
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
        <select
          defaultValue={currentDotIndex.toString()}
          style={{ width: "100%" }}
          onChange={handleChange}
          value={currentDotIndex.toString()}
        >
          {options}
        </select>
      </div>
    );
  }

  function NavigateSlides({ componentProps, studioOps }: ActionProps<any>) {
    const { dotCount, currentDotIndex } = getSlideInfo(componentProps);

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
            const prevSlide =
              currentDotIndex === 0
                ? dotCount - 1
                : (currentDotIndex - 1) % dotCount;
            studioOps.updateStates({ currentSlide: prevSlide });
          }}
        >
          Prev slide
        </Button>
        <Button
          style={{ width: "100%" }}
          onClick={() => {
            const nextSlide = (currentDotIndex + 1) % dotCount;
            studioOps.updateStates({ currentSlide: nextSlide });
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
  const sliderMeta: ComponentMeta<SliderProps> = {
    name: "hostless-slider",
    displayName: "Slider Carousel",
    importName: "SliderWrapper",
    importPath: "@plasmicpkgs/react-slick",
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
          const { dotCount, slidesPerDot, totalSlides } =
            getSlideInfo(componentProps);
          const currentSlide =
            totalSlides % slidesPerDot ? dotCount - 1 : dotCount;
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
          studioOps.updateStates({ currentSlide });
        },
      },
      {
        type: "button-action",
        label: "Delete current slide",
        hidden: (ps) =>
          (ps.children as any)?.type?.name === "CanvasSlotPlaceholder",
        onClick: ({ componentProps, studioOps }: ActionProps<any>) => {
          const { currentDotIndex, dotCount, slidesPerDot, totalSlides } =
            getSlideInfo(componentProps);
          studioOps.removeFromSlotAt(
            currentDotIndex * slidesPerDot,
            "children"
          );
          let newPos = currentDotIndex;
          if (dotCount === 1) {
            // not the only dot
            newPos = 0;
          } else if (currentDotIndex !== dotCount - 1) {
            // not the last dot
            if (slidesPerDot === 1) {
              newPos = currentDotIndex - 1;
            } else {
              newPos = currentDotIndex;
            }
          } else {
            // the last dot
            newPos =
              totalSlides % slidesPerDot === 1
                ? currentDotIndex - 1
                : currentDotIndex;
          }
          studioOps.updateStates({
            currentSlide: newPos,
          });
        },
      },
      {
        type: "custom-action",
        control: OutlineMessage,
      },
    ],
    refActions: {
      slickGoTo: {
        displayName: "Jump to slide",
        argTypes: [
          {
            name: "index",
            displayName: "Slide index",
            type: "number",
          },
          {
            name: "dontAnimate",
            displayName: "Animate?",
            type: "boolean",
          },
        ],
      },
      slickNext: {
        displayName: "Go to Next slide",
        argTypes: [],
      },
      slickPause: {
        displayName: "Pause",
        argTypes: [],
      },
      slickPlay: {
        displayName: "Play",
        argTypes: [],
      },
      slickPrev: {
        displayName: "Go to Previous slide",
        argTypes: [],
      },
    },
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
      sliderScopeClassName: {
        type: "styleScopeClass",
        scopeName: "slider",
      } as any,
      arrowColor: {
        type: "color",
        description: "Color of next/prev arrow buttons",
        defaultValueHint: "#000000",
        hidden: (ps) => (ps.arrows === undefined ? false : !ps.arrows),
      },
      autoplay: {
        displayName: "Auto Play",
        type: "boolean",
        description:
          "Automatically start scrolling; does not take effect while in the editor, but you can see it in live preview.",
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
      cssEase: {
        advanced: true,
        displayName: "Easing",
        type: "string",
        description: "Easing method for transition",
        defaultValueHint: "linear",
      },
      /** Deprecated, this was apparently never working:
       * https://github.com/akiran/react-slick/issues/363 */
      easing: {
        hidden: () => true,
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
        description:
          "Index of the first visible slide (first is 0), accounting for multiple slides per view if applicable.",
        defaultValueHint: 0,
        defaultValue: 0,
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
      beforeChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "currentSlide", type: "number" }],
      },
    },
    states: {
      currentSlide: {
        type: "writable",
        valueProp: "initialSlide",
        onChangeProp: "beforeChange",
        variableType: "number",
        ...sliderHelpers.states.currentSlide,
      },
    },
    componentHelpers: {
      helpers: sliderHelpers,
      importName: "sliderHelpers",
      importPath: "@plasmicpkgs/react-slick",
    },
    defaultStyles: {
      width: "stretch",
      maxWidth: "100%",
      flexDirection: "column",
    },
  };
  if (loader) {
    loader.registerComponent(SliderWrapper, sliderMeta);
  } else {
    registerComponent(SliderWrapper, sliderMeta);
  }
}
