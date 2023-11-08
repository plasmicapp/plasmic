// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SoundcloudsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SoundcloudsvgIcon(props: SoundcloudsvgIconProps) {
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
        d={
          "M13.787 7.238c1.358.676 2.37 1.99 2.456 3.521A3.25 3.25 0 0116 17.25h-2.125m-9.125-3.5v3.5m3-5.5v5.5m3-9.5v9.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SoundcloudsvgIcon;
/* prettier-ignore-end */
