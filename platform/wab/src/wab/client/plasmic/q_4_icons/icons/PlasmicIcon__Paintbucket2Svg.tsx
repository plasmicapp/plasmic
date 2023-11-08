// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Paintbucket2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Paintbucket2SvgIcon(props: Paintbucket2SvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M7.642 18.377l-2.007-2.008a3 3 0 01-.002-4.24L11 6.75 17.25 13l-5.363 5.374a3 3 0 01-4.245.003zM19.25 18a1.25 1.25 0 11-2.5 0c0-.69.56-2.25 1.25-2.25s1.25 1.56 1.25 2.25zm-7.5-5.75v-7.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Paintbucket2SvgIcon;
/* prettier-ignore-end */
