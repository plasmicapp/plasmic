/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type OverflowVisibleIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function OverflowVisibleIcon(props: OverflowVisibleIconProps) {
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
          "M13 8a5 5 0 00-5 5v38a5 5 0 005 5h26a5 5 0 005-5v-3h10a2 2 0 002-2V18a2 2 0 00-2-2H44v-3a5 5 0 00-5-5H13zm27 8v-3a1 1 0 00-1-1H13a1 1 0 00-1 1v38a1 1 0 001 1h26a1 1 0 001-1v-3H22a2 2 0 01-2-2V18a2 2 0 012-2h18z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default OverflowVisibleIcon;
/* prettier-ignore-end */
