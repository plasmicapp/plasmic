// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DownloadCloudsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DownloadCloudsvgIcon(props: DownloadCloudsvgIconProps) {
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
          "M6.25 14.25S4.75 14 4.75 12a3.25 3.25 0 013.007-3.241 4.25 4.25 0 018.486 0A3.25 3.25 0 0119.25 12c0 2-1.5 2.25-1.5 2.25m-3.5 2.5L12 19.25l-2.25-2.5m2.25 1.5v-5.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DownloadCloudsvgIcon;
/* prettier-ignore-end */
