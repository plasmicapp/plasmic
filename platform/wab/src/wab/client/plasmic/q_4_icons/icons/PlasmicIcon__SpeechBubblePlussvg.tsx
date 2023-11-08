// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SpeechBubblePlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SpeechBubblePlussvgIcon(props: SpeechBubblePlussvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M12 18.25c3.866 0 7.25-2.095 7.25-6.75 0-4.655-3.384-6.75-7.25-6.75S4.75 6.845 4.75 11.5c0 1.768.488 3.166 1.305 4.22.239.31.334.72.168 1.073-.1.215-.207.42-.315.615-.454.816.172 2.005 1.087 1.822 1.016-.204 2.153-.508 3.1-.956a1.15 1.15 0 01.635-.103c.415.053.84.079 1.27.079zM9.75 12h4.5M12 9.75v4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SpeechBubblePlussvgIcon;
/* prettier-ignore-end */
