/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BorderDashedIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BorderDashedIcon(props: BorderDashedIconProps) {
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
          "M5 12a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 015 12zm5 0a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5A.75.75 0 0110 12zm6.75-.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default BorderDashedIcon;
/* prettier-ignore-end */
