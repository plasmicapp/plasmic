import { observer } from "mobx-react-lite";
import * as React from "react";
import { DraggableProvidedDragHandleProps } from "react-beautiful-dnd";
import { StyleToken } from "../../../classes";
import { DEVFLAGS } from "../../../devflags";
import { TokenResolver } from "../../../shared/cached-selectors";
import { VariantedStylesHelper } from "../../../shared/VariantedStylesHelper";
import PlasmicGeneralTokenControl from "../../plasmic/plasmic_kit_left_pane/PlasmicGeneralTokenControl";
import { StudioCtx } from "../../studio-ctx/StudioCtx";
import { TokenDefinedIndicator } from "../style-controls/TokenDefinedIndicator";
import { Matcher } from "../view-common";

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
  resolver: TokenResolver;
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
  return (
    <>
      <PlasmicGeneralTokenControl
        value={matcher.boldSnippets(realValue)}
        className={props.className}
        isDraggable={!readOnly}
        isDragging={isDragging}
        listItem={{
          dragHandleProps,
          menu,
          onClick,
          icon: vsh && (
            <TokenDefinedIndicator
              token={token}
              vsh={vsh}
              studioCtx={studioCtx}
            />
          ),
        }}
        showIcon={DEVFLAGS.variantedStyles && !!vsh}
      >
        {matcher.boldSnippets(token.name)}
      </PlasmicGeneralTokenControl>
    </>
  );
});

export default GeneralTokenControl;
