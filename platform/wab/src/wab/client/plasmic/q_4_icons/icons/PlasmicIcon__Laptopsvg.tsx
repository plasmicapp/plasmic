// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type LaptopsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LaptopsvgIcon(props: LaptopsvgIconProps) {
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
          "M5.75 5.75a1 1 0 011-1h10.5a1 1 0 011 1v8.5H5.75v-8.5zm12.5 8.75l.746 3.544a1 1 0 01-.979 1.206H5.982a1 1 0 01-.978-1.206L5.75 14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LaptopsvgIcon;
/* prettier-ignore-end */
