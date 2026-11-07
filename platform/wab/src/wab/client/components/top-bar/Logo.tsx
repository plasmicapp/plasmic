import {
  DefaultLogoProps,
  PlasmicLogo,
} from "@/wab/client/plasmic/plasmic_kit_top_bar/PlasmicLogo";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

export type LogoProps = DefaultLogoProps;

function Logo_(props: LogoProps, ref: HTMLElementRefOf<"div">) {
  return <PlasmicLogo root={{ ref }} {...props} />;
}

const Logo = React.forwardRef(Logo_);
export default Logo;
