// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon2IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon2Icon(props: Icon2IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 36 36"}
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
        d={
          "M15 9l6-6s6-6 12 0 0 12 0 12l-8 8s-6 6-12 0c-1.125-1.125-1.822-2.62-1.822-2.62l3.353-3.348S14.396 18.396 16 20c0 0 3 3 6 0l8-8s3-3 0-6-6 0-6 0l-3.729 3.729s-1.854-1.521-5.646-.354L15 9z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M20.845 27l-6 6s-6 6-12 0 0-12 0-12l8-8s6-6 12 0c1.125 1.125 1.822 2.62 1.822 2.62l-3.354 3.349s.135-1.365-1.47-2.969c0 0-3-3-6 0l-8 8s-3 3 0 6 6 0 6 0l3.73-3.729s1.854 1.521 5.646.354l-.374.375z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon2Icon;
/* prettier-ignore-end */
