/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type IconIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function IconIcon(props: IconIconProps) {
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
          "M5.5 12a6.5 6.5 0 0112.757-1.765L17.154 8.95a2.75 2.75 0 00-4.24.083l-.016.02c-.079.102-1.093 1.414-2.028 2.61a2.75 2.75 0 00-3.963.38l-1.212 1.54A6.514 6.514 0 015.5 12zm.838 3.194a6.501 6.501 0 0012.118-2.428.779.779 0 01-.025-.027l-2.414-2.81a1.25 1.25 0 00-1.928.037l-.004.006c-.083.107-1.22 1.577-2.2 2.83l1.684 1.96a.75.75 0 11-1.138.977l-2.076-2.417a.795.795 0 01-.019-.022l-.32-.372a1.25 1.25 0 00-1.93.042l-1.748 2.224zM12 4a8 8 0 100 16 8 8 0 000-16z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default IconIcon;
/* prettier-ignore-end */
