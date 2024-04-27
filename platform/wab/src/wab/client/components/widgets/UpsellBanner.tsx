import {
  DefaultUpsellBannerProps,
  PlasmicUpsellBanner,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicUpsellBanner";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

type UpsellBannerProps = DefaultUpsellBannerProps;

function UpsellBanner_(props: UpsellBannerProps, ref: HTMLElementRefOf<"div">) {
  return <PlasmicUpsellBanner root={{ ref }} {...props} />;
}

const UpsellBanner = React.forwardRef(UpsellBanner_);
export default UpsellBanner;
