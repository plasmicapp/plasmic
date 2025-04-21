/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TokenIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TokenIcon(props: TokenIconProps) {
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
          "M9.5 9C10.764 7.548 12 4.75 12 4.75S13.236 7.548 14.5 9c1.231 1.415 3.75 3 3.75 3s-2.519 1.585-3.75 3c-1.264 1.452-2.5 4.25-2.5 4.25S10.764 16.452 9.5 15c-1.231-1.415-3.75-3-3.75-3s2.519-1.585 3.75-3z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TokenIcon;
/* prettier-ignore-end */
