/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AlignTopSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AlignTopSvgIcon(props: AlignTopSvgIconProps) {
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
          "M13.25 19.25h-2.5a2 2 0 01-2-2v-6.5a2 2 0 012-2h2.5a2 2 0 012 2v6.5a2 2 0 01-2 2zm-8.5-14.5h14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AlignTopSvgIcon;
/* prettier-ignore-end */
