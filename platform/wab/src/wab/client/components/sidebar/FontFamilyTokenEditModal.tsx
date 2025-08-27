import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { newTokenValueAllowed } from "@/wab/client/components/sidebar/token-controls";
import { FontFamilySelector } from "@/wab/client/components/widgets/FontFamilySelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { assert, spawn } from "@/wab/shared/common";
import { MutableToken, OverrideableToken } from "@/wab/shared/core/tokens";
import { StyleToken } from "@/wab/shared/model/classes";
import { observer } from "mobx-react";
import * as React from "react";

export const FontFamilyTokenEditModal = observer(
  function FontFamilyTokenEditModal(props: {
    token: MutableToken<StyleToken> | OverrideableToken<StyleToken>;
    studioCtx: StudioCtx;
    defaultEditingName?: boolean;
    onClose: () => void;
    vsh?: VariantedStylesHelper;
  }) {
    const {
      token,
      studioCtx,
      defaultEditingName,
      vsh = new VariantedStylesHelper(),
    } = props;

    const onChange = (val: string) => {
      assert(val !== undefined);
      spawn(
        studioCtx.change(({ success }) => {
          if (newTokenValueAllowed(token, studioCtx.site, val, vsh)) {
            studioCtx.fontManager.useFont(studioCtx, val);
            vsh.updateToken(token, val);
          }
          return success();
        })
      );
    };

    return (
      <SidebarModal
        show={true}
        title={
          <>
            <Icon
              icon={TokenIcon}
              className="token-fg custom-svg-icon--lg monochrome-exempt"
            />
            <SimpleTextbox
              defaultValue={token.name}
              onValueChange={(name) =>
                studioCtx.changeUnsafe(() => {
                  studioCtx.tplMgr().renameToken(token.base, name);
                })
              }
              readOnly={!(token instanceof MutableToken)}
              placeholder={"(unnamed token)"}
              autoFocus={defaultEditingName}
              selectAllOnFocus={true}
              fontSize="xlarge"
              fontStyle="bold"
            />
          </>
        }
        onClose={() => props.onClose()}
      >
        <div className={"flex-col flex-vcenter p-xlg flex-stretch-items"}>
          <FontFamilySelector
            studioCtx={studioCtx}
            selectOpts={{
              onChange,
              value: vsh.getActiveTokenValue(token),
              vsh,
            }}
          />
        </div>
      </SidebarModal>
    );
  }
);
