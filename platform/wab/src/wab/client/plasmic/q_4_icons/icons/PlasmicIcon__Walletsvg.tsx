// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type WalletsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WalletsvgIcon(props: WalletsvgIconProps) {
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
        d={"M19.25 8.25v9a2 2 0 01-2 2H6.75a2 2 0 01-2-2V6.75"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        d={"M16.5 13a.5.5 0 11-1 0 .5.5 0 011 0z"}
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={"M17.25 8.25H6.5a1.75 1.75 0 110-3.5h8.75a2 2 0 012 2v1.5zm0 0h2"}
      ></path>
    </svg>
  );
}

export default WalletsvgIcon;
/* prettier-ignore-end */
