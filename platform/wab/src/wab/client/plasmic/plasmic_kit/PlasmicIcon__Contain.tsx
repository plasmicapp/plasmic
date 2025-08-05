/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ContainIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ContainIcon(props: ContainIconProps) {
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
          "M13 8H5v8h1.24l5.046-5.045L13 12.67V8zm-4.571 2.571a.857.857 0 11-1.715 0 .857.857 0 011.715 0z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>

      <path
        fill={"currentColor"}
        d={"M13 14.286l-1.714-1.715L7.857 16H13v-1.714z"}
      ></path>

      <path
        fill={"currentColor"}
        d={"M2 5h20v14H2V5zm19 1v12H3V6h18z"}
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default ContainIcon;
/* prettier-ignore-end */
