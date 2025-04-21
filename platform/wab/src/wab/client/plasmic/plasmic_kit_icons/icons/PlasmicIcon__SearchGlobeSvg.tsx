/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type SearchGlobeSvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function SearchGlobeSvgIcon(props: SearchGlobeSvgIconProps) {
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
          "M12 4.75a7.25 7.25 0 000 14.5c-1.243 0-3.25-2.75-3.25-7.25M12 4.75A7.25 7.25 0 0119.25 12M12 4.75c-1.243 0-3.25 2.75-3.25 7.25M12 4.75c.953 0 2.357 1.619 2.959 4.404l.025.121M8.75 12H5m3.75 0h2.5"
        }
      ></path>

      <path
        fill={"#141414"}
        d={
          "M17.677 16.617a.75.75 0 00-1.06 1.06l1.06-1.06zm1.043 3.163a.75.75 0 101.06-1.06l-1.06 1.06zm-3.485-1.31a3.235 3.235 0 003.236-3.235h-1.5c0 .959-.777 1.736-1.736 1.736v1.5zm0-4.97c.959 0 1.736.777 1.736 1.735h1.5A3.235 3.235 0 0015.235 12v1.5zm0-1.5A3.235 3.235 0 0012 15.235h1.5c0-.958.777-1.735 1.735-1.735V12zm0 4.97a1.735 1.735 0 01-1.735-1.735H12a3.235 3.235 0 003.235 3.236v-1.5zm1.382.707l2.103 2.103 1.06-1.06-2.103-2.103-1.06 1.06z"
        }
      ></path>
    </svg>
  );
}

export default SearchGlobeSvgIcon;
/* prettier-ignore-end */
