/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type GraphqlIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GraphqlIcon(props: GraphqlIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={"0 0 400 400"}
      height={"1em"}
      width={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {}),
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={"M57.468 302.66l-14.376-8.3 160.15-277.38 14.376 8.3z"}
      ></path>

      <path fill={"currentColor"} d={"M39.8 272.2h320.3v16.6H39.8z"}></path>

      <path
        fill={"currentColor"}
        d={
          "M206.348 374.026l-160.21-92.5 8.3-14.376 160.21 92.5zm139.174-241.079l-160.21-92.5 8.3-14.376 160.21 92.5z"
        }
      ></path>

      <path
        fill={"currentColor"}
        d={"M54.482 132.883l-8.3-14.375 160.21-92.5 8.3 14.376z"}
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M342.568 302.663l-160.15-277.38 14.376-8.3 160.15 277.38zM52.5 107.5h16.6v185H52.5z"
        }
      ></path>

      <path fill={"currentColor"} d={"M330.9 107.5h16.6v185h-16.6z"}></path>

      <path
        fill={"currentColor"}
        d={"M203.522 367l-7.25-12.558 139.34-80.45 7.25 12.557z"}
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M369.5 297.9c-9.6 16.7-31 22.4-47.7 12.8-16.7-9.6-22.4-31-12.8-47.7 9.6-16.7 31-22.4 47.7-12.8 16.8 9.7 22.5 31 12.8 47.7M90.9 137c-9.6 16.7-31 22.4-47.7 12.8-16.7-9.6-22.4-31-12.8-47.7 9.6-16.7 31-22.4 47.7-12.8 16.7 9.7 22.4 31 12.8 47.7M30.5 297.9c-9.6-16.7-3.9-38 12.8-47.7 16.7-9.6 38-3.9 47.7 12.8 9.6 16.7 3.9 38-12.8 47.7-16.8 9.6-38.1 3.9-47.7-12.8M309.1 137c-9.6-16.7-3.9-38 12.8-47.7 16.7-9.6 38-3.9 47.7 12.8 9.6 16.7 3.9 38-12.8 47.7-16.7 9.6-38.1 3.9-47.7-12.8M200 395.8c-19.3 0-34.9-15.6-34.9-34.9 0-19.3 15.6-34.9 34.9-34.9 19.3 0 34.9 15.6 34.9 34.9 0 19.2-15.6 34.9-34.9 34.9M200 74c-19.3 0-34.9-15.6-34.9-34.9 0-19.3 15.6-34.9 34.9-34.9 19.3 0 34.9 15.6 34.9 34.9 0 19.3-15.6 34.9-34.9 34.9"
        }
      ></path>
    </svg>
  );
}

export default GraphqlIcon;
/* prettier-ignore-end */
