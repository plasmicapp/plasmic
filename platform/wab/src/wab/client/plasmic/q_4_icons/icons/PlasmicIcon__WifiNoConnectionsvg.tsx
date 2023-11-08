// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WifiNoConnectionsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WifiNoConnectionsvgIcon(props: WifiNoConnectionsvgIconProps) {
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

      <circle cx={"12"} cy={"18"} r={"1"} fill={"currentColor"}></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M9.5 14.563a4.231 4.231 0 012.5-.813c.934 0 1.798.302 2.5.813m2.213-3.335a8.213 8.213 0 00-2.534-1.187m-6.891 1.187a8.206 8.206 0 013.058-1.312M4.75 8.25C6.734 6.866 9 5.75 12 5.75c.688 0 1.336.059 1.952.166M19.25 8.25a17.161 17.161 0 00-1.915-1.171m.915-1.329l-11.5 11.5"
        }
      ></path>
    </svg>
  );
}

export default WifiNoConnectionsvgIcon;
/* prettier-ignore-end */
