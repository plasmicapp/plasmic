import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import React, { useState } from "react";
import { BaseLabel } from "./registerLabel";
import { BaseSlider } from "./registerSlider";
import { BaseSliderOutput } from "./registerSliderOutput";
import { BaseSliderThumb } from "./registerSliderThumb";
import { BaseSliderTrack } from "./registerSliderTrack";

// Single value slider meta
const meta: Meta<typeof BaseSlider<number>> = {
  title: "Components/BaseSlider",
  component: BaseSlider,
  args: {
    onChange: fn(),
    onChangeEnd: fn(),
    minValue: 0,
    maxValue: 100,
    step: 1,
    orientation: "horizontal" as const,
  },
  // TODO: Currently, the BaseSlider's defaultValue prop is not handled correctly inside BaseSliderTrack, i.e. it can't be uncontrolled
  // The render function below assigns the defaultValue prop to the value prop - its needed to keep the BaseSlider controlled
  // This render function needs to be removed in the PR that fixes the handling of defaultValue in BaseSliderTrack.
  render: (args) => {
    const [value, setValue] = useState(args.defaultValue);
    return (
      <BaseSlider
        {...args}
        value={value}
        onChange={(newValue) => {
          setValue(newValue);
          args.onChange?.(newValue);
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof BaseSlider<number>>;

// TODO: Currently, BaseSliderTrack does not render any thumbs if there is no value/default value prop
// The test below needs to be uncommented in the PR that fixes the issue
// Basic slider with no initial value
// export const Basic: Story = {
//     args: {
//         step: 5,
//         children: (
//             <>
//                 <BaseLabel>Slider label</BaseLabel>
//                 <BaseSliderOutput>Output</BaseSliderOutput>
//                 <BaseSliderTrack>
//                     <BaseSliderThumb autoFocus className={"thumb-1"} />
//                 </BaseSliderTrack>
//             </>
//         ),
//     },
//     play: async ({ canvasElement, args }) => {
//         const canvas = within(canvasElement);
//         const slider = canvas.getByRole("group");
//         const label = within(slider).getByText("Slider label");
//         const thumbs = slider.getElementsByTagName("input");
//         expect(thumbs).toHaveLength(1);

//         await userEvent.click(label); // Focus on the slider thumb
//         await userEvent.keyboard("{ArrowRight}"); // Move to the right

//         expect(args.onChange).toHaveBeenCalledWith([5]); // defaults to range slider if no value/defaultValue is provided (that's the default react-aria slider component behaviour)
//         expect(args.onChangeEnd).toHaveBeenCalledOnce();
//     },
// };

// Basic slider with no initial value
export const WithDefaultValue: Story = {
  args: {
    step: 5,
    defaultValue: 22,
    children: (
      <>
        <BaseLabel>Slider label</BaseLabel>
        <BaseSliderOutput>Output</BaseSliderOutput>
        <BaseSliderTrack>
          <BaseSliderThumb className={"thumb-1"} />
        </BaseSliderTrack>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole("group");
    const label = within(slider).getByText("Slider label");
    const thumbs = slider.getElementsByTagName("input");
    expect(thumbs).toHaveLength(1);

    await userEvent.click(label); // Focus on the slider thumb
    await userEvent.keyboard("{ArrowRight}"); // Move to the right

    expect(args.onChange).toHaveBeenCalledWith(25);
    expect(args.onChangeEnd).toHaveBeenCalledOnce();
  },
};

// // Disabled slider
export const Disabled: Story = {
  args: {
    step: 5,
    defaultValue: 22,
    isDisabled: true,
    children: (
      <>
        <BaseLabel>Slider label</BaseLabel>
        <BaseSliderOutput>Output</BaseSliderOutput>
        <BaseSliderTrack>
          <BaseSliderThumb className={"thumb-1"} />
        </BaseSliderTrack>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole("group");
    const label = within(slider).getByText("Slider label");
    const thumbs = slider.getElementsByTagName("input");
    expect(thumbs).toHaveLength(1);

    await userEvent.click(label); // Focus on the slider thumb
    await userEvent.keyboard("{ArrowRight}"); // Move to the right

    expect(args.onChange).not.toHaveBeenCalled();
    expect(args.onChangeEnd).not.toHaveBeenCalled();
  },
};

// Range slider specific stories
type RangeStory = StoryObj<typeof BaseSlider<number[]>>;

export const RangeSlider: RangeStory = {
  args: {
    defaultValue: [20, 80],
    step: 10,
    children: (
      <>
        <BaseLabel>Slider label</BaseLabel>
        <BaseSliderOutput>Output</BaseSliderOutput>
        <BaseSliderTrack>
          <BaseSliderThumb className={"thumb-1"} />
          <BaseSliderThumb className={"thumb-2"} />
        </BaseSliderTrack>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole("group");
    const label = within(slider).getByText("Slider label");
    const thumbs = slider.getElementsByTagName("input");

    expect(thumbs).toHaveLength(2);

    expect(slider.querySelector(".thumb-1")).toBeInTheDocument();
    expect(slider.querySelector(".thumb-2")).toBeInTheDocument();

    await userEvent.click(label);
    await userEvent.keyboard("{ArrowLeft}");
    expect(args.onChange).toHaveBeenCalledWith([10, 80]);
    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");

    expect(args.onChange).toHaveBeenCalledWith([10, 90]);
  },
};

export const TooFewThumbs: RangeStory = {
  args: {
    defaultValue: [20, 47, 80],
    step: 10,
    children: (
      <>
        <BaseLabel>Slider label</BaseLabel>
        <BaseSliderOutput>Output</BaseSliderOutput>
        <BaseSliderTrack>
          <BaseSliderThumb className={"thumb-1"} />
          <BaseSliderThumb className={"thumb-2"} />
        </BaseSliderTrack>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole("group");
    const label = within(slider).getByText("Slider label");
    const thumbs = slider.getElementsByTagName("input");

    expect(thumbs).toHaveLength(3);

    expect(slider.querySelectorAll(".thumb-1")).toHaveLength(1);
    expect(slider.querySelectorAll(".thumb-2")).toHaveLength(2);

    await userEvent.click(label);
    await userEvent.keyboard("{ArrowLeft}");
    expect(args.onChange).toHaveBeenCalledWith([10, 50, 80]); // all values adjusted to the step (47 -> 50)

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");

    expect(args.onChange).toHaveBeenCalledWith([10, 60, 80]);
  },
};

export const TooManyThumbs: RangeStory = {
  args: {
    defaultValue: [20, 80],
    step: 10,
    children: (
      <>
        <BaseLabel>Slider label</BaseLabel>
        <BaseSliderOutput>Range: 20-80</BaseSliderOutput>
        <BaseSliderTrack>
          <BaseSliderThumb className={"thumb-1"} />
          <BaseSliderThumb className={"thumb-2"} />
          <BaseSliderThumb className={"thumb-3"} />
        </BaseSliderTrack>
      </>
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const slider = canvas.getByRole("group");
    const label = within(slider).getByText("Slider label");
    const thumbs = slider.getElementsByTagName("input");

    expect(thumbs).toHaveLength(2);

    expect(slider.querySelectorAll(".thumb-1")).toHaveLength(1);
    expect(slider.querySelectorAll(".thumb-2")).toHaveLength(1);
    expect(slider.querySelectorAll(".thumb-3")).toHaveLength(0); // unused, because there are 3 thumbs but only 2 values

    await userEvent.click(label);
    await userEvent.keyboard("{ArrowLeft}");
    expect(args.onChange).toHaveBeenCalledWith([10, 80]);

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");

    expect(args.onChange).toHaveBeenCalledWith([10, 90]);
  },
};
