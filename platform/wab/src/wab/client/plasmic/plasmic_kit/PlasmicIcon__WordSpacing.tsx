/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type WordSpacingIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function WordSpacingIcon(props: WordSpacingIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={
          "M2.473 12L.59 4h2.055l.916 3.892.973-3.65h1.932l.973 3.65L8.355 4h2.055l-1.883 8H6.465L5.5 8.381 4.535 12H2.473zm4.32 9.707a1 1 0 001.414-1.414L6.914 19h10.172l-1.293 1.293a1 1 0 001.414 1.414L20.914 18l-3.707-3.707a1 1 0 00-1.414 1.414L17.086 17H6.914l1.293-1.293a1 1 0 10-1.414-1.414L3.086 18l3.707 3.707zM12.59 4l1.883 8h2.062l.965-3.619.965 3.619h2.062l1.883-8h-2.055l-.916 3.892-.973-3.65h-1.932l-.973 3.65L14.645 4H12.59z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default WordSpacingIcon;
/* prettier-ignore-end */
