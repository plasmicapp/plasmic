// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type NotebooksvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function NotebooksvgIcon(props: NotebooksvgIconProps) {
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
          "M16.25 18.25h-8.5a2 2 0 01-2-2v-9.5a2 2 0 012-2h8.5a2 2 0 012 2v9.5a2 2 0 01-2 2zm-2-9.5h-.5m.5 3h-.5m-4-7v14.5"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default NotebooksvgIcon;
/* prettier-ignore-end */
