// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type InboxsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function InboxsvgIcon(props: InboxsvgIconProps) {
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
          "M19.25 11.75L17.664 6.2a2 2 0 00-1.923-1.45H8.26A2 2 0 006.336 6.2L4.75 11.75m5.464.619c-.258-.336-.62-.619-1.043-.619H4.75v5.5a2 2 0 002 2h10.5a2 2 0 002-2v-5.5h-4.42c-.425 0-.786.283-1.044.619A2.246 2.246 0 0112 13.25a2.246 2.246 0 01-1.786-.881z"
        }
      ></path>
    </svg>
  );
}

export default InboxsvgIcon;
/* prettier-ignore-end */
