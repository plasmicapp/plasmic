import { Meta, Story } from "@storybook/react";
import React from "react";
import { FOCUSABLE_ARGS, HOVERABLE_ARGS } from "../../story-utils";
import Select from "./Select";
import Select__Option from "./Select__Option";
import Select__OptionGroup from "./Select__OptionGroup";

const meta: Meta = {
  title: "Select",
  component: Select,
  subcomponents: {
    "Select.Option": Select__Option,
    "Select.OptionGroup": Select__OptionGroup,
  },
  argTypes: {
    placeholder: {
      control: "text",
    },
    ...FOCUSABLE_ARGS,
    ...HOVERABLE_ARGS,
  },
  parameters: {
    controls: { expanded: true },
  },
};

export default meta;

const Template: Story<React.ComponentProps<typeof Select>> = (args) => (
  <Select {...args} />
);

export const Base = Template.bind({});
Base.args = {
  children: (
    <>
      <Select.Option value="blue">Blue</Select.Option>
      <Select.Option value="red">Red</Select.Option>
      <Select.Option value="green">Green</Select.Option>
      <Select.Option value="pink">Pink</Select.Option>
    </>
  ),
};

export const WithGroups = Template.bind({});
WithGroups.args = {
  children: (
    <>
      <Select.OptionGroup title="Asia">
        <Select.Option>Taiwan</Select.Option>
        <Select.Option>China</Select.Option>
        <Select.Option>Japan</Select.Option>
        <Select.Option>India</Select.Option>
      </Select.OptionGroup>
      <Select.OptionGroup title="Europe">
        <Select.Option>France</Select.Option>
        <Select.Option>Germany</Select.Option>
        <Select.Option>Italy</Select.Option>
      </Select.OptionGroup>
      <Select.OptionGroup title="Americas">
        <Select.Option>United States of America</Select.Option>
        <Select.Option>Brazil</Select.Option>
        <Select.Option>Dominican Republic</Select.Option>
        <Select.Option>Mexico</Select.Option>
        <Select.Option>Argentina</Select.Option>
      </Select.OptionGroup>
    </>
  ),
};
