// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type ThemeIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ThemeIcon(props: ThemeIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={"0 0 20 20"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={"M10 3a7 7 0 110 14zm0-1a8 8 0 100 16 8 8 0 000-16"}
      ></path>
    </svg>
  );
}

export default ThemeIcon;
/* prettier-ignore-end */
