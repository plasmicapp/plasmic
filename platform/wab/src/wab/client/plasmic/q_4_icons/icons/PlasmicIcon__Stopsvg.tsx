// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StopsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StopsvgIcon(props: StopsvgIconProps) {
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

      <rect
        width={"12.5"}
        height={"12.5"}
        x={"5.75"}
        y={"5.75"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        rx={"1"}
      ></rect>
    </svg>
  );
}

export default StopsvgIcon;
/* prettier-ignore-end */
