import { ArenaFrame } from "@/wab/classes";
import { CanvasTransformedBox } from "@/wab/client/components/canvas/CanvasTransformedBox";
import { useRerenderOnUserBodyChange } from "@/wab/client/components/canvas/UserBodyObserver";
import { hasLayoutBox } from "@/wab/client/dom";
import WarningIcon from "@/wab/client/plasmic/q_4_icons/icons/PlasmicIcon__WarningTrianglesvg";
import { globalHookCtx } from "@/wab/client/react-global-hook/globalHook";
import { RightTabKey, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { assert } from "@/wab/common";
import {
  CodeComponent,
  getComponentDisplayName,
  isCodeComponent,
} from "@/wab/components";
import { AnyArena } from "@/wab/shared/Arenas";
import { maybePropTypeToDisplayName } from "@/wab/shared/code-components/code-components";
import {
  flattenVals,
  InvalidArgMeta,
  isValComponent,
  ValComponent,
  ValidationType,
} from "@/wab/val-nodes";
import { Tooltip } from "antd";
import $ from "jquery";
import { observer } from "mobx-react";
import React from "react";

const getErrorMessage = (invalidArg: InvalidArgMeta) =>
  invalidArg.validationType === ValidationType.Required
    ? "Required"
    : invalidArg.message ?? "Invalid Value";

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
          : {getErrorMessage(invalidArg)}
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
          viewCtx.studioCtx.rightTabKey = RightTabKey.settings;
          viewCtx.highlightParam = {
            param: invalidArgs[0].param,
            tpl: valComponent.tpl,
          };
          viewCtx.selectNewTpl(valComponent.tpl);
          e.stopPropagation();
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
