// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type FiltersvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FiltersvgIcon(props: FiltersvgIconProps) {
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
          "M19.25 4.75H4.75l4.562 5.702a2 2 0 01.438 1.25v6.548a1 1 0 001 1h2.5a1 1 0 001-1v-6.548a2 2 0 01.438-1.25L19.25 4.75z"
        }
      ></path>
    </svg>
  );
}

export default FiltersvgIcon;
/* prettier-ignore-end */
