// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CoinsSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CoinsSvgIcon(props: CoinsSvgIconProps) {
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
          "M8.75 9.25V6.5m10.5 0v4c0 .432-.47.828-1.25 1.133M19.25 6.5c0 .966-2.35 1.75-5.25 1.75S8.75 7.466 8.75 6.5m10.5 0c0-.966-2.35-1.75-5.25-1.75s-5.25.784-5.25 1.75m6.5 7v4c0 .966-2.35 1.75-5.25 1.75s-5.25-.784-5.25-1.75v-4m10.5 0c0 .966-2.35 1.75-5.25 1.75s-5.25-.784-5.25-1.75m10.5 0c0-.966-2.35-1.75-5.25-1.75s-5.25.784-5.25 1.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default CoinsSvgIcon;
/* prettier-ignore-end */
