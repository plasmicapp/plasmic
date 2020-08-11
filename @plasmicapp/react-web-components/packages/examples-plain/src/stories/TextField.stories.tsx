import * as React from "react";
import { withKnobs, text, boolean, select } from "@storybook/addon-knobs";
import TextField from "../components/TextField";
import ClearIcon from "../components/plasmic/plain_kit/PlasmicIcon__Clear";
import SearchIcon from "../components/plasmic/plain_kit/PlasmicIcon__Search";
import { Story } from "@storybook/react/types-6-0";

export default {
  title: "TextField",
  component: TextField,
  decorators: [withKnobs]
}

const Template: Story<React.ComponentProps<typeof TextField>> = args => <TextField {...args}/>;

export const Base = Template.bind({});
Base.args = {
  label: "Email",
  placeholder: "Enter something here..."
};

export const StartIcon = Template.bind({});
StartIcon.args = {
  ...Base.args,
  startIcon: <SearchIcon/>
};

export const EndIcon = Template.bind({});
EndIcon.args = {
  ...Base.args,
  endIcon: <ClearIcon />
};

export const BothIcons = Template.bind({});
BothIcons.args = {
  ...Base.args,
  startIcon: <SearchIcon />,
  endIcon: <ClearIcon />
};