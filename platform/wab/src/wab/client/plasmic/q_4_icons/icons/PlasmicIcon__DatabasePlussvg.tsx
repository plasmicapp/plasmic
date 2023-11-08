// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DatabasePlussvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DatabasePlussvgIcon(props: DatabasePlussvgIconProps) {
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
          "M19.25 7c0 1.105-3.384 2.25-7.25 2.25S4.75 8.105 4.75 7 8.134 4.75 12 4.75 19.25 5.895 19.25 7zm-7 7.25c-3.866 0-7.5-1.145-7.5-2.25m14.5.25V7"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M12.25 19.25c-3.866 0-7.5-1.145-7.5-2.25V7M17 14.75v4.5M19.25 17h-4.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DatabasePlussvgIcon;
/* prettier-ignore-end */
