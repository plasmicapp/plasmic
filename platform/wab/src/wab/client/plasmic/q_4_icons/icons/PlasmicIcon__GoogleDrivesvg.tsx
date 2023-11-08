// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type GoogleDrivesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GoogleDrivesvgIcon(props: GoogleDrivesvgIconProps) {
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
        d={"M9 4.75L4.75 15 7 19.25"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M9 4.75h6L19.256 15 17 19.25H7M13.75 5L12 8.77m0 0L7.25 19M12 8.77L10.25 5M12 8.77L16.75 19M5 15.25h14"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default GoogleDrivesvgIcon;
/* prettier-ignore-end */
