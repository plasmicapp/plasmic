// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ParenthesissvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ParenthesissvgIcon(props: ParenthesissvgIconProps) {
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
          "M8.25 4.75S4.75 7.063 4.75 12c0 4.937 3.5 7.25 3.5 7.25m7.5-14.5s3.5 2.313 3.5 7.25c0 4.937-3.5 7.25-3.5 7.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ParenthesissvgIcon;
/* prettier-ignore-end */
