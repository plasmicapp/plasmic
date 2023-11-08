// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ClocksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ClocksvgIcon(props: ClocksvgIconProps) {
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

      <circle
        cx={"12"}
        cy={"12"}
        r={"7.25"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
      ></circle>

      <path
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        d={"M12 8v4l2 2"}
      ></path>
    </svg>
  );
}

export default ClocksvgIcon;
/* prettier-ignore-end */
