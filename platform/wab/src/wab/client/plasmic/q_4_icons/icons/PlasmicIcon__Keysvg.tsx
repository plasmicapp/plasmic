// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type KeysvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function KeysvgIcon(props: KeysvgIconProps) {
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
          "M15 13.25a4.25 4.25 0 10-4.154-3.346L4.75 16v3.25H8l.75-.75v-1.75h1.75l1.25-1.25v-1.75h1.75l.596-.596c.291.063.594.096.904.096z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        d={"M16.5 8a.5.5 0 11-1 0 .5.5 0 011 0z"}
      ></path>
    </svg>
  );
}

export default KeysvgIcon;
/* prettier-ignore-end */
