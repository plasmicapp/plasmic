// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FloatCentersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FloatCentersvgIcon(props: FloatCentersvgIconProps) {
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
          "M13.25 10.25h-2.5a1 1 0 01-1-1v-2.5a1 1 0 011-1h2.5a1 1 0 011 1v2.5a1 1 0 01-1 1zm-8.5-4.5h1.5m11.5 0h1.5m-14.5 4.5h1.5m11.5 0h1.5m-14.5 4h14.5m-14.5 4h14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FloatCentersvgIcon;
/* prettier-ignore-end */
