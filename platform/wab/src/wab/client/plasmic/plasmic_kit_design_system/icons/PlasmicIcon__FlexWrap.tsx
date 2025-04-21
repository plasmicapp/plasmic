/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FlexWrapIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FlexWrapIcon(props: FlexWrapIconProps) {
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
          "M34.002 16H17.989a2 2 0 010-4h16.013c9.941 0 18 8.06 18 18 0 9.942-8.059 18-18 18h-9.997v4.983a1.026 1.026 0 01-1.62.82l-9.956-6.99a.996.996 0 010-1.638l9.956-6.989a1.025 1.025 0 011.62.82V44h9.997c7.732 0 14-6.268 14-14s-6.268-14-14-14z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default FlexWrapIcon;
/* prettier-ignore-end */
