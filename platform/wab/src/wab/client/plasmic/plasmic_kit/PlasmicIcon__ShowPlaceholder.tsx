/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ShowPlaceholderIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ShowPlaceholderIcon(props: ShowPlaceholderIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 18 18"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M0 4a4 4 0 014-4v2a2 2 0 00-2 2H0zm2 10H0a4 4 0 004 4v-2a2 2 0 01-2-2zm12 2v2a4 4 0 004-4h-2a2 2 0 01-2 2zm2-12h2a4 4 0 00-4-4v2a2 2 0 012 2zM0 7h2v4H0V7zm11-7H7v2h4V0zM7 16h4v2H7v-2zm11-9h-2v4h2V7z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default ShowPlaceholderIcon;
/* prettier-ignore-end */
