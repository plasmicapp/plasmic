/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type HandIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HandIcon(props: HandIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={
          "M13.5 3a1 1 0 10-2 0v7.84l-1.716-.657-.793-5.818a1 1 0 00-1.982.27l1.304 9.563.086 1.284a.75.75 0 01-1.165.674l-2.177-1.451a1.55 1.55 0 00-1.955.193.775.775 0 00.054 1.145l4.884 4.04a4 4 0 002.55.917h4.29a4 4 0 003.879-3.027l.742-2.961 1.588-5.746a1 1 0 10-1.928-.532l-1.259 4.557-1.448-.555 1.037-7.6a1 1 0 00-1.982-.271l-.973 7.137-1.036-.397V3z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default HandIcon;
/* prettier-ignore-end */
