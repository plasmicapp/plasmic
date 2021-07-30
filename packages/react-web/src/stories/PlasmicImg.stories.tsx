import { ComponentMeta, ComponentStory } from "@storybook/react";
import React from "react";
import { PlasmicImg } from "../render/PlasmicImg";
import "../styles/plasmic.css";

const Template: ComponentStory<typeof PlasmicImg> = (args: any) => {
  const { containerWidth, containerHeight, ...rest } = args;
  return (
    <div style={{ width: containerWidth, height: containerHeight }}>
      <PlasmicImg {...rest} />
    </div>
  );
};

export const Base = Template.bind({});
Base.args = {
  loader: "plasmic",
};

export default {
  title: "PlasmicImg",
  component: PlasmicImg,
  argTypes: {
    width: {
      control: "text",
    },
    height: {
      control: "text",
    },
    containerWidth: {
      name: "Container width",
      type: "number",
    },
    containerHeight: {
      name: "Container height",
      type: "number",
    },
  },
  args: {
    src: "https://images.theconversation.com/files/223729/original/file-20180619-126566-1jxjod2.jpg",
    fullWidth: 3840,
    fullHeight: 2160,
  },
} as ComponentMeta<typeof PlasmicImg>;
