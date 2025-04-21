/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TextInputIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TextInputIcon(props: TextInputIconProps) {
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
          "M15.75 7.75h1.5a2 2 0 012 2v4.5a2 2 0 01-2 2h-1.5m-7.5 0h-1.5a2 2 0 01-2-2v-4.5a2 2 0 012-2h1.5m2.5-3h2.5m-2.5 14.5h2.5M12 5v14"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TextInputIcon;
/* prettier-ignore-end */
