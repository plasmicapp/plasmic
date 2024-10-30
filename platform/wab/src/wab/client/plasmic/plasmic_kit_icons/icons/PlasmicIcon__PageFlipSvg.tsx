// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type PageFlipSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PageFlipSvgIcon(props: PageFlipSvgIconProps) {
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
          "M12 19.25c-4 0-7.25-2-7.25-2V5.75s3.75 1 7.25 1v12.5zm0 0c4 0 7.25-2 7.25-2V5.75"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={"M12 6.75c2.5 0 4.25-2 4.25-2V17S14.5 19 12 19"}
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PageFlipSvgIcon;
/* prettier-ignore-end */
