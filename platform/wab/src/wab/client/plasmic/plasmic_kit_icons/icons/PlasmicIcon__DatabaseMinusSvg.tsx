/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DatabaseMinusSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DatabaseMinusSvgIcon(props: DatabaseMinusSvgIconProps) {
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
          "M19.25 7c0 1.105-3.384 2.25-7.25 2.25S4.75 8.105 4.75 7 8.134 4.75 12 4.75 19.25 5.895 19.25 7zm-7 7.25c-3.866 0-7.5-1.145-7.5-2.25m14.5 1.25V7"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12.25 19.25c-3.866 0-7.5-1.145-7.5-2.25V7m14.5 10h-3.5"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DatabaseMinusSvgIcon;
/* prettier-ignore-end */
