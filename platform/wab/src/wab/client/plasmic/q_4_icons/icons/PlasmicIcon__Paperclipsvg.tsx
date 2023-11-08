// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type PaperclipsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function PaperclipsvgIcon(props: PaperclipsvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M19.25 11.951l-6.116 5.91c-1.918 1.852-5.028 1.852-6.946 0a4.632 4.632 0 01.018-6.729L8.36 9.075m0 0l.493-.471m-.493.47l3.491-3.372c1.313-1.268 3.44-1.268 4.752 0a3.17 3.17 0 01-.012 4.603L13.353 13.4M8.36 9.075l-.417.403m5.41 3.922l.367-.354m-.367.354l-2.47 2.387a1.86 1.86 0 01-2.565 0 1.711 1.711 0 010-2.479l4.727-4.566"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default PaperclipsvgIcon;
/* prettier-ignore-end */
