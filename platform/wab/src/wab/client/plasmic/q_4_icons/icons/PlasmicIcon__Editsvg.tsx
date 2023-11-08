// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type EditsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function EditsvgIcon(props: EditsvgIconProps) {
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
          "M4.75 19.25l4.25-1 9.293-9.293a1 1 0 000-1.414l-1.836-1.836a1 1 0 00-1.414 0L5.75 15l-1 4.25zm14.5 0h-5.5"
        }
      ></path>
    </svg>
  );
}

export default EditsvgIcon;
/* prettier-ignore-end */
