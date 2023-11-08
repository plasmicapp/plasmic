// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type BallotBoxsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function BallotBoxsvgIcon(props: BallotBoxsvgIconProps) {
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
          "M16.75 4.75h.642a1 1 0 01.989.848l.869 5.652H4.75l.87-5.652a1 1 0 01.988-.848h.642m-2.5 6.5h14.5v6a2 2 0 01-2 2H6.75a2 2 0 01-2-2v-6z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M9.75 8.25h4.5m-4.5 0v-2.5a1 1 0 011-1h2.5a1 1 0 011 1v2.5m-4.5 0h-2m6.5 0h2"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default BallotBoxsvgIcon;
/* prettier-ignore-end */
