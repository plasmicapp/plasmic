// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HubspotsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HubspotsvgIcon(props: HubspotsvgIconProps) {
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
        d={"M15.25 12a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0zM9.5 14.5L5 19"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M6.5 18.5a1 1 0 11-2 0 1 1 0 012 0zm0-13a1 1 0 11-2 0 1 1 0 012 0zm6.5 0a1 1 0 11-2 0 1 1 0 012 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12 8.5V5M9.5 9.5l-4-4"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default HubspotsvgIcon;
/* prettier-ignore-end */
