/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type UserSelectIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function UserSelectIcon(props: UserSelectIconProps) {
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
          "M11 3H9v2h2v2H3v10h8v2H9v2h2l1-1 1 1h2v-2h-2V5h2V3h-2l-1 1-1-1zm4 7h6v4h-6v-4zm-4 0H5v4h6v-4z"
        }
        clipRule={"evenodd"}
        fillRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default UserSelectIcon;
/* prettier-ignore-end */
