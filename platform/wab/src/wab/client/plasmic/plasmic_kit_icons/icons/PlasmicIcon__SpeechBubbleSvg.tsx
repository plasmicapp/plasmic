/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SpeechBubbleSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SpeechBubbleSvgIcon(props: SpeechBubbleSvgIconProps) {
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
          "M12 18.25c3.866 0 7.25-2.095 7.25-6.75 0-4.655-3.384-6.75-7.25-6.75S4.75 6.845 4.75 11.5c0 1.768.488 3.166 1.305 4.22.239.31.334.72.168 1.073-.1.215-.207.42-.315.615-.454.816.172 2.005 1.087 1.822 1.016-.204 2.153-.508 3.1-.956a1.15 1.15 0 01.635-.103c.415.053.84.079 1.27.079z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SpeechBubbleSvgIcon;
/* prettier-ignore-end */
