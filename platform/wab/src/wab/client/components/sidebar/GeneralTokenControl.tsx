import { StyleToken } from "@/wab/classes";
import { useMultiAssetsActions } from "@/wab/client/components/sidebar/MultiAssetsActions";
import { TokenDefinedIndicator } from "@/wab/client/components/style-controls/TokenDefinedIndicator";
import { Matcher } from "@/wab/client/components/view-common";
import Checkbox from "@/wab/client/components/widgets/Checkbox";
import PlasmicGeneralTokenControl from "@/wab/client/plasmic/plasmic_kit_left_pane/PlasmicGeneralTokenControl";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { TokenValueResolver } from "@/wab/shared/cached-selectors";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { Tooltip } from "antd";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";

interface GeneralTokenControlProps {
  token: StyleToken;
  readOnly?: boolean;
  matcher: Matcher;
  studioCtx: StudioCtx;
  menu: () => React.ReactElement;
  className?: string;
  isDragging?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps;
  onClick?: () => void;
  resolver: TokenValueResolver;
  vsh?: VariantedStylesHelper;
}

const GeneralTokenControl = observer(function GeneralTokenControl(
  props: GeneralTokenControlProps
) {
  const {
    token,
    matcher,
    menu,
    readOnly,
    isDragging,
    dragHandleProps,
    onClick,
    resolver,
    studioCtx,
    vsh,
  } = props;
  const realValue = resolver(token, vsh);
  const multiAssetsActions = useMultiAssetsActions();

  const isSelected = multiAssetsActions.isAssetSelected(token.uuid);

  return (
    <Tooltip title={token.name} mouseEnterDelay={0.5}>
      <PlasmicGeneralTokenControl
        value={matcher.boldSnippets(realValue)}
        className={props.className}
        isDraggable={!readOnly}
        isDragging={isDragging}
        listItem={{
          dragHandleProps,
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
        {matcher.boldSnippets(token.name)}
      </PlasmicGeneralTokenControl>
    </Tooltip>
  );
});

export default GeneralTokenControl;
