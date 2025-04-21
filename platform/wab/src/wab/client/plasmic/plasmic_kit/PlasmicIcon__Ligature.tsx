/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type LigatureIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function LigatureIcon(props: LigatureIconProps) {
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
          "M9 7.5a2 2 0 012-2h2a2 2 0 012 2V8a1 1 0 102 0v-.5a4 4 0 00-4-4h-2a4 4 0 00-4 4V11H5v2h2v6H5v2h6v-2H9v-6h6v6h-2v2h6v-2h-2v-8H9V7.5z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default LigatureIcon;
/* prettier-ignore-end */
