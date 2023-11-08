// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BallotsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BallotsvgIcon(props: BallotsvgIconProps) {
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
          "M5.62 5.598a1 1 0 01.988-.848h10.784a1 1 0 01.989.848l.869 5.652H4.75l.87-5.652zm-.87 5.652h14.5v6a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-6zM10 7.75h4"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BallotsvgIcon;
/* prettier-ignore-end */
