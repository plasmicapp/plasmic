/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ButtonInputIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ButtonInputIcon(props: ButtonInputIconProps) {
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
          "M11.813 11.25l.345-5.138a1.276 1.276 0 00-2.54-.235L8.75 13.25l-1.604-1.923a1.605 1.605 0 00-2.388-.085.018.018 0 00-.003.019l1.978 4.87a5 5 0 004.633 3.119h3.884a4 4 0 004-4v-1a3 3 0 00-3-3h-4.437zm-6.563-3h-.5m11 0h.5m-9-3l-.5-.5m8 .5l.5-.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default ButtonInputIcon;
/* prettier-ignore-end */
