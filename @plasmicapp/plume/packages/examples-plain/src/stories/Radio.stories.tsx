import * as React from "react";
import RadioGroup from "../components/RadioGroup";
import Radio from "../components/Radio";
import { Story } from "@storybook/react/types-6-0";

export default {
  title: "Radio",
  component: RadioGroup,
  subcomponents: {Radio},
}

const Template: Story<React.ComponentProps<typeof RadioGroup>> = (args) => {
  return <RadioGroup {...args} />
};

export const Base = Template.bind({});
Base.args = {
  label: "Color",
  children: (
    <React.Fragment>
      <Radio value="blue">Blue</Radio>
      <Radio value="green">Green</Radio>
      <Radio value="yellow">Yellow</Radio>
      <Radio value="red">Red</Radio>
      <Radio value="purple">Purple</Radio>
    </React.Fragment>
  )
};
