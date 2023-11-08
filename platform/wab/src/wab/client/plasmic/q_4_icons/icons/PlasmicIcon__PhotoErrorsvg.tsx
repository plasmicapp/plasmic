// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PhotoErrorsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PhotoErrorsvgIcon(props: PhotoErrorsvgIconProps) {
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
          "M4.75 16l2.746-3.493c.779-.99 2.598-.64 3.419.316a645.29 645.29 0 002.576-3.31l.01-.013a2 2 0 013.085-.06"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M19.25 10.25v-3.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v10.5a2 2 0 002 2h2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M19.25 16a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0zM14 14l4 4"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PhotoErrorsvgIcon;
/* prettier-ignore-end */
