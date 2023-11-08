// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AnchorsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AnchorsvgIcon(props: AnchorsvgIconProps) {
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
          "M12 19.25V9.5M14.25 7a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm5 7c-.5 3-3.94 5.25-7.25 5.25S5.25 17 4.75 14m5-1.75h4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default AnchorsvgIcon;
/* prettier-ignore-end */
