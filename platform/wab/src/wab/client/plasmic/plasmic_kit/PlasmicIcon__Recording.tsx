/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type RecordingIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function RecordingIcon(props: RecordingIconProps) {
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

      <path fill={"currentColor"} d={"M7.5 11.5v-1h1v1h-1z"}></path>

      <path
        fill={"currentColor"}
        d={
          "M3 12a9 9 0 1118 0 9 9 0 01-18 0zm5.5-2.5h-2v5h1v-2l1.15 2h1.16l-1.17-2.03a.99.99 0 00.86-.97v-1a1 1 0 00-1-1zm5 0h-2a1 1 0 00-1 1v3a1 1 0 001 1h2v-1h-2v-1h2v-1h-2v-1h2v-1zm4 0h-2a1 1 0 00-1 1v3a1 1 0 001 1h2v-1h-2v-3h2v-1z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default RecordingIcon;
/* prettier-ignore-end */
