// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UserssvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UserssvgIcon(props: UserssvgIconProps) {
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
          "M5.782 19.25h7.436c.565 0 1.009-.468.896-1.021C13.804 16.7 12.79 14 9.5 14s-4.304 2.701-4.615 4.229c-.112.553.332 1.021.897 1.021zM15.75 14c2.079 0 2.93 2.148 3.274 3.696.185.836-.49 1.554-1.347 1.554h-.927"
        }
      ></path>

      <circle
        cx={"9.5"}
        cy={"7.5"}
        r={"2.75"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M14.75 10.25c1.519 0 2.5-1.231 2.5-2.75s-.981-2.75-2.5-2.75"}
      ></path>
    </svg>
  );
}

export default UserssvgIcon;
/* prettier-ignore-end */
