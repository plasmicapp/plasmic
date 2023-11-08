import { HTMLElementRefOf } from "@plasmicapp/react-web";
import * as React from "react";
import {
  DefaultUpsellConfirmProps,
  PlasmicUpsellConfirm,
} from "../../plasmic/plasmic_kit_dashboard/PlasmicUpsellConfirm";

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
