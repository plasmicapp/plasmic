// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type TriangleFilledIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TriangleFilledIcon(props: TriangleFilledIconProps) {
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
        d={
          "M12 1.67a2.914 2.914 0 00-2.492 1.403L1.398 16.61a2.914 2.914 0 002.484 4.385h16.225a2.914 2.914 0 002.503-4.371L14.494 3.078A2.917 2.917 0 0012 1.67z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default TriangleFilledIcon;
/* prettier-ignore-end */
