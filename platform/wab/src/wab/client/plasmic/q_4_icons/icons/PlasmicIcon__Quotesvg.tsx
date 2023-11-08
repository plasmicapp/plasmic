// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type QuotesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function QuotesvgIcon(props: QuotesvgIconProps) {
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
          "M4.75 6.75a2 2 0 012-2h2.5a2 2 0 012 2v2.187a3 3 0 01-.965 2.204L8 13.25v-3H6.75a2 2 0 01-2-2v-1.5zm8 6a2 2 0 012-2h2.5a2 2 0 012 2v2.187a3 3 0 01-.965 2.204L16 19.25v-3h-1.25a2 2 0 01-2-2v-1.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default QuotesvgIcon;
/* prettier-ignore-end */
