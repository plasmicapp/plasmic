import { StyleToken } from "@/wab/classes";
import { FontFamilySelector } from "@/wab/client/components/widgets/FontFamilySelector";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { SimpleTextbox } from "@/wab/client/components/widgets/SimpleTextbox";
import TokenIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Token";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { assert } from "@/wab/common";
import { TokenType } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { allTokensOfType } from "@/wab/sites";
import { observer } from "mobx-react";
import * as React from "react";
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
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
