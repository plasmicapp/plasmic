import { newTokenValueAllowed } from "@/wab/client/components/sidebar/token-utils";
import { ColorSidebarPopup } from "@/wab/client/components/style-controls/ColorButton";
import { useClientTokenResolver } from "@/wab/client/components/widgets/ColorPicker/client-token-resolver";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { isTokenRef } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { siteFinalColorTokens } from "@/wab/shared/core/site-style-tokens";
import { MutableToken, OverrideableToken } from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import React from "react";

export const ColorTokenPopup = observer(function ColorTokenPopup(props: {
  token: MutableToken<StyleToken> | OverrideableToken<StyleToken>;
  studioCtx: StudioCtx;
  show: boolean;
  onClose: () => void;
  autoFocusName?: boolean;
  vsh?: VariantedStylesHelper;
}) {
  const {
    token,
    studioCtx,
    show,
    onClose,
    autoFocusName,
    vsh = new VariantedStylesHelper(props.studioCtx.site),
  } = props;

  const resolver = useClientTokenResolver();
  const activeTokenValue = vsh.getActiveTokenValue(token);
  // Resolve CSS variable refs only
  const tokenRefOrRealColor = isTokenRef(activeTokenValue)
    ? activeTokenValue
    : resolver(token, vsh);

  return (
    <ColorSidebarPopup
      color={tokenRefOrRealColor}
      onChange={async (newColor) => {
        if (newTokenValueAllowed(token, studioCtx.site, newColor, vsh)) {
          await studioCtx.changeUnsafe(() => vsh.updateToken(token, newColor));
        }
      }}
      show={show}
      onClose={() => onClose()}
      autoFocus={!autoFocusName}
      colorTokens={siteFinalColorTokens(studioCtx.site, {
        includeDeps: "direct",
      }).filter((t) => t.uuid !== token.uuid)}
      popupTitle={
        <>
          <Icon
            icon={TokenIcon}
            className="token-fg custom-svg-icon--lg monochrome-exempt"
          />

          <SimpleTextbox
            defaultValue={token.name}
            onValueChange={(name) =>
              studioCtx.change(({ success }) => {
                studioCtx.tplMgr().renameStyleToken(token.base, name);
                return success();
              })
            }
            readOnly={!(token instanceof MutableToken)}
            placeholder={"(unnamed token)"}
            autoFocus={autoFocusName}
            selectAllOnFocus={true}
            fontSize="xlarge"
            fontStyle="bold"
          />
        </>
      }
      vsh={vsh}
    />
  );
});
