import { observer } from "mobx-react-lite";
import * as React from "react";
import { StyleToken } from "../../../classes";
import { assert } from "../../../common";
import { TokenType, tokenTypeDimOpts } from "../../../commons/StyleToken";
import { VariantedStylesHelper } from "../../../shared/VariantedStylesHelper";
import { allTokensOfType } from "../../../sites";
import TokenIcon from "../../plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { DimTokenSpinner } from "../widgets/DimTokenSelector";
import { Icon } from "../widgets/Icon";
import { SimpleTextbox } from "../widgets/SimpleTextbox";
import { SidebarModal } from "./SidebarModal";
import { newTokenValueAllowed } from "./token-controls";

export const GeneralTokenEditModal = observer(
  function GeneralTokenModal(props: {
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
    const onChange = async (val: string | undefined) => {
      assert(val !== undefined);
      return studioCtx.changeUnsafe(() => {
        const allTokensOfSameType = allTokensOfType(studioCtx.site, tokenType, {
          includeDeps: "direct",
        });
        if (newTokenValueAllowed(token, allTokensOfSameType, val, vsh)) {
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
          <DimTokenSpinner
            value={vsh.getActiveTokenValue(token)}
            onChange={onChange}
            noClear
            studioCtx={studioCtx}
            tokenType={tokenType}
            autoFocus={!defaultEditingName}
            {...tokenTypeDimOpts(tokenType)}
            vsh={vsh}
          />
        </div>
      </SidebarModal>
    );
  }
);
