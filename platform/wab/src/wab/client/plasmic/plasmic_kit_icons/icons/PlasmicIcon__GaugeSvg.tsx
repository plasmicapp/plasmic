/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type GaugeSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GaugeSvgIcon(props: GaugeSvgIconProps) {
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
          "M16.75 17.25h.5a2 2 0 002-2v-6.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v6.5a2 2 0 002 2h.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M12 19a2 2 0 002-2h-1.5a.5.5 0 01-.5.5V19zm2-2a2 2 0 00-2-2v1.5a.5.5 0 01.5.5H14zm-2.5 0a.5.5 0 01.5-.5V15a2 2 0 00-2 2h1.5zm.5.5a.5.5 0 01-.5-.5H10a2 2 0 002 2v-1.5z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={"M11 16l-2.25-4.25m3.25-2v.5m3.625.471l-.25.433"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GaugeSvgIcon;
/* prettier-ignore-end */
