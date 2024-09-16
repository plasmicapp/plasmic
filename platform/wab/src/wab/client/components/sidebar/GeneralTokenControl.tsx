import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import { TokenDefinedIndicator } from "@/wab/client/components/style-controls/TokenDefinedIndicator";
import { Matcher } from "@/wab/client/components/view-common";
import Checkbox from "@/wab/client/components/widgets/Checkbox";
import PlasmicGeneralTokenControl from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicGeneralTokenControl";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TokenValue } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { getFolderDisplayName } from "@/wab/shared/folders/folders-util";
import { StyleToken } from "@/wab/shared/model/classes";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

interface GeneralTokenControlProps {
  style?: React.CSSProperties;
  token: StyleToken;
  tokenValue: TokenValue;
  matcher: Matcher;
  menu: () => React.ReactElement;
  onClick?: () => void;
  vsh?: VariantedStylesHelper;
}

const GeneralTokenControl = observer(function GeneralTokenControl(
  props: GeneralTokenControlProps
) {
  const { style, token, tokenValue, matcher, menu, onClick, vsh } = props;
  const studioCtx = useStudioCtx();

  const multiAssetsActions = useMultiAssetsActions();

  const isSelected = multiAssetsActions.isAssetSelected(token.uuid);

  const tokenName = getFolderDisplayName(token.name);

  return (
    <Tooltip title={tokenName} mouseEnterDelay={0.5}>
      <PlasmicGeneralTokenControl
        value={matcher.boldSnippets(tokenValue)}
        rowItem={{
          style,
          menu,
          onClick,
          icon: (
            <>
              {multiAssetsActions.isSelecting && (
                <Checkbox isChecked={isSelected}> </Checkbox>
              )}
              {vsh && !multiAssetsActions.isSelecting && (
                <TokenDefinedIndicator
                  token={token}
                  vsh={vsh}
                  studioCtx={studioCtx}
                />
              )}
            </>
          ),
        }}
        showIcon={!!vsh || multiAssetsActions.isSelecting}
      >
        {matcher.boldSnippets(tokenName)}
      </PlasmicGeneralTokenControl>
    </Tooltip>
  );
});

export default GeneralTokenControl;
