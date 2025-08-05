/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type HidePlaceholderIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HidePlaceholderIcon(props: HidePlaceholderIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentcolor"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      width={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M4.667 2A2.667 2.667 0 002 4.667h1.333c0-.737.597-1.334 1.334-1.334V2zM2 11.333h1.333c0 .12.016.236.045.346l8.3-8.3a1.335 1.335 0 00-.345-.046V2A2.667 2.667 0 0114 4.667h-1.333c0-.12-.016-.236-.046-.346l-8.3 8.3c.11.03.226.046.346.046V14A2.667 2.667 0 012 11.333zM11.333 14v-1.333c.737 0 1.334-.597 1.334-1.334H14A2.667 2.667 0 0111.333 14zm-8-7.333H2v2.666h1.333V6.667zM6.667 2h2.666v1.333H6.667V2zm2.666 10.667H6.667V14h2.666v-1.333zm3.334-6H14v2.666h-1.333V6.667z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default HidePlaceholderIcon;
/* prettier-ignore-end */
