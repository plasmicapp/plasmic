// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DrillsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DrillsvgIcon(props: DrillsvgIconProps) {
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
          "M4.75 5.75a1 1 0 011-1h8.5v6.5h-8.5a1 1 0 01-1-1v-4.5zm7.5 5.75l-.887 6.878a1 1 0 01-.992.872H7.887a1 1 0 01-.991-1.128L7.75 11.5m6.5-6.75l3 2v2.5l-3 2M17.5 8h1.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DrillsvgIcon;
/* prettier-ignore-end */
