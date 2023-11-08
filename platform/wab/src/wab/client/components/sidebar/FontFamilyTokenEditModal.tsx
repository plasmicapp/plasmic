import { observer } from "mobx-react-lite";
import * as React from "react";
import { StyleToken } from "../../../classes";
import { assert } from "../../../common";
import { TokenType } from "../../../commons/StyleToken";
import { VariantedStylesHelper } from "../../../shared/VariantedStylesHelper";
import { allTokensOfType } from "../../../sites";
import TokenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { FontFamilySelector } from "../widgets/FontFamilySelector";
import { Icon } from "../widgets/Icon";
import { SimpleTextbox } from "../widgets/SimpleTextbox";
import { SidebarModal } from "./SidebarModal";
import { newTokenValueAllowed } from "./token-controls";

export const FontFamilyTokenEditModal = observer(
  function FontFamilyTokenEditModal(props: {
    token: StyleToken;
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
    const tokenType = token.type as TokenType;
    const onChange = async (val: string) => {
      assert(val !== undefined);
      const allTokensOfSameType = allTokensOfType(studioCtx.site, tokenType, {
        includeDeps: "direct",
      });
      return studioCtx.changeUnsafe(() => {
        if (newTokenValueAllowed(token, allTokensOfSameType, val, vsh)) {
          studioCtx.fontManager.useFont(studioCtx, val);
          vsh.updateToken(token, val);
        }
      });
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
                  studioCtx.tplMgr().renameToken(token, name);
                })
              }
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
              onChange: onChange,
              value: vsh.getActiveTokenValue(token),
              vsh,
            }}
          />
        </div>
      </SidebarModal>
    );
  }
);
