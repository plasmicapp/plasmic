/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TagSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TagSvgIcon(props: TagSvgIconProps) {
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

      <circle cx={"15"} cy={"9"} r={"1"} fill={"currentColor"}></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M12 4.75h7.25V12l-6.697 6.67a2 2 0 01-2.87-.047L5.29 13.94a2 2 0 01.072-2.81L12 4.75z"
        }
      ></path>
    </svg>
  );
}

export default TagSvgIcon;
/* prettier-ignore-end */
