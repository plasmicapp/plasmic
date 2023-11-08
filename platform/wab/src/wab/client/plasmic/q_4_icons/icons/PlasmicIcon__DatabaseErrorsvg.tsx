// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DatabaseErrorsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DatabaseErrorsvgIcon(props: DatabaseErrorsvgIconProps) {
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
          "M19.25 7c0 1.105-3.384 2.25-7.25 2.25S4.75 8.105 4.75 7 8.134 4.75 12 4.75 19.25 5.895 19.25 7zm0 3.25V7M4.75 17V7m4.5 7.061C7 14 4.75 12.834 4.75 12m4.5 7.25C7 19.189 4.75 17.834 4.75 17m14.5-1a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0zM14 14l4 4"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DatabaseErrorsvgIcon;
/* prettier-ignore-end */
