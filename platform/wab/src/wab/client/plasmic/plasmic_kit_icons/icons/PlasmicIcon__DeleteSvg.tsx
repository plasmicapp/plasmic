// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type DeleteSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function DeleteSvgIcon(props: DeleteSvgIconProps) {
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
          "M10.75 9.75L13 12m0 0l2.25 2.25M13 12l2.25-2.25M13 12l-2.25 2.25m-6-2.25l3.41 5.328a2 2 0 001.685.922h7.405a2 2 0 002-2v-8.5a2 2 0 00-2-2H9.845a2 2 0 00-1.685.922L4.75 12z"
        }
      ></path>
    </svg>
  );
}

export default DeleteSvgIcon;
/* prettier-ignore-end */
