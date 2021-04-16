import { Meta, Story } from "@storybook/react";
import React from "react";
import Select from "../components/Select";
import { FOCUSABLE_ARGS, HOVERABLE_ARGS } from "./story-utils";

const meta: Meta = {
  title: "Select",
  component: Select,
  subcomponents: { "Select.Option": Select.Option },
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

export const WithChildren = Template.bind({});
WithChildren.args = {
  children: [
    <Select.Option value="blue">Blue</Select.Option>,
    <Select.Option value="red">Red</Select.Option>,
    <Select.Option value="green">Green</Select.Option>,
  ],
};

export const WithItems = Template.bind({});
WithItems.args = {
  items: [
    { label: "Blue", value: "blue", hex: "#0000FF" },
    { label: "Red", value: "red", hex: "#FF0000" },
    { label: "Green", value: "green", hex: "#00FF00" },
  ],
  renderOption: (item: any) => (
    <Select.Option value={item.value}>
      <span style={{ color: item.hex }}>{item.label}</span>
    </Select.Option>
  ),
};

export const Code: Story = () => {
  return (
    <>
      <Select>
        <Select.Option value="blue">Blue</Select.Option>
        <Select.Option value="red">Red</Select.Option>
        <Select.Option value="green">Green</Select.Option>
      </Select>
      <Select
        items={[
          { label: "Blue", value: "blue", hex: "#0000FF" },
          { label: "Red", value: "red", hex: "#FF0000" },
          { label: "Green", value: "green", hex: "#00FF00" },
        ]}
        renderOption={(item) => (
          <Select.Option value={item.value}>
            <span style={{ color: item.hex }}>{item.label}</span>
          </Select.Option>
        )}
      />
    </>
  );
};
