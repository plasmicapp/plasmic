/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ApplePaySvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ApplePaySvgIcon(props: ApplePaySvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
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

      <path
        d={
          "M18.25 19.25v-8.5a2 2 0 00-2-2h-8.5a2 2 0 00-2 2v8.5m6-8h.5m-3.5-5s.75-1.5 3.25-1.5 3.25 1.5 3.25 1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ApplePaySvgIcon;
/* prettier-ignore-end */
