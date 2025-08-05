/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SquareCheckFilledSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SquareCheckFilledSvgIcon(props: SquareCheckFilledSvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M6.75 4A2.75 2.75 0 004 6.75v10.5A2.75 2.75 0 006.75 20h10.5A2.75 2.75 0 0020 17.25V6.75A2.75 2.75 0 0017.25 4H6.75zm9.045 6.265a.75.75 0 00-1.09-1.03l-3.72 3.939L9.28 11.47a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.075-.015l4.25-4.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default SquareCheckFilledSvgIcon;
/* prettier-ignore-end */
