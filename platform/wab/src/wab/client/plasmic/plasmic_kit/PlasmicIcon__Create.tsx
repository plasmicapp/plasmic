/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type CreateIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function CreateIcon(props: CreateIconProps) {
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
          "M18.953 2.927a1 1 0 011.414 0l.707.707a1 1 0 010 1.414l-8.485 8.486-2.121-2.122 8.485-8.485zm-9.9 9.9l2.122 2.12-2.676 1.217a.5.5 0 01-.662-.662l1.216-2.675z"
        }
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M14.052 5H4a1 1 0 00-1 1v14a1 1 0 001 1h14a1 1 0 001-1V9.951l-2 2V19H5V7h7.052l2-2z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default CreateIcon;
/* prettier-ignore-end */
