// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type TrafficLightssvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function TrafficLightssvgIcon(props: TrafficLightssvgIconProps) {
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
          "M8.75 6.75a2 2 0 012-2h2.5a2 2 0 012 2v10.5a2 2 0 01-2 2h-2.5a2 2 0 01-2-2V6.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M12.5 8a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0zm0 4a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>

      <path
        d={
          "M4.75 6.75h4v4.5l-4-4.5zm14.5 0h-4V11l4-4.25zm0 5h-4V16l4-4.25zm-14.5 0h4v4.5l-4-4.5z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default TrafficLightssvgIcon;
/* prettier-ignore-end */
