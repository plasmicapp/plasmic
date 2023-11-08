// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FilmsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FilmsvgIcon(props: FilmsvgIconProps) {
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
          "M4.75 6.75a2 2 0 012-2h10.5a2 2 0 012 2v10.5a2 2 0 01-2 2H6.75a2 2 0 01-2-2V6.75zm3-1.75v14m8.5-14v14M5 8.75h2.5m9.5 0h2M5 12h14M5 15.25h2.5m9.5 0h2"
        }
      ></path>
    </svg>
  );
}

export default FilmsvgIcon;
/* prettier-ignore-end */
