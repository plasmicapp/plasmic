import {
  DefaultUpsellConfirmProps,
  PlasmicUpsellConfirm,
} from "@/wab/client/plasmic/plasmic_kit_dashboard/PlasmicUpsellConfirm";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";

interface UpsellConfirmProps extends DefaultUpsellConfirmProps {
  teamSettingsUrl: string;
  onDismiss?: () => void;
}

function UpsellConfirm_(
  props: UpsellConfirmProps,
  ref: HTMLElementRefOf<"div">
) {
  const { onDismiss, teamSettingsUrl, ...rest } = props;
  return (
    <PlasmicUpsellConfirm
      root={{ ref }}
      {...rest}
      teamSettingsLink={{
        href: teamSettingsUrl,
        target: "_blank",
      }}
      dismissButton={{
        onClick: onDismiss,
      }}
    />
  );
}

const UpsellConfirm = React.forwardRef(UpsellConfirm_);
export default UpsellConfirm;
