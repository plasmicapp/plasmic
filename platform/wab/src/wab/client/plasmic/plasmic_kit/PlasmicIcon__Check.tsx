/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CheckIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CheckIcon(props: CheckIconProps) {
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
          "M51.139 14.356a2 2 0 01.506 2.783l-22.09 31.908a2.5 2.5 0 01-4.107.006l-11.089-15.91a2 2 0 113.282-2.286l9.854 14.138 20.86-30.133a2 2 0 012.784-.506z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default CheckIcon;
/* prettier-ignore-end */
