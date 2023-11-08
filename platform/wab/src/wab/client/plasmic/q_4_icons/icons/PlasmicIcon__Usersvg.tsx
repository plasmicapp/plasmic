// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type UsersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UsersvgIcon(props: UsersvgIconProps) {
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

      <circle
        cx={"12"}
        cy={"8"}
        r={"3.25"}
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
        d={
          "M6.848 19.25h10.305c1.141 0 2.021-.982 1.488-1.992C17.856 15.773 16.068 14 12 14s-5.856 1.773-6.64 3.258c-.534 1.01.346 1.992 1.487 1.992z"
        }
      ></path>
    </svg>
  );
}

export default UsersvgIcon;
/* prettier-ignore-end */
