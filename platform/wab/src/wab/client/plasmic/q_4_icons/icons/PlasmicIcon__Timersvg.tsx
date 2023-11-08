// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TimersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TimersvgIcon(props: TimersvgIconProps) {
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
          "M18.25 13a6.25 6.25 0 11-12.5 0 6.25 6.25 0 0112.5 0zM16.5 8.5l.75-.75M12 6.5V4.75m0 0H9.75m2.25 0h2.25m-2.25 5v3.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TimersvgIcon;
/* prettier-ignore-end */
