import { Meta, Story } from "@storybook/react";
import React from "react";
import Menu from "./Menu";
import MenuButton from "./MenuButton";

const meta: Meta = {
  title: "Menu",
  component: Menu,
  parameters: {
    controls: { expanded: true },
  },
};

export default meta;

const Template: Story<React.ComponentProps<typeof Menu>> = (args) => (
  <MenuButton menu={<Menu {...args} />}>Try me</MenuButton>
);

export const Base = Template.bind({});
Base.args = {
  children: (
    <>
      <Menu.Item>Action 1</Menu.Item>
      <Menu.Item>Action 2</Menu.Item>
      <Menu.Item>Action 3</Menu.Item>
      <Menu.Item>Action 4</Menu.Item>
      <Menu.Item>Action 5</Menu.Item>
    </>
  ),
};

export const WithGroups = Template.bind({});
WithGroups.args = {
  children: (
    <>
      <Menu.Group title="Group 1">
        <Menu.Item>Action 1</Menu.Item>
        <Menu.Item>Action 2</Menu.Item>
        <Menu.Item>Action 3</Menu.Item>
      </Menu.Group>
      <Menu.Group title="Group 2">
        <Menu.Item>Action 4</Menu.Item>
        <Menu.Item>Action 5</Menu.Item>
        <Menu.Item>Action 6</Menu.Item>
      </Menu.Group>
    </>
  ),
};
