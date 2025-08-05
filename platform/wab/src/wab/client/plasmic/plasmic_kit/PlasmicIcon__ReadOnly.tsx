/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type ReadOnlyIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function ReadOnlyIcon(props: ReadOnlyIconProps) {
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
          "M21.44 11.657L20.5 12l.94.343h-.001l-.001.004-.003.007-.007.02a5.913 5.913 0 01-.114.272 8.844 8.844 0 01-.356.702c-.32.572-.821 1.332-1.547 2.092C17.945 16.977 15.57 18.5 12 18.5c-3.57 0-5.944-1.523-7.41-3.06a10.466 10.466 0 01-1.548-2.092 8.86 8.86 0 01-.445-.912 3.817 3.817 0 01-.025-.063l-.007-.02-.003-.006-.001-.003v-.001L3.5 12l-.94-.343h.001l.001-.004.003-.007.007-.02a3.817 3.817 0 01.114-.271 8.86 8.86 0 01.356-.703c.32-.572.82-1.332 1.547-2.092C6.055 7.023 8.43 5.5 12 5.5c3.57 0 5.945 1.523 7.41 3.06a10.39 10.39 0 011.548 2.092 8.844 8.844 0 01.445.912l.025.063.007.02.003.006.001.003v.001zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M3.5 12l-.94.342L2.436 12l.124-.342.94.342zm17 0l.94-.342.124.342-.124.342L20.5 12z"
        }
      ></path>
    </svg>
  );
}

export default ReadOnlyIcon;
/* prettier-ignore-end */
