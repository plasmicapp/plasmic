// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CursorTextsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CursorTextsvgIcon(props: CursorTextsvgIconProps) {
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
        d={
          "M17 18.25V5.75m0 12.5c0 1-2.25 1-2.25 1m2.25-1c0 1 2.25 1 2.25 1M17 5.75c0-1-2.25-1-2.25-1m2.25 1c0-1 2.25-1 2.25-1m-3.5 7.5h2.5m-13.5 4L8 7.75l3.25 8.5m-5.25-3h4"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CursorTextsvgIcon;
/* prettier-ignore-end */
