// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UmbrellasvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UmbrellasvgIcon(props: UmbrellasvgIconProps) {
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
          "M12 13.5v4.125a1.625 1.625 0 11-3.25 0v-.875m3.25-12v.5m0 .5c-4.004 0-7.25 2.496-7.25 6.5 0 0 2.75 1 7.25 1s7.25-1 7.25-1c0-4.004-3.246-6.5-7.25-6.5zm0 0S8.75 8.5 8.75 13M12 5.75S15.25 8.5 15.25 13"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default UmbrellasvgIcon;
/* prettier-ignore-end */
