/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type GroupIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function GroupIcon(props: GroupIconProps) {
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
        fillRule={"evenodd"}
        clipRule={"evenodd"}
        d={
          "M6 5a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm2.5 1a1 1 0 100-2 1 1 0 000 2zm-6-1a1 1 0 11-2 0 1 1 0 012 0zM19 6a1 1 0 100-2 1 1 0 000 2zM6 19a1 1 0 11-2 0 1 1 0 012 0zm6 1a1 1 0 100-2 1 1 0 000 2zm4.5-1a1 1 0 11-2 0 1 1 0 012 0zm-8 1a1 1 0 100-2 1 1 0 000 2zM20 19a1 1 0 11-2 0 1 1 0 012 0zM5 11a1 1 0 110 2 1 1 0 010-2zm1-2.5a1 1 0 10-2 0 1 1 0 002 0zm-1 6a1 1 0 110 2 1 1 0 010-2zM20 12a1 1 0 10-2 0 1 1 0 002 0zm-1-4.5a1 1 0 110 2 1 1 0 010-2zm1 8a1 1 0 10-2 0 1 1 0 002 0zM9 8a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V9a1 1 0 00-1-1H9z"
        }
        fill={"currentcolor"}
      ></path>
    </svg>
  );
}

export default GroupIcon;
/* prettier-ignore-end */
