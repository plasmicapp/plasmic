// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CalendarPlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CalendarPlussvgIcon(props: CalendarPlussvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M19.25 11.25v-2.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v8.5a2 2 0 002 2h4.5m5.75-4.5v4.5M19.25 17h-4.5M8 4.75v3.5m8-3.5v3.5m-8.25 2.5h8.5"
        }
      ></path>
    </svg>
  );
}

export default CalendarPlussvgIcon;
/* prettier-ignore-end */
