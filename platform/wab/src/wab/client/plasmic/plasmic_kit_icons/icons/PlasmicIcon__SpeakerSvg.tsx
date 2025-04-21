/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SpeakerSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SpeakerSvgIcon(props: SpeakerSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M17.25 4.75l-6.75 4H7.75a1 1 0 00-1 1v4.5a1 1 0 001 1h2.75l6.75 4V4.75z"
        }
      ></path>
    </svg>
  );
}

export default SpeakerSvgIcon;
/* prettier-ignore-end */
