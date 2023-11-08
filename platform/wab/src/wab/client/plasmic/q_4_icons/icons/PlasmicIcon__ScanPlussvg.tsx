// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ScanPlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ScanPlussvgIcon(props: ScanPlussvgIconProps) {
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
          "M9.25 4.75h-.5a4 4 0 00-4 4v.5m4.5 10h-.5a4 4 0 01-4-4v-.5m10-10h.5a4 4 0 014 4v.5m-4.5 10h.5a4 4 0 004-4v-.5M8.75 12h6.5M12 8.75v6.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ScanPlussvgIcon;
/* prettier-ignore-end */
