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
      viewBox={"0 0 24 24"}
      className={classNames(
        "plasmic-default__svg",
        className,
        "Icon__Image-sc-1t7fvk5-0 cFPKfE"
      )}
      height={"1em"}
      width={"1em"}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        fillRule={"evenodd"}
        d={"M3.005 3H15v12H3.005V3zM14.5 21a6.5 6.5 0 100-13 6.5 6.5 0 000 13z"}
        clipRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default Icon2Icon;
/* prettier-ignore-end */
