// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Sunrise2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Sunrise2SvgIcon(props: Sunrise2SvgIconProps) {
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
          "M4.74 16.25h14.51m-5-5.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-7.51 8.25h10.51M12 4.75v.5m4.42 1.33l-.354.354M18.25 11h-.5m-11.5 0h-.5m2.184-4.066l-.353-.353"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Sunrise2SvgIcon;
/* prettier-ignore-end */
