// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PaintbrushsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PaintbrushsvgIcon(props: PaintbrushsvgIconProps) {
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
        d={"M17.25 4.75h-2l-3 3.5v-3.5h-5.5v7.5h10.5v-7.5z"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M17.25 11v2.25a2 2 0 01-2 2h-1v3a1 1 0 01-1 1h-2.5a1 1 0 01-1-1v-3h-1a2 2 0 01-2-2V11"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PaintbrushsvgIcon;
/* prettier-ignore-end */
