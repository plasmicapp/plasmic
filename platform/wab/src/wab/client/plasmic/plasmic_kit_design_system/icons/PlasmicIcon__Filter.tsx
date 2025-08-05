/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FilterIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FilterIcon(props: FilterIconProps) {
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
          "M4.75 7a.75.75 0 000 1.5V7zm14.5 1.5a.75.75 0 000-1.5v1.5zm-14.5 0h14.5V7H4.75v1.5zm2 2.5a.75.75 0 000 1.5V11zm10.5 1.5a.75.75 0 000-1.5v1.5zm-10.5 0h10.5V11H6.75v1.5zm2 2.5a.75.75 0 000 1.5V15zm6.5 1.5a.75.75 0 000-1.5v1.5zm-6.5 0h6.5V15h-6.5v1.5z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default FilterIcon;
/* prettier-ignore-end */
