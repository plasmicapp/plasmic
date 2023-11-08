// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HelpCirclesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HelpCirclesvgIcon(props: HelpCirclesvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M19.25 12a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M9.75 10S10 7.75 12 7.75 14.25 9 14.25 10c0 .751-.423 1.503-1.27 1.83-.515.199-.98.618-.98 1.17v.25"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        d={"M12.5 16a.5.5 0 11-1 0 .5.5 0 011 0z"}
      ></path>
    </svg>
  );
}

export default HelpCirclesvgIcon;
/* prettier-ignore-end */
