// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SpeakerMute2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SpeakerMute2SvgIcon(props: SpeakerMute2SvgIconProps) {
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
          "M7.5 8.75h4l5.75-4V15.5m0 3.75l-5.75-4H7.75a1 1 0 01-1-1v-2.5m12.5 5.5L4.75 6.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SpeakerMute2SvgIcon;
/* prettier-ignore-end */
