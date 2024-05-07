import {
  DefaultPromoBannerProps,
  PlasmicPromoBanner,
} from "@/wab/client/plasmic/plasmic_kit_alert_banner/PlasmicPromoBanner";
import { ApiPromotionCode } from "@/wab/shared/ApiSchema";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import Cookies from "js-cookie";
import * as React from "react";

export type PromoBannerProps = DefaultPromoBannerProps;

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
