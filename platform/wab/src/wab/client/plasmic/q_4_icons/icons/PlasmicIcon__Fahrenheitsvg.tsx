// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FahrenheitsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FahrenheitsvgIcon(props: FahrenheitsvgIconProps) {
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
          "M19.25 6.5a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0zM4.75 19.25V7.75a3 3 0 013-3h4.5m-7.25 7h5.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default FahrenheitsvgIcon;
/* prettier-ignore-end */
