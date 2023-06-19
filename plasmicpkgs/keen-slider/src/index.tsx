import registerComponent, {
  ActionProps,
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Button, Select } from "antd";
import React, { forwardRef, Ref, useEffect } from "react";
import { useKeenSlider, KeenSliderPlugin } from "keen-slider/react";
import composeRefs from "@seznam/compose-react-refs";
import { KeenSliderOptions } from "keen-slider";

const { Option } = Select;

const ResizePlugin: KeenSliderPlugin = (slider) => {
  const observer = new ResizeObserver(function () {
    slider.update();
  });

  slider.on("created", () => {
    observer.observe(slider.container);
  });
  slider.on("destroyed", () => {
    observer.unobserve(slider.container);
  });
};
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

interface KeenSliderProps extends KeenSliderOptions {}

export const sliderMeta: ComponentMeta<KeenSliderProps> = {
  name: "hostless-slider",
  displayName: "Slider",
  importName: "Slider",
  importPath: "keen-slider",
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
    disabled: {
      displayName: "Disabled",
      type: "boolean",
      description: "Disable or enable slider",
      defaultValueHint: false,
    },
    drag: {
      displayName: "Drag",
      type: "boolean",
      description: "Enables or disables mouse and touch control",
      defaultValueHint: true,
    },
    dragSpeed: {
      displayName: "Drag Speed",
      type: "number",
      description:
        "Set the speed that is applied to the slider when dragging it.",
      defaultValueHint: 1,
    },
    initial: {
      displayName: "Initial slide",
      type: "number",
      description: "Sets the index of initially visible slide",
      defaultValueHint: 1,
    },
    loop: {
      displayName: "Loop",
      type: "boolean",
      description:
        "Enable or disables carousel/loop functionality of the slider",
      defaultValueHint: false,
    },

    mode: {
      displayName: "Carousel mode",
      type: "choice",
      options: ["snap", "free", "free-snap"],
      description: "Sets the animation that is applied after a drag ends",
      defaultValueHint: "snap",
    },
    renderMode: {
      displayName: "Render mode",
      type: "choice",
      options: ["precision", "performance", "custom"],
      description:
        "It is possible that the render performance of the browser slows down, if you have slides with some complexity in markup and CSS. To counteract this problem, you can set this option to 'performance'. If you want to create your own renderer, you can set this options to 'custom'. Default is 'precision'.",
      defaultValueHint: "precision",
    },
    rtl: {
      displayName: "Reverse",
      type: "boolean",
      description: "Reverses the slide order",
      defaultValueHint: false,
    },

    rubberband: {
      displayName: "Rubberband ",
      type: "boolean",
      description:
        "Enables or disables rubberband behavior for dragging and animation after a drag.",
      defaultValueHint: true,
    },
    slides: {
      displayName: "Number of slides",
      type: "number",
      description: "Specifies number of slider ",
    },

    vertical: {
      displayName: "Vertical",
      type: "boolean",
      description: "Vertical slide mode",
      defaultValueHint: false,
      helpText:
        "(Note: The height of the container must be defined if vertical is true)",
    },
  },

  defaultStyles: {
    width: "stretch",
    maxWidth: "100%",
    flexDirection: "column",
  },
};

export const SliderWrapper = forwardRef(function SliderWrapper_(
  {
    editingSlide,
    children,

    className,
    setControlContextData,
    ...props
  }: KeenSliderProps & {
    className?: string;
    editingSlide?: number;
    children?: any;
    setControlContextData?: (data: {
      editingSlide: number | undefined;
    }) => void;
  },
  userRef?: Ref<HTMLDivElement>
) {
  setControlContextData?.({ editingSlide: editingSlide });
  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
    {
      ...props,
    },
    [ResizePlugin]
  );

  useEffect(() => {
    if (editingSlide !== undefined) {
      instanceRef.current!.moveToIdx(editingSlide);
    }
  }, [editingSlide]);

  return (
    <div className={className}>
      <div
        ref={composeRefs(sliderRef, userRef)}
        className="keen-slider"
        {...props}
        style={{ height: "100%" }}
      >
        {React.Children.map(children, (child) =>
          React.cloneElement(child, {
            className: `keen-slider__slide ${className}`,
          })
        )}
        {children}
      </div>
    </div>
  );
});

export function registerSlider(
  loader?: { registerComponent: typeof registerComponent },
  customSliderMeta?: ComponentMeta<KeenSliderOptions>
) {
  if (loader) {
    loader.registerComponent(SliderWrapper, customSliderMeta ?? sliderMeta);
  } else {
    registerComponent(SliderWrapper, customSliderMeta ?? sliderMeta);
  }
}
