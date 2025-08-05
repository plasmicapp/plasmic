/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LetterSpacingIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LetterSpacingIcon(props: LetterSpacingIconProps) {
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
          "M19.25 4.75v14.5m-11.5-3l1.5-3m0 0L12 7.75l2.75 5.5m-5.5 0h5.5m0 0l1.5 3M4.75 4.75v14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LetterSpacingIcon;
/* prettier-ignore-end */
