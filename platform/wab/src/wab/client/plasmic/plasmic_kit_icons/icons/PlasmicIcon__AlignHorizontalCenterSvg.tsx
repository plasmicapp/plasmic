// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AlignHorizontalCenterSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AlignHorizontalCenterSvgIcon(
  props: AlignHorizontalCenterSvgIconProps
) {
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
          "M13.25 17.25h-2.5a2 2 0 01-2-2v-6.5a2 2 0 012-2h2.5a2 2 0 012 2v6.5a2 2 0 01-2 2zm6-12.5v14.5M4.75 4.75v14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AlignHorizontalCenterSvgIcon;
/* prettier-ignore-end */
