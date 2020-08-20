import * as React from "react";
import {SelectUnknown as Select} from "../components/Select";
import { Item } from "@plasmicapp/plume";
import { Story } from "@storybook/react/types-6-0";

export default {
  title: "Select",
  component: Select,
  subcomponents: {Item}
}

const Template: Story<React.ComponentProps<typeof Select>> = (args) => <Select {...args} />;


export const Base = Template.bind({});
Base.args = {
  label: "Color",
  children: [
      <Item key="blue">Blue</Item>,
      <Item key="green">Green</Item>,
      <Item key="yellow">Yellow</Item>,
      <Item key="red">Red</Item>,
      <Item key="purple">Purple</Item>,
  ]
};

interface ColorItem {
  id: string;
  name: string;
  hex: string;
}

export const CustomRender = Template.bind({});
CustomRender.args = {
  label: "Color",
  items: [
    {
      id: "blue",
      name: "Blue",
      hex: "#2196F3",
    },
    {
      id: "green",
      name: "Green",
      hex: "#4CAF50",
    },
    {
      id: "yellow",
      name: "Yellow",
      hex: "#FFEB3B",
    },
    {
      id: "red",
      name: "Red",
      hex: "#F44336",
    },
    {
      id: "purple",
      name: "Purple",
      hex: "#673AB7",
    },
  ] as ColorItem[],
  renderSelectedItem: (item: any) => item && <strong style={{color: item.hex}}>{item.name}</strong>,
  children: (item: any) => <Item key={item.id} textValue={item.name}><div style={{color: item.hex}}>{item.name}</div></Item>
};
