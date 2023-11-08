// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ShapeRotatesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShapeRotatesvgIcon(props: ShapeRotatesvgIconProps) {
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
          "M4.929 14.812a2 2 0 011.06-2.622l3.221-1.368a2 2 0 012.623 1.06l1.367 3.222a2 2 0 01-1.06 2.622l-3.22 1.368a2 2 0 01-2.623-1.06l-1.368-3.222zm12.198 2.438c2.83-2.831 2.83-7.545 0-10.377a7.251 7.251 0 00-9.675-.52"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M6.75 4.75v2.5h2.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ShapeRotatesvgIcon;
/* prettier-ignore-end */
