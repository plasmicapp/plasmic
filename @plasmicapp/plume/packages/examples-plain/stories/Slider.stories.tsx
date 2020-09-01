import * as React from "react";
import Slider from "../src/components/Slider";
import { Story } from "@storybook/react/types-6-0";

export default {
  title: "Slider",
  component: Slider,
}

const Template: Story<React.ComponentProps<typeof Slider>> = (args) => {
  return <Slider {...args} />
}

export const SingleSlider = Template.bind({});
SingleSlider.args = {
  defaultValue: [50],
  label: "Volume"
};

export const RangeSlider = Template.bind({});
RangeSlider.args = {
  isRange: true,
  defaultValue: [25, 75],
  label: "Temperature",
  formatOptions: {
    style: "unit",
    unit: "celsius"
  } as any
};

export const MultiSlider = Template.bind({});
MultiSlider.args = {
  defaultValue: [60, 70, 80, 90],
  label: "Grades",
  getThumbLabel: index => ["D", "C", "B", "A"][index]
};
