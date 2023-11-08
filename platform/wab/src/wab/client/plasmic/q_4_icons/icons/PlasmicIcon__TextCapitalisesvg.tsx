// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TextCapitalisesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TextCapitalisesvgIcon(props: TextCapitalisesvgIconProps) {
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
          "M4.75 17.25L8 6.75l3.25 10.5m-5.25-3h4m9.25.25a2.75 2.75 0 11-5.5 0 2.75 2.75 0 015.5 0zm0-2.75v5.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TextCapitalisesvgIcon;
/* prettier-ignore-end */
