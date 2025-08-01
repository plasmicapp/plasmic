import { SidebarModal } from "@/wab/client/components/sidebar/SidebarModal";
import { newTokenValueAllowed } from "@/wab/client/components/sidebar/token-controls";
import { DimTokenSpinner } from "@/wab/client/components/widgets/DimTokenSelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import {
  FinalStyleToken,
  MutableStyleToken,
  TokenType,
  tokenTypeDimOpts,
} from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { assert, ensure } from "@/wab/shared/common";
import { observer } from "mobx-react";
import * as React from "react";

export const GeneralTokenEditModal = observer(
  function GeneralTokenModal(props: {
    token: FinalStyleToken;
    studioCtx: StudioCtx;
    defaultEditingName?: boolean;
    onClose: () => void;
    vsh?: VariantedStylesHelper;
  }) {
    const {
      token,
      studioCtx,
      defaultEditingName,
      vsh = new VariantedStylesHelper(props.studioCtx.site),
    } = props;
    const tokenType = token.type as TokenType;
    const onChange = async (val: string | undefined) => {
      assert(val !== undefined);
      return studioCtx.changeUnsafe(() => {
        if (newTokenValueAllowed(token, studioCtx.site, val, vsh)) {
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
                  studioCtx.tplMgr().renameToken(token.base, name);
                })
              }
              readOnly={!(token instanceof MutableStyleToken)}
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
            onChange={(val) => onChange(ensure(val, "new value is undefined"))}
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
