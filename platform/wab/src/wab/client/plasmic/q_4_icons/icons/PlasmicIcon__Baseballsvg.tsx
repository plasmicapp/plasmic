// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BaseballsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BaseballsvgIcon(props: BaseballsvgIconProps) {
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
          "M19.003 13.876a7.25 7.25 0 11-14.006-3.752 7.25 7.25 0 0114.006 3.752zM8.62 5.787a7.25 7.25 0 01-2.654 9.904m12.07-7.381a7.25 7.25 0 00-2.654 9.904"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BaseballsvgIcon;
/* prettier-ignore-end */
