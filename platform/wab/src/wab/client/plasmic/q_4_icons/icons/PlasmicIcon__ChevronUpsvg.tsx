// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ChevronUpsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChevronUpsvgIcon(props: ChevronUpsvgIconProps) {
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
        d={"M15.25 14.25L12 10.75l-3.25 3.5"}
      ></path>
    </svg>
  );
}

export default ChevronUpsvgIcon;
/* prettier-ignore-end */
