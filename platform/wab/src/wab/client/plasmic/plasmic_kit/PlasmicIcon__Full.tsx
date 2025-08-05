/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type FullIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function FullIcon(props: FullIconProps) {
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
          "M19.718 12.354a1 1 0 11-2 0V7.697l-7.486 7.485-1.414-1.414 7.485-7.486h-4.657a1 1 0 010-2h8.072v8.072z"
        }
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M12.354 19.718a1 1 0 000-2H7.697l7.485-7.486-1.414-1.414-7.486 7.485v-4.657a1 1 0 10-2 0v8.072h8.072z"
        }
      ></path>
    </svg>
  );
}

export default FullIcon;
/* prettier-ignore-end */
