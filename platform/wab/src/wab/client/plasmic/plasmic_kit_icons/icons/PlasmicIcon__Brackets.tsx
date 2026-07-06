/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BracketsIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BracketsIcon(props: BracketsIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
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
          "M9.25 4.75h-1.5a1 1 0 0 0-1 1v12.5a1 1 0 0 0 1 1h1.5m5.5-14.5h1.5a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-1.5"
        }
      ></path>
    </svg>
  );
}

export default BracketsIcon;
/* prettier-ignore-end */
