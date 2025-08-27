import { FontFamilyTokenEditModal } from "@/wab/client/components/sidebar/FontFamilyTokenEditModal";
import { GeneralTokenEditModal } from "@/wab/client/components/sidebar/GeneralTokenEditModal";
import { ColorTokenPopup } from "@/wab/client/components/sidebar/token-controls";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { MutableToken, OverrideableToken } from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { observer } from "mobx-react";
import * as React from "react";

export const TokenEditModal = observer(function TokenEditModal(props: {
  studioCtx: StudioCtx;
  token: MutableToken<StyleToken> | OverrideableToken<StyleToken>;
  onClose: () => void;
  autoFocusName?: boolean;
  vsh?: VariantedStylesHelper;
}) {
  const { studioCtx, token, onClose, autoFocusName, vsh } = props;

  return (
    <>
      {token.type === "Color" && (
        <ColorTokenPopup
          studioCtx={studioCtx}
          token={token}
          show={true}
          onClose={onClose}
          autoFocusName={autoFocusName}
          vsh={vsh}
        />
      )}

      {token.type === "FontFamily" && (
        <FontFamilyTokenEditModal
          studioCtx={studioCtx}
          token={token}
          defaultEditingName={autoFocusName}
          onClose={onClose}
          vsh={vsh}
        />
      )}

      {token.type !== "Color" && token.type !== "FontFamily" && (
        <GeneralTokenEditModal
          studioCtx={studioCtx}
          token={token}
          defaultEditingName={autoFocusName}
          onClose={onClose}
          vsh={vsh}
        />
      )}
    </>
  );
});
