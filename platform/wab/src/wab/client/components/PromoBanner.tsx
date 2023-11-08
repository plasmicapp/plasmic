import { HTMLElementRefOf } from "@plasmicapp/react-web";
import Cookies from "js-cookie";
import * as React from "react";
import { ApiPromotionCode } from "../../shared/ApiSchema";
import {
  DefaultPromoBannerProps,
  PlasmicPromoBanner,
} from "../plasmic/plasmic_kit_alert_banner/PlasmicPromoBanner";

export interface PromoBannerProps extends DefaultPromoBannerProps {}

function PromoBanner_(props: PromoBannerProps, ref: HTMLElementRefOf<"a">) {
  const promoCookie = Cookies.get("promo_code");
  const promotion = promoCookie
    ? (JSON.parse(promoCookie) as ApiPromotionCode)
    : null;

  return (
    promotion && (
      <PlasmicPromoBanner
        root={{ ref }}
        {...props}
        message={promotion.message}
      />
    )
  );
}

const PromoBanner = React.forwardRef(PromoBanner_);
export default PromoBanner;
