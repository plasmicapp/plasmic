/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type StretchIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StretchIcon(props: StretchIconProps) {
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
          "M4.75 4a.75.75 0 01.75.75v14.5a.75.75 0 01-1.5 0V4.75A.75.75 0 014.75 4zm5.002 6.307a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114L7.872 12l1.88-1.693zm5.5-1.114a.75.75 0 10-1.004 1.114L16.128 12l-1.88 1.693a.75.75 0 101.004 1.114l2.5-2.25a.75.75 0 000-1.114l-2.5-2.25zM20 4.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V4.75z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default StretchIcon;
/* prettier-ignore-end */
