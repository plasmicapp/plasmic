import { Meta, Story } from "@storybook/react";
import React from "react";
import { FOCUSABLE_ARGS, HOVERABLE_ARGS } from "../../story-utils";
import Checkbox from "./Checkbox";

const meta: Meta = {
  title: "Checkbox",
  component: Checkbox,
  argTypes: {
    ...FOCUSABLE_ARGS,
    ...HOVERABLE_ARGS,
  },
  parameters: {
    controls: { expanded: true },
  },
};

export default meta;

const Template: Story<React.ComponentProps<typeof Checkbox>> = (args) => (
  <Checkbox {...args} />
);

export const Indeterminate = Template.bind({});
Indeterminate.args = {
  isIndeterminate: true,
};

export const DefaultCheckedWithLabel = Template.bind({});
DefaultCheckedWithLabel.args = {
  defaultChecked: true,
  children: "Checkbox checked by default",
};

export const DisabledWithLabel = Template.bind({});
DisabledWithLabel.args = {
  children: "Disabled checkbox",
  isDisabled: true,
};
