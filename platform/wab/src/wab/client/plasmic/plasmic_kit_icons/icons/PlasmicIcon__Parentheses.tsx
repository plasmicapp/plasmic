/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ParenthesesIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ParenthesesIcon(props: ParenthesesIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
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
          "M9.25 4.75c-1.5 2-2.5 4.5-2.5 7.25s1 5.25 2.5 7.25m5.5-14.5c1.5 2 2.5 4.5 2.5 7.25s-1 5.25-2.5 7.25"
        }
      ></path>
    </svg>
  );
}

export default ParenthesesIcon;
/* prettier-ignore-end */
