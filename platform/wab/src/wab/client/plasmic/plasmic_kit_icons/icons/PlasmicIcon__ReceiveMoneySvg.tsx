/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ReceiveMoneySvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ReceiveMoneySvgIcon(props: ReceiveMoneySvgIconProps) {
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
          "M4.75 10.75a2 2 0 012-2h10.5a2 2 0 012 2v6.5a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-6.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M14.25 14a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-6.5-9.25v1.5M12 4.75v1.5m4.25-1.5v1.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ReceiveMoneySvgIcon;
/* prettier-ignore-end */
