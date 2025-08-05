/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PaletteIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PaletteIcon(props: PaletteIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 64 64"}
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
          "M32.01 8.021c13.256 0 24 10.746 24 24 0 6.617-5.979 11-13 11h-5c-1.768 0-4 .324-4 3 0 2.627 2 4.28 2 7 0 1.617-1.272 3-4 3-13.254 0-24-10.745-24-24 0-13.254 10.746-24 24-24zm13.5 27a4.5 4.5 0 10-4.5-4.5 4.5 4.5 0 004.5 4.5zm-6.999-11a4.5 4.5 0 10-4.5-4.5 4.5 4.5 0 004.5 4.5zm-13 0a4.5 4.5 0 10-4.5-4.5 4.5 4.5 0 004.5 4.5zm-11.5 6.5a4.5 4.5 0 109.002.003 4.5 4.5 0 00-9.003-.004v.001h.001z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default PaletteIcon;
/* prettier-ignore-end */
