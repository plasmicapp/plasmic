/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CursorIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CursorIcon(props: CursorIconProps) {
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
        d={"M5.75 5.75L11 18.25 13 13l5.25-2-12.5-5.25zM13 13l5.25 5.25"}
      ></path>
    </svg>
  );
}

export default CursorIcon;
/* prettier-ignore-end */
