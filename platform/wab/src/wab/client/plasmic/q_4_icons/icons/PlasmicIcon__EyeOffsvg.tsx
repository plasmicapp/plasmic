// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type EyeOffsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EyeOffsvgIcon(props: EyeOffsvgIconProps) {
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
          "M18.625 10c.44.899.625 1.675.625 2 0 1-1.75 6.25-7.25 6.25a7.621 7.621 0 01-2-.256m-3-1.725C5.362 14.669 4.75 12.59 4.75 12c0-1 1.75-6.25 7.25-6.25 1.795 0 3.19.559 4.256 1.347M19.25 4.75l-14.5 14.5m5.659-5.659a2.25 2.25 0 013.182-3.182"
        }
      ></path>
    </svg>
  );
}

export default EyeOffsvgIcon;
/* prettier-ignore-end */
