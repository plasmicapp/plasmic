/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SmartphoneSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SmartphoneSvgIcon(props: SmartphoneSvgIconProps) {
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
        d={
          "M4.75 6.75a2 2 0 012-2h6.5a2 2 0 012 2v10.5a2 2 0 01-2 2h-6.5a2 2 0 01-2-2V6.75zm5.5 10h-.5m9-2.5s.5-.906.5-2.25c0-1.344-.5-2.25-.5-2.25"
        }
      ></path>
    </svg>
  );
}

export default SmartphoneSvgIcon;
/* prettier-ignore-end */
