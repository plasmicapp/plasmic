/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ShieldSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShieldSvgIcon(props: ShieldSvgIconProps) {
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
        d={"M12 4.75L4.75 8S4 19.25 12 19.25 19.25 8 19.25 8L12 4.75z"}
      ></path>
    </svg>
  );
}

export default ShieldSvgIcon;
/* prettier-ignore-end */
