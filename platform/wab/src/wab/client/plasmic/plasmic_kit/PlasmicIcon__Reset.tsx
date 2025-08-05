/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ResetIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ResetIcon(props: ResetIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
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
          "M8.5 6.52a6.5 6.5 0 108.096.883.75.75 0 011.06-1.06 8 8 0 11-10.322-.844H4.75a.75.75 0 110-1.5h3.5A1.75 1.75 0 0110 5.75v3.5a.75.75 0 11-1.5 0V6.52z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ResetIcon;
/* prettier-ignore-end */
