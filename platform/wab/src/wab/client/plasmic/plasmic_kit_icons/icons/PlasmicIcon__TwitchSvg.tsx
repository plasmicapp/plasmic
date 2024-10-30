// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TwitchSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TwitchSvgIcon(props: TwitchSvgIconProps) {
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
          "M18.25 4.75H5.75a1 1 0 00-1 1v9.5a1 1 0 001 1h2v3l3.25-3h6L19.25 14V5.75a1 1 0 00-1-1zm-3 5v2.5m-4-2.5v2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TwitchSvgIcon;
/* prettier-ignore-end */
