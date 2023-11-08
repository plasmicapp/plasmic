// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MenusvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MenusvgIcon(props: MenusvgIconProps) {
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
        d={"M4.75 5.75h14.5m-14.5 12.5h14.5M4.75 12h14.5"}
      ></path>
    </svg>
  );
}

export default MenusvgIcon;
/* prettier-ignore-end */
