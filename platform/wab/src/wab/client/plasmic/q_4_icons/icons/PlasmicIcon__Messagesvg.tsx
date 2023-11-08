// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type MessagesvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MessagesvgIcon(props: MessagesvgIconProps) {
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
          "M12 18.25c3.5 0 7.25-1.75 7.25-6.25S15.5 5.75 12 5.75 4.75 7.5 4.75 12c0 1.03.196 1.916.541 2.67.215.47.336.987.24 1.495l-.262 1.399a1 1 0 001.168 1.167l3.207-.602a2.24 2.24 0 01.764-.003c.527.084 1.062.124 1.592.124z"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        d={
          "M9.5 12a.5.5 0 11-1 0 .5.5 0 011 0zm3 0a.5.5 0 11-1 0 .5.5 0 011 0zm3 0a.5.5 0 11-1 0 .5.5 0 011 0z"
        }
      ></path>
    </svg>
  );
}

export default MessagesvgIcon;
/* prettier-ignore-end */
