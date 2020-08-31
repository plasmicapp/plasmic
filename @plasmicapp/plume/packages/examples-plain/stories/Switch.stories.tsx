import * as React from "react";
import Switch from "../src/components/Switch";
import { Story } from "@storybook/react/types-6-0";

export default {
  title: "Switch",
  component: Switch,
}

const Template: Story<React.ComponentProps<typeof Switch>> = (args) => <Switch {...args} />;

export const Base = Template.bind({});
Base.args = {
  children: "Toggle this!"
};
