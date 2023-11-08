// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DribbblesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DribbblesvgIcon(props: DribbblesvgIconProps) {
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
          "M19.25 12a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0zM8.271 6.5c2.787 1.6 6.678 4.66 8.879 10M16 6.39C14.357 8.374 10.69 11.71 5 11m5.688 8s.812-6.5 8.03-8.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DribbblesvgIcon;
/* prettier-ignore-end */
