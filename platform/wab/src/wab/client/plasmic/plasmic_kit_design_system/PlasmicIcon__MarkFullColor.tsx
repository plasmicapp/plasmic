/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import { classNames } from "@plasmicapp/react-web";
import React from "react";

export type MarkFullColorIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function MarkFullColorIcon(props: MarkFullColorIconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 32 32"}
      className={classNames(
        "plasmic-default__svg",
        className,
        "plasmic-default__svg plasmic_default__all plasmic_default__svg ComponentTceyg5SPl6__svg__mwBdj"
      )}
      role={"img"}
      height={"1em"}
      width={"1em"}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M3.2 22C3.2 14.93 8.93 9.2 16 9.2S28.8 14.93 28.8 22H32c0-8.837-7.163-16-16-16S0 13.163 0 22h3.2z"
        }
        fill={"url(#gIRTI2v0Ea)"}
      ></path>

      <path
        d={
          "M3.2 22C3.2 14.93 8.93 9.2 16 9.2S28.8 14.93 28.8 22H32c0-8.837-7.163-16-16-16S0 13.163 0 22h3.2z"
        }
        fill={"url(#gIRTI2v0Eb)"}
        fillOpacity={".6"}
      ></path>

      <path
        d={
          "M24 22a8 8 0 10-16 0H4.8c0-6.185 5.015-11.2 11.2-11.2S27.2 15.815 27.2 22H24z"
        }
        fill={"url(#gIRTI2v0Ec)"}
      ></path>

      <path
        d={
          "M24 22a8 8 0 10-16 0H4.8c0-6.185 5.015-11.2 11.2-11.2S27.2 15.815 27.2 22H24z"
        }
        fill={"url(#gIRTI2v0Ed)"}
        fillOpacity={".6"}
      ></path>

      <path
        d={"M12.8 22a3.2 3.2 0 016.4 0h3.2a6.4 6.4 0 10-12.8 0h3.2z"}
        fill={"url(#gIRTI2v0Ee)"}
      ></path>

      <path
        d={"M12.8 22a3.2 3.2 0 016.4 0h3.2a6.4 6.4 0 10-12.8 0h3.2z"}
        fill={"url(#gIRTI2v0Ef)"}
        fillOpacity={".6"}
      ></path>

      <defs>
        <linearGradient
          id={"gIRTI2v0Ea"}
          x1={"0"}
          y1={"22"}
          x2={"32"}
          y2={"22"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop offset={".219"} stopColor={"#FF2991"}></stop>

          <stop offset={".792"} stopColor={"#9429FF"}></stop>
        </linearGradient>

        <linearGradient
          id={"gIRTI2v0Eb"}
          x1={"16"}
          y1={"30.008"}
          x2={"16"}
          y2={"9.333"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#fff"}></stop>

          <stop offset={".22"} stopColor={"#fff"} stopOpacity={".76"}></stop>

          <stop offset={".6"} stopColor={"#fff"} stopOpacity={".36"}></stop>

          <stop offset={".87"} stopColor={"#fff"} stopOpacity={".1"}></stop>

          <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"}></stop>
        </linearGradient>

        <linearGradient
          id={"gIRTI2v0Ec"}
          x1={"0"}
          y1={"22"}
          x2={"32"}
          y2={"22"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop offset={".219"} stopColor={"#FF2991"}></stop>

          <stop offset={".792"} stopColor={"#9429FF"}></stop>
        </linearGradient>

        <linearGradient
          id={"gIRTI2v0Ed"}
          x1={"16"}
          y1={"30.008"}
          x2={"16"}
          y2={"9.333"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#fff"}></stop>

          <stop offset={".22"} stopColor={"#fff"} stopOpacity={".76"}></stop>

          <stop offset={".6"} stopColor={"#fff"} stopOpacity={".36"}></stop>

          <stop offset={".87"} stopColor={"#fff"} stopOpacity={".1"}></stop>

          <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"}></stop>
        </linearGradient>

        <linearGradient
          id={"gIRTI2v0Ee"}
          x1={"0"}
          y1={"22"}
          x2={"32"}
          y2={"22"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop offset={".219"} stopColor={"#FF2991"}></stop>

          <stop offset={".792"} stopColor={"#9429FF"}></stop>
        </linearGradient>

        <linearGradient
          id={"gIRTI2v0Ef"}
          x1={"16"}
          y1={"30.008"}
          x2={"16"}
          y2={"9.333"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#fff"}></stop>

          <stop offset={".22"} stopColor={"#fff"} stopOpacity={".76"}></stop>

          <stop offset={".6"} stopColor={"#fff"} stopOpacity={".36"}></stop>

          <stop offset={".87"} stopColor={"#fff"} stopOpacity={".1"}></stop>

          <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"}></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default MarkFullColorIcon;
/* prettier-ignore-end */
