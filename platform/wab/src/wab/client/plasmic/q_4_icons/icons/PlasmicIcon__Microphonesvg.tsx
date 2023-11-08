// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MicrophonesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MicrophonesvgIcon(props: MicrophonesvgIconProps) {
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
        d={"M8.75 8a3.25 3.25 0 016.5 0v3a3.25 3.25 0 01-6.5 0V8z"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M5.75 12.75s.25 4.5 6.25 4.5 6.25-4.5 6.25-4.5m-6.25 5v1.5"}
      ></path>
    </svg>
  );
}

export default MicrophonesvgIcon;
/* prettier-ignore-end */
