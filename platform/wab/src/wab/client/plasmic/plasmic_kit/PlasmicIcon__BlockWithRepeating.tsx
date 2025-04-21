/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type BlockWithRepeatingIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BlockWithRepeatingIcon(props: BlockWithRepeatingIconProps) {
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
          "M5 5v14h14V5H5zM4 3a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H4z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2zm4-8h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2z"
        }
      ></path>
    </svg>
  );
}

export default BlockWithRepeatingIcon;
/* prettier-ignore-end */
