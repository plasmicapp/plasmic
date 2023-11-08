// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WarningTrianglesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WarningTrianglesvgIcon(props: WarningTrianglesvgIconProps) {
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
          "M10.658 4.933c.553-1.105 2.13-1.105 2.684 0l6.073 12.146a1.5 1.5 0 01-1.342 2.171H5.927a1.5 1.5 0 01-1.342-2.17l6.073-12.147z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12 10v2"}
        stroke={"currentColor"}
        strokeWidth={"2"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12.5 16a.5.5 0 11-1 0 .5.5 0 011 0z"}
        stroke={"currentColor"}
      ></path>
    </svg>
  );
}

export default WarningTrianglesvgIcon;
/* prettier-ignore-end */
