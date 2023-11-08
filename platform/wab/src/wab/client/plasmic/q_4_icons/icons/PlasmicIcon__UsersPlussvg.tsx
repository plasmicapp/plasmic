// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UsersPlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UsersPlussvgIcon(props: UsersPlussvgIconProps) {
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
          "M17 14.75v4.5m-5.75 0H5.782c-.565 0-1.009-.468-.897-1.021C5.196 16.7 6.21 14 9.5 14c.674 0 1.253.056 1.75.25m8 2.75h-4.5m0-6.75c1.519 0 2.5-1.231 2.5-2.75s-.981-2.75-2.5-2.75m-2.5 2.75a2.75 2.75 0 11-5.5 0 2.75 2.75 0 015.5 0z"
        }
      ></path>
    </svg>
  );
}

export default UsersPlussvgIcon;
/* prettier-ignore-end */
