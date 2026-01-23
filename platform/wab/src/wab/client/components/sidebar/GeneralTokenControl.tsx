import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import { TokenIndicatorType } from "@/wab/client/components/sidebar/token-utils";
import { TokenDefinedIndicator } from "@/wab/client/components/style-controls/TokenDefinedIndicator";
import { Matcher } from "@/wab/client/components/view-common";
import Checkbox from "@/wab/client/components/widgets/Checkbox";
import PlasmicGeneralTokenControl from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicGeneralTokenControl";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { StyleTokenValue } from "@/wab/commons/StyleToken";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { FinalToken, MutableToken } from "@/wab/shared/core/tokens";
import { getFolderDisplayName } from "@/wab/shared/folders/folders-util";
import { StyleToken } from "@/wab/shared/model/classes";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

interface GeneralTokenControlProps {
  style?: React.CSSProperties;
  token: FinalToken<StyleToken>;
  tokenValue: StyleTokenValue;
  matcher: Matcher;
  menu: () => React.ReactElement;
  onClick?: () => void;
  vsh?: VariantedStylesHelper;
  indicatorType?: TokenIndicatorType;
}

const GeneralTokenControl = observer(function GeneralTokenControl(
  props: GeneralTokenControlProps
) {
  const {
    style,
    token,
    tokenValue,
    matcher,
    menu,
    onClick,
    vsh,
    indicatorType,
  } = props;
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
              {multiAssetsActions.isSelecting &&
              token instanceof MutableToken ? (
                <Checkbox isChecked={isSelected}> </Checkbox>
              ) : (
                <TokenDefinedIndicator
                  token={token}
                  vsh={vsh}
                  studioCtx={studioCtx}
                  indicatorType={indicatorType}
                />
              )}
            </>
          ),
        }}
        showIcon
      >
        {matcher.boldSnippets(tokenName)}
      </PlasmicGeneralTokenControl>
    </Tooltip>
  );
});

export default GeneralTokenControl;
