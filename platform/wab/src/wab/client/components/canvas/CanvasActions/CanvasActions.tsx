import { CanvasTransformedBox } from "@/wab/client/components/canvas/CanvasTransformedBox";
import { useRerenderOnUserBodyChange } from "@/wab/client/components/canvas/UserBodyObserver";
import { hasLayoutBox } from "@/wab/client/dom";
import WarningIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__WarningTriangleSvg";
import { globalHookCtx } from "@/wab/client/react-global-hook/globalHook";
import { RightTabKey, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { AnyArena } from "@/wab/shared/Arenas";
import { getTplComponentArg } from "@/wab/shared/TplMgr";
import { ensureBaseVariantSetting } from "@/wab/shared/Variants";
import { maybePropTypeToDisplayName } from "@/wab/shared/code-components/code-components";
import { assert, last } from "@/wab/shared/common";
import {
  CodeComponent,
  getComponentDisplayName,
  getParamForVar,
  isCodeComponent,
} from "@/wab/shared/core/components";
import { getTplOwnerComponent } from "@/wab/shared/core/tpls";
import {
  InvalidArgMeta,
  ValComponent,
  flattenVals,
  getInvalidArgErrorMessage,
  isValComponent,
} from "@/wab/shared/core/val-nodes";
import { ArenaFrame, isKnownVarRef } from "@/wab/shared/model/classes";
import { Tooltip } from "antd";
import $ from "jquery";
import { observer } from "mobx-react";
import React from "react";

const TooltipMessage = ({
  component,
  invalidArgs,
}: {
  component: CodeComponent;
  invalidArgs: InvalidArgMeta[];
}) => (
  <>
    The component {getComponentDisplayName(component)} may not work properly
    because some props have an invalid value:
    <ul>
      {invalidArgs.map((invalidArg) => (
        <li>
          {" "}
          -{" "}
          {(component._meta &&
            maybePropTypeToDisplayName(
              component._meta.props[invalidArg.param.variable.name]
            )) ??
            invalidArg.param.variable.name}
          : {getInvalidArgErrorMessage(invalidArg)}
        </li>
      ))}
    </ul>
  </>
);

export const CanvasAction = observer(_CanvasAction);
function _CanvasAction(props: {
  viewCtx: ViewCtx;
  valComponent: ValComponent;
}) {
  const { viewCtx, valComponent } = props;
  const dom = viewCtx.renderState.sel2dom(valComponent, viewCtx.canvasCtx);
  const component = valComponent.tpl.component;
  const invalidArgs = valComponent.invalidArgs;
  const $elt = dom && $(dom);
  if (
    !isCodeComponent(component) ||
    !invalidArgs ||
    invalidArgs.length === 0 ||
    !dom ||
    !$elt ||
    $elt.toArray().filter(hasLayoutBox).length === 0
  ) {
    return null;
  }
  return (
    <CanvasTransformedBox
      relativeTo="frame"
      $elt={$elt}
      viewCtx={viewCtx}
      keepDims={true}
    >
      <div
        style={{
          zIndex: 1000,
          position: "relative",
          cursor: "pointer",
          top: -10,
          left: -10,
        }}
        onClick={(e) => {
          e.stopPropagation();

          // We start enforcing the settings tab, so that it's clear where the user should change something
          viewCtx.studioCtx.rightTabKey = RightTabKey.settings;

          const invalidTpl = valComponent.tpl;
          const invalidTplOwner = getTplOwnerComponent(invalidTpl);
          const invalidParam = invalidArgs[0].param;

          // If the invalid component is owned by the current component, we can just hightlight the tpl and param
          if (invalidTplOwner === viewCtx.currentComponent()) {
            viewCtx.highlightParam = {
              param: invalidParam,
              tpl: invalidTpl,
            };
            viewCtx.selectNewTpl(invalidTpl);
          } else {
            const valOwners = viewCtx.valState().valOwners(valComponent);
            assert(
              valOwners.length >= 1,
              "There should be at least one val owners in the path from valComponent to root"
            );

            // This is the tpl in the current view that owns the invalid tpl, we will highlight it
            const visibleTplOwner = last(valOwners).tpl;

            if (valOwners.length === 1) {
              // If there is only one val owners, it means that the we are one wrapping away from the current view,
              // we will check for linked props as a best effort to highlight the correct param
              const arg = getTplComponentArg(
                invalidTpl,
                ensureBaseVariantSetting(invalidTpl),
                invalidParam.variable
              );

              if (arg && isKnownVarRef(arg.expr)) {
                // If it's a linked prop we highlight will get the respective param in the component
                const linkedParam = getParamForVar(
                  visibleTplOwner.component,
                  arg.expr.variable
                );

                viewCtx.highlightParam = {
                  param: linkedParam,
                  tpl: visibleTplOwner,
                };
              }
            }

            viewCtx.selectNewTpl(visibleTplOwner);
          }
        }}
      >
        <Tooltip
          title={
            <TooltipMessage component={component} invalidArgs={invalidArgs} />
          }
        >
          <WarningIcon style={{ color: "#faad14", width: 25, height: 25 }} />
        </Tooltip>
      </div>
    </CanvasTransformedBox>
  );
}

export const CanvasActions = observer(CanvasActions_);
function CanvasActions_(props: { arena: AnyArena; arenaFrame: ArenaFrame }) {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.tryGetViewCtxForFrame(props.arenaFrame);

  useRerenderOnUserBodyChange(studioCtx, viewCtx);

  const shouldHideCanvasActions =
    studioCtx.freestyleState() ||
    studioCtx.dragInsertState() ||
    studioCtx.isResizingFocusedArenaFrame ||
    !studioCtx.showDevControls ||
    studioCtx.screenshotting ||
    studioCtx.isTransforming() ||
    studioCtx.isResizeDragging;

  const valRoot = globalHookCtx.frameUidToValRoot.get(props.arenaFrame.uid);
  if (!viewCtx || !valRoot || shouldHideCanvasActions) {
    return null;
  }
  const invalidArgs = flattenVals(valRoot).filter((valNode) => {
    return (
      isValComponent(valNode) &&
      valNode.invalidArgs &&
      valNode.invalidArgs.length > 0
    );
  });
  return (
    <>
      {invalidArgs.map((valNode) => {
        assert(isValComponent(valNode), "checked before");
        return <CanvasAction viewCtx={viewCtx} valComponent={valNode} />;
      })}
    </>
  );
}
