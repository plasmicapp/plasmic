// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type AtSignsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AtSignsvgIcon(props: AtSignsvgIconProps) {
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

      <circle
        cx={"12"}
        cy={"12"}
        r={"3.25"}
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
      ></circle>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M12 19.25a7.25 7.25 0 110-14.5c6.813 0 7.25 4.375 7.25 7.25v1.25a2 2 0 01-2 2v0a2 2 0 01-2-2v-4.5"
        }
      ></path>
    </svg>
  );
}

export default AtSignsvgIcon;
/* prettier-ignore-end */
