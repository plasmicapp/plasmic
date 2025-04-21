/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PublishIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PublishIcon(props: PublishIconProps) {
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
          "M6.25 14.25S4.75 14 4.75 12a3.25 3.25 0 013.007-3.241 4.25 4.25 0 018.486 0A3.25 3.25 0 0119.25 12c0 2-1.5 2.25-1.5 2.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M14.25 15.25L12 12.75l-2.25 2.5m2.25 4v-5.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PublishIcon;
/* prettier-ignore-end */
