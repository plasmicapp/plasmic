/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Star2IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Star2Icon(props: Star2IconProps) {
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
          "M12 4.75C12 8.917 8.917 12 4.75 12 8.917 12 12 15.083 12 19.25c0-4.167 3.083-7.25 7.25-7.25C15.083 12 12 8.917 12 4.75z"
        }
        stroke={"currentColor"}
        strokeWidth={"1.5"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
      ></path>
    </svg>
  );
}

export default Star2Icon;
/* prettier-ignore-end */
