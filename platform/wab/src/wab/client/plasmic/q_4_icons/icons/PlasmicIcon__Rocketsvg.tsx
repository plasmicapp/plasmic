// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type RocketsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RocketsvgIcon(props: RocketsvgIconProps) {
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
          "M13.456 6.855a8 8 0 015.408-2.105h.386v.386a8 8 0 01-2.105 5.408l-6.15 6.704-4.243-4.243 6.704-6.15zM7.25 16.75l-2.5 2.5m4.5-.5l-.5.5m-3.5-4.5l-.5.5m8.25 4L14.24 14 11 17.25l2 2zM6.75 13L10 9.75l-5.25 1 2 2.25z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default RocketsvgIcon;
/* prettier-ignore-end */
