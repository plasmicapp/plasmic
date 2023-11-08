// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type CarsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CarsvgIcon(props: CarsvgIconProps) {
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
          "M18.25 17.25H5.75a1 1 0 01-1-1v-3.5a2 2 0 012-2h10.5a2 2 0 012 2v3.5a1 1 0 01-1 1z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M8.5 14a.5.5 0 11-1 0 .5.5 0 011 0zm8 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M18.25 10.75H5.75l.721-4.329A2 2 0 018.444 4.75h7.112a2 2 0 011.973 1.671l.721 4.329zm-11.5 7v1.5m10.5-1.5v1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CarsvgIcon;
/* prettier-ignore-end */
