/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ChecklistSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ChecklistSvgIcon(props: ChecklistSvgIconProps) {
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
          "M19.25 12.25v-5.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v10.5a2 2 0 002 2h4.5m-2.5-10.5h6.5m-6.5 4h6.5m-.5 5l1.5 1.5c.75-2.25 3-3.5 3-3.5"
        }
      ></path>
    </svg>
  );
}

export default ChecklistSvgIcon;
/* prettier-ignore-end */
