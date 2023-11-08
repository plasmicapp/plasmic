// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type DropboxsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DropboxsvgIcon(props: DropboxsvgIconProps) {
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
          "M8.75 10L12 7.75 15.25 10 12 12.25 8.75 10zm0 0l-4-3L8 4.75l4 2.75m0 0l4-2.75L19.25 7l-4 3"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M12 12.25l4 3L19.25 13l-4-3m-6.5 0l-4 3L8 15.25l4-3m-3.25 4.5l3.25 2.5 3.25-2.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default DropboxsvgIcon;
/* prettier-ignore-end */
