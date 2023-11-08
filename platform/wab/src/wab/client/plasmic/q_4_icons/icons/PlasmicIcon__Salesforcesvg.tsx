// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SalesforcesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SalesforcesvgIcon(props: SalesforcesvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M8 17.25a3.23 3.23 0 001.83-.564 2.75 2.75 0 004.111-.92 2.75 2.75 0 004.28-1.877 2.25 2.25 0 00-2.038-3.987 2.75 2.75 0 00-4.387-1.56 3.25 3.25 0 00-5.734 3.05A3.25 3.25 0 008 17.25z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SalesforcesvgIcon;
/* prettier-ignore-end */
