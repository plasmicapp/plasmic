// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DatabasesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DatabasesvgIcon(props: DatabasesvgIconProps) {
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
          "M19.25 7c0 1.105-3.384 2.25-7.25 2.25S4.75 8.105 4.75 7 8.134 4.75 12 4.75 19.25 5.895 19.25 7zm0 5c0 1.105-3.384 2.25-7.25 2.25S4.75 13.105 4.75 12"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M19.25 7v10c0 1.105-3.384 2.25-7.25 2.25S4.75 18.105 4.75 17V7"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DatabasesvgIcon;
/* prettier-ignore-end */
