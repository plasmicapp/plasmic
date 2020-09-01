import * as React from "react";
import { Story } from "@storybook/react/types-6-0";
import Button from "../src/components/Button";
import CheckIcon from "../src/components/plasmic/plain_kit/PlasmicIcon__Check";
import ChevronDownIcon from "../src/components/plasmic/plain_kit/PlasmicIcon__ChevronDown";

export default {
  title: "Button",
  component: Button,
}

const Template: Story<React.ComponentProps<typeof Button>> = (args) => {
  return <Button {...args} />
}

export const Base = Template.bind({});
Base.args = {
  children: "Click me!"
};

export const StartIcon = Template.bind({});
StartIcon.args = {
  ...Base.args,
  startIcon: <CheckIcon />
};

export const EndIcon = Template.bind({});
EndIcon.args = {
  ...Base.args,
  endIcon: <ChevronDownIcon />
};

export const BothIcons = Template.bind({});
BothIcons.args = {
  ...Base.args,
  startIcon: <CheckIcon />,
  endIcon: <ChevronDownIcon />
};
