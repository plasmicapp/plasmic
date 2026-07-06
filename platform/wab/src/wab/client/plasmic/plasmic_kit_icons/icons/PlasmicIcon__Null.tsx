/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type NullIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function NullIcon(props: NullIconProps) {
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
          "M16.75 12a4.75 4.75 0 1 1-9.5 0 4.75 4.75 0 0 1 9.5 0m-9 4.25 8.5-8.5"
        }
      ></path>
    </svg>
  );
}

export default NullIcon;
/* prettier-ignore-end */
