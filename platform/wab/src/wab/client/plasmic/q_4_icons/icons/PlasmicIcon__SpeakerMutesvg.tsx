// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type SpeakerMutesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SpeakerMutesvgIcon(props: SpeakerMutesvgIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      width={"1em"}
      style={{
        stroke: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M19.25 14.25l-3.5-3.5m0 3.5l3.5-3.5m-6-6l-4.75 4H5.75a1 1 0 00-1 1v4.5a1 1 0 001 1H8.5l4.75 4V4.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default SpeakerMutesvgIcon;
/* prettier-ignore-end */
