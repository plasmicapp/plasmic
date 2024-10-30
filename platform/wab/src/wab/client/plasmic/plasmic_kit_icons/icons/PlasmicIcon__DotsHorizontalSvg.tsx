// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DotsHorizontalSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DotsHorizontalSvgIcon(props: DotsHorizontalSvgIconProps) {
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
          "M4 12a1.25 1.25 0 112.5 0A1.25 1.25 0 014 12zm6.75 0a1.25 1.25 0 112.5 0 1.25 1.25 0 01-2.5 0zm8-1.25a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default DotsHorizontalSvgIcon;
/* prettier-ignore-end */
