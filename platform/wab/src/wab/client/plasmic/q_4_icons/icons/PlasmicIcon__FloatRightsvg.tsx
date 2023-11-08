// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FloatRightsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FloatRightsvgIcon(props: FloatRightsvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M18.25 10.25h-2.5a1 1 0 01-1-1v-2.5a1 1 0 011-1h2.5a1 1 0 011 1v2.5a1 1 0 01-1 1zm-13.5-4.5h6.5m-6.5 4.5h6.5m-6.5 4h14.5m-14.5 4h14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FloatRightsvgIcon;
/* prettier-ignore-end */
