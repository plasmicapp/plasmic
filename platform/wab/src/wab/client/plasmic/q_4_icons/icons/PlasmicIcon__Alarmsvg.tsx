// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AlarmsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AlarmsvgIcon(props: AlarmsvgIconProps) {
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
        d={"M7 18l-1.25 1.25M17 18l1.25 1.25M12 8.75V12l2.25 2.25"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M19.25 12a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0zm-.5-7.25l.5.5m-14-.5l-.5.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AlarmsvgIcon;
/* prettier-ignore-end */
