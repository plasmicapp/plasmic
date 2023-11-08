// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type StarsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function StarsvgIcon(props: StarsvgIconProps) {
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
          "M12 4.75l1.75 5.5h5.5l-4.5 3.5 1.5 5.5-4.25-3.5-4.25 3.5 1.5-5.5-4.5-3.5h5.5L12 4.75z"
        }
      ></path>
    </svg>
  );
}

export default StarsvgIcon;
/* prettier-ignore-end */
