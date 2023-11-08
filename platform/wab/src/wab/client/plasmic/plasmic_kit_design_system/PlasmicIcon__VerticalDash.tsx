// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type VerticalDashIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VerticalDashIcon(props: VerticalDashIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <rect
        x={"7.5"}
        y={"4.75"}
        width={"1"}
        height={"6.5"}
        rx={".5"}
        fill={"currentColor"}
      ></rect>
    </svg>
  );
}

export default VerticalDashIcon;
/* prettier-ignore-end */
