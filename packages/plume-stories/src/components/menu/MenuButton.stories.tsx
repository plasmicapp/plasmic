import { Meta, Story } from "@storybook/react";
import React from "react";
import { FOCUSABLE_ARGS, HOVERABLE_ARGS } from "../../story-utils";
import Menu from "./Menu";
import MenuButton from "./MenuButton";

const meta: Meta = {
  title: "MenuButton",
  component: MenuButton,
  argTypes: {
    ...FOCUSABLE_ARGS,
    ...HOVERABLE_ARGS,
  },
  parameters: {
    controls: { expanded: true },
  },
};

export default meta;

const Template: Story<React.ComponentProps<typeof MenuButton>> = (args) => (
  <MenuButton {...args} />
);

export const Base = Template.bind({});
Base.args = {
  children: "Try me!",
  menu: (
    <Menu>
      <Menu.Item>Action 1</Menu.Item>
      <Menu.Item>Action 2</Menu.Item>
      <Menu.Item>Action 3</Menu.Item>
    </Menu>
  ),
};
