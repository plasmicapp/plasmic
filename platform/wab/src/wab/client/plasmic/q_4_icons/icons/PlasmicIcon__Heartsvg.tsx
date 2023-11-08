// @ts-nocheck
/* eslint-disable */
/* tslint:disable */
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type HeartsvgIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function HeartsvgIcon(props: HeartsvgIconProps) {
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
          "M11.995 7.233c-1.45-1.623-3.867-2.06-5.683-.573-1.816 1.486-2.072 3.971-.645 5.73l6.328 5.86 6.329-5.86c1.426-1.759 1.201-4.26-.646-5.73-1.848-1.471-4.233-1.05-5.683.573z"
        }
        clipRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default HeartsvgIcon;
/* prettier-ignore-end */
