import { Meta, StoryFn } from "@storybook/react";
import React from "react";
import { PlasmicImg } from "../render/PlasmicImg";
import "../styles/plasmic.css";

type PlasmicImgTemplateProps = React.ComponentProps<typeof PlasmicImg> & {
  containerWidth?: number;
  containerHeight?: number;
};

const Template: StoryFn<PlasmicImgTemplateProps> = ({
  containerWidth,
  containerHeight,
  ...rest
}) => {
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
    displayWidth: {
      control: "text",
    },
    displayHeight: {
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
    src: {
      src: "https://img.plasmic.app/img-optimizer/v1/img/07a7153536a89fef14e0075c7632d6b3.jpg",
      fullWidth: 3840,
      fullHeight: 2160,
    },
    loader: "plasmic",
  },
} satisfies Meta<PlasmicImgTemplateProps>;
