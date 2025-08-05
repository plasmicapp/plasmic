/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SegmentSeparatorIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SegmentSeparatorIcon(props: SegmentSeparatorIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 10 48"}
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

      <path d={"M1-2l8 26-8 26"} stroke={"currentColor"}></path>
    </svg>
  );
}

export default SegmentSeparatorIcon;
/* prettier-ignore-end */
