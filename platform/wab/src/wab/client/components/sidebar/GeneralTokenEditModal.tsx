import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { newTokenValueAllowed } from "@/wab/client/components/sidebar/token-controls";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { assert } from "@/wab/shared/common";
import { TokenType, tokenTypeDimOpts } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { StyleToken } from "@/wab/shared/model/classes";
import { allTokensOfType } from "@/wab/shared/core/sites";
import { observer } from "mobx-react";
import * as React from "react";

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
