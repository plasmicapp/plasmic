import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultUpsellBannerProps,
  PlasmicUpsellBanner,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicUpsellBanner";

interface UpsellBannerProps extends DefaultUpsellBannerProps {}

function UpsellBanner_(props: UpsellBannerProps, ref: HTMLElementRefOf<"div">) {
  return <PlasmicUpsellBanner root={{ ref }} {...props} />;
}

const UpsellBanner = React.forwardRef(UpsellBanner_);
export default UpsellBanner;
