/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LetterSpacingSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LetterSpacingSvgIcon(props: LetterSpacingSvgIconProps) {
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
          "M4.75 13.25L8 4.75l3.25 8.5m-5.25-3h4m8.25.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-4.5-6.25v8.5m4 6l1.5-1.25-1.5-1.25m-11.5 2.5L4.75 18l1.5-1.25M19 18H5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default LetterSpacingSvgIcon;
/* prettier-ignore-end */
