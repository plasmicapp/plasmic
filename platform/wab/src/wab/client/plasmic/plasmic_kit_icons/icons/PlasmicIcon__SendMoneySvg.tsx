// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SendMoneySvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SendMoneySvgIcon(props: SendMoneySvgIconProps) {
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
          "M7.75 10.75a2 2 0 012-2h4.5a2 2 0 012 2v6.5a2 2 0 01-2 2h-4.5a2 2 0 01-2-2v-6.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M19.25 10.25v-3.5a2 2 0 00-2-2H6.75a2 2 0 00-2 2v3.5m8.5 3.75a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SendMoneySvgIcon;
/* prettier-ignore-end */
