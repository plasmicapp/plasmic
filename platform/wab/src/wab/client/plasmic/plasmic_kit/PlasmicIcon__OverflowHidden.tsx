/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type OverflowHiddenIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function OverflowHiddenIcon(props: OverflowHiddenIconProps) {
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
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M8 13a5 5 0 015-5h26a5 5 0 015 5v38a5 5 0 01-5 5H13a5 5 0 01-5-5V13zm32 0v3H22a2 2 0 00-2 2v28a2 2 0 002 2h18v3a1 1 0 01-1 1H13a1 1 0 01-1-1V13a1 1 0 011-1h26a1 1 0 011 1z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M50 16a2 2 0 100 4h2v2a2 2 0 104 0v-4.5a1.5 1.5 0 00-1.5-1.5H50zm-2 30a2 2 0 002 2h4.5a1.5 1.5 0 001.5-1.5V42a2 2 0 10-4 0v2h-2a2 2 0 00-2 2zm6-18a2 2 0 00-2 2v4a2 2 0 104 0v-4a2 2 0 00-2-2z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default OverflowHiddenIcon;
/* prettier-ignore-end */
