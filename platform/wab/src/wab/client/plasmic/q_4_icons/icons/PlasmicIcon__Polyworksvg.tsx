// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PolyworksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PolyworksvgIcon(props: PolyworksvgIconProps) {
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
          "M5 7.333A2.333 2.333 0 017.333 5h2.334v4.667H5V7.333zm14 0A2.333 2.333 0 0016.667 5h-2.334v4.667H19V7.333zM19 12a2.333 2.333 0 01-2.333 2.333h-2.334V9.667H19V12zM5 16.667A2.333 2.333 0 007.333 19h2.334v-4.667H5v2.334zm9.333 0A2.333 2.333 0 0112 19H9.667v-4.667h4.666v2.334zM5 9.667h4.667v4.666H5V9.667zM9.667 5h4.666v4.667H9.667V5zm0 4.667h4.666v4.666H9.667V9.667z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PolyworksvgIcon;
/* prettier-ignore-end */
