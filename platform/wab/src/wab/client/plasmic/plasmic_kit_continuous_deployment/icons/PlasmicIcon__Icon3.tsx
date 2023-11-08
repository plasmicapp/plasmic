// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon3IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon3Icon(props: Icon3IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 36 36"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M36 32a4 4 0 01-4 4H4a4 4 0 01-4-4V4a4 4 0 014-4h28a4 4 0 014 4v28z"
        }
        fill={"#3B88C3"}
      ></path>

      <path d={"M7 14h9V7l13 11-13 11v-7H7v-8z"} fill={"#fff"}></path>
    </svg>
  );
}

export default Icon3Icon;
/* prettier-ignore-end */
