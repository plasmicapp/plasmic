/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type AnimationsIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function AnimationsIcon(props: AnimationsIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
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
        d={
          "M6.15 12.275a1.06 1.06 0 0 1-.817.392c-.312 0-.609-.143-.816-.392L1.609 8.776a1.23 1.23 0 0 1 0-1.552l2.908-3.499a1.06 1.06 0 0 1 .816-.392c.312 0 .61.143.817.392l2.907 3.499a1.23 1.23 0 0 1 0 1.552zm5.183-8.942 3.058 3.891a1.23 1.23 0 0 1 0 1.552l-3.058 3.89"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        d={"m8.667 3.333 3.057 3.891a1.23 1.23 0 0 1 0 1.552l-3.057 3.89"}
      ></path>
    </svg>
  );
}

export default AnimationsIcon;
/* prettier-ignore-end */
