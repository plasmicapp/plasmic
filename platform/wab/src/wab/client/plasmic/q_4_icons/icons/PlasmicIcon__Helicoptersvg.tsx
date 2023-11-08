// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HelicoptersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HelicoptersvgIcon(props: HelicoptersvgIconProps) {
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
          "M10.75 7.75h6.5a2 2 0 012 2v4.5a2 2 0 01-2 2h-4.5a2 2 0 01-2-2v-6.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M14 16.5v2.75h-3.25a4 4 0 01-4-4v-.5m5.25-7H4.75v1.5l5.5 2M12 7.5V5m-4-.25h8m-2 14.5h2.25"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default HelicoptersvgIcon;
/* prettier-ignore-end */
