/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type VerifiedSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function VerifiedSvgIcon(props: VerifiedSvgIconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"1.5"}
        d={
          "M9.75 12.75l1.5 1.5c.75-2.75 3-4.5 3-4.5m-4.713 8.197c-.986.143-1.967-.124-2.664-.82-.696-.697-.963-1.678-.82-2.664C5.255 13.867 4.75 12.985 4.75 12c0-.985.505-1.867 1.303-2.463-.142-.986.124-1.967.82-2.663.697-.697 1.678-.963 2.664-.82.596-.799 1.478-1.304 2.463-1.304.985 0 1.867.505 2.463 1.304.986-.143 1.967.123 2.664.82.696.696.963 1.677.82 2.663.798.596 1.303 1.478 1.303 2.463 0 .985-.505 1.867-1.303 2.463.143.986-.124 1.967-.82 2.664-.697.696-1.678.963-2.664.82-.596.798-1.478 1.303-2.463 1.303-.985 0-1.867-.505-2.463-1.303z"
        }
      ></path>
    </svg>
  );
}

export default VerifiedSvgIcon;
/* prettier-ignore-end */
