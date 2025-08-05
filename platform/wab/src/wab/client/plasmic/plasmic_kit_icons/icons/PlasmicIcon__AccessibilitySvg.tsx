/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AccessibilitySvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AccessibilitySvgIcon(props: AccessibilitySvgIconProps) {
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
          "M12 10.75v2.5m0-2.5H8.75m3.25 0h3.25M12 13.25l-2.25 3m2.25-3l2.25 3m5-4.25a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12.5 8a.5.5 0 11-1 0 .5.5 0 011 0z"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AccessibilitySvgIcon;
/* prettier-ignore-end */
