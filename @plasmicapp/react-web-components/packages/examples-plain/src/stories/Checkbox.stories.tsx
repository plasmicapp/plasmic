import * as React from "react";
import Checkbox from "../components/Checkbox";
import { Story } from "@storybook/react/types-6-0";

export default {
  title: "Checkbox",
  component: Checkbox,
}

const Template: Story<React.ComponentProps<typeof Checkbox>> = (args) => {
  return <Checkbox {...args} />
}

export const Base = Template.bind({});
Base.args = {
  children: "Check this out",
};

export const Unlabeled = Template.bind({});
Unlabeled.args = {
};
