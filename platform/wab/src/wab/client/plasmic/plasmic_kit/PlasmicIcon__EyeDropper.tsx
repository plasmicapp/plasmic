/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type EyeDropperIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyeDropperIcon(props: EyeDropperIconProps) {
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
          "M12.75 6.75l4.5 4.5m-3.11-3.39l1.696-1.696a1.414 1.414 0 012 2L16.14 9.86m-2.39-2.11l-8 8.25v.25a2 2 0 002 2H8l8.25-8"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default EyeDropperIcon;
/* prettier-ignore-end */
