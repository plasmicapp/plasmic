import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import { Matcher } from "@/wab/client/components/view-common";
import Checkbox from "@/wab/client/components/widgets/Checkbox";
import PlasmicGeneralTokenControl from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicGeneralTokenControl";
import { DataTokenValue } from "@/wab/commons/DataToken";
import { FinalToken } from "@/wab/shared/core/tokens";
import { getFolderDisplayName } from "@/wab/shared/folders/folders-util";
import { DataToken } from "@/wab/shared/model/classes";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

// TODO: Create a data token control component in Plasmic Studio
interface DataTokenControlProps {
  style?: React.CSSProperties;
  token: FinalToken<DataToken>;
  tokenValue: DataTokenValue;
  matcher: Matcher;
  menu: () => React.ReactElement;
  onClick?: () => void;
}

const GeneralDataTokenControl = observer(function GeneralTokenControl(
  props: DataTokenControlProps
) {
  const { style, token, tokenValue, matcher, menu, onClick } = props;

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

export default GeneralDataTokenControl;
