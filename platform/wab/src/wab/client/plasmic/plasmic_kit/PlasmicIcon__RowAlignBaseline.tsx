/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RowAlignBaselineIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RowAlignBaselineIcon(props: RowAlignBaselineIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M6 8a2 2 0 012-2h48a2 2 0 110 4H8a2 2 0 01-2-2zm0 48a2 2 0 012-2h48a2 2 0 110 4H8a2 2 0 01-2-2zm6-26a2 2 0 100 4h10v4a2 2 0 002 2h4a2 2 0 002-2v-4h4v14a2 2 0 002 2h4a2 2 0 002-2V34h10a2 2 0 100-4H42V16a2 2 0 00-2-2h-4a2 2 0 00-2 2v14h-4v-4a2 2 0 00-2-2h-4a2 2 0 00-2 2v4H12z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default RowAlignBaselineIcon;
/* prettier-ignore-end */
