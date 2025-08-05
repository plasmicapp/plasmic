/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type Cone2SvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Cone2SvgIcon(props: Cone2SvgIconProps) {
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
          "M12 19.25l-.665.346a.75.75 0 001.33 0L12 19.25zM6.572 7.185a.75.75 0 10-1.331.692l1.33-.692zm12.187.692a.75.75 0 10-1.33-.692l1.33.692zm-6.094 11.027L6.572 7.185l-1.331.692 6.094 11.719 1.33-.692zm4.763-11.719l-6.093 11.719 1.33.692L18.76 7.877l-1.33-.692z"
        }
        fill={"currentColor"}
      ></path>

      <path
        d={
          "M17.5 7c0 .007-.002.113-.227.305-.223.19-.59.394-1.108.58-1.03.371-2.502.615-4.165.615V10c1.79 0 3.441-.26 4.674-.703.612-.22 1.161-.501 1.571-.85C18.652 8.1 19 7.615 19 7h-1.5zM12 8.5c-1.663 0-3.135-.244-4.165-.615-.519-.186-.885-.39-1.108-.58C6.502 7.113 6.5 7.007 6.5 7H5c0 .615.348 1.1.755 1.447.41.349.959.63 1.572.85C8.558 9.74 10.21 10 12 10V8.5zM6.5 7c0-.007.002-.113.227-.305.223-.19.59-.394 1.108-.58C8.865 5.744 10.337 5.5 12 5.5V4c-1.79 0-3.442.26-4.673.703-.613.22-1.162.501-1.572.85C5.348 5.9 5 6.385 5 7h1.5zM12 5.5c1.663 0 3.135.244 4.165.615.519.186.885.39 1.108.58.225.192.227.298.227.305H19c0-.615-.348-1.1-.755-1.447-.41-.349-.959-.63-1.572-.85C15.443 4.26 13.79 4 12 4v1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Cone2SvgIcon;
/* prettier-ignore-end */
