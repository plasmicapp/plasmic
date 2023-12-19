import { frameToScalerRect } from "@/wab/client/coords";
import { hasLayoutBox } from "@/wab/client/dom";
import { ComponentCtx } from "@/wab/client/studio-ctx/component-ctx";
import { adjustSpotLightDueToZoom } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import * as common from "@/wab/common";
import { ensure, maybe, swallow } from "@/wab/common";
import { swallowClick } from "@/wab/commons/components/ReactUtil";
import { Box } from "@/wab/geom";
import { getTplSlots } from "@/wab/shared/SlotUtils";
import { SlotSelection } from "@/wab/slots";
import { Switch } from "antd";
import $ from "jquery";
import { reaction } from "mobx";
import { observer } from "mobx-react-lite";
import * as React from "react";
import { recomputeBounds } from "./HoverBox";

export const Spotlight = observer(Spotlight_);

function Spotlight_(props: { viewCtx: ViewCtx }) {
  const { viewCtx } = props;
  const showDefaultSlotContents = viewCtx.showDefaultSlotContents();
  const { tplComponent, valComponent, shouldRender } =
    getSpotlightInfo(viewCtx);

  const userBody = viewCtx.canvasCtx.$userBody()[0];
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [spotlightDomInfo, setSpotlightDomInfo] =
    React.useState<null | ReturnType<typeof getSpotlightDomInfo>>(null);

  React.useEffect(() => {
    if (!userBody) {
      return;
    }
    // Whenever content inside the frame changes, to be safe, we re-render,
    // in case the DOM size has changed
    const mutationObserver = new MutationObserver((e) => {
      setSpotlightDomInfo(getSpotlightDomInfo(viewCtx));
    });
    mutationObserver.observe(userBody, { childList: true, subtree: true });
    return () => mutationObserver.disconnect();
  }, [userBody, viewCtx]);

  React.useEffect(() => {
    // Re-render spotlight mode whenever styles change, as DOM size
    // may change as a result
    const listener = viewCtx.styleChanged.add(() =>
      setSpotlightDomInfo(getSpotlightDomInfo(viewCtx))
    );
    return () => {
      listener.detach();
    };
  }, [viewCtx]);

  React.useEffect(() => {
    if (!shouldRender) {
      viewCtx.setShowDefaultSlotContents(false);
    }
  }, [shouldRender]);

  React.useEffect(() => {
    adjustSpotLightDueToZoom(viewCtx.studioCtx.zoom);
  });

  React.useEffect(() => {
    if (!shouldRender) {
      return;
    }
    // Re-render spotlight when anything changes about the spotlight mode,
    // read off of viewCtx
    const dispose = reaction(
      () => getSpotlightDomInfo(viewCtx),
      (info) => {
        setSpotlightDomInfo(info);
      },
      {
        fireImmediately: true,
      }
    );
    return () => {
      dispose();
      setSpotlightDomInfo(null);
    };
  }, [shouldRender, viewCtx]);

  if (!shouldRender || !spotlightDomInfo) {
    return null;
  }

  const { focusedElements, focusedScalerRect } = spotlightDomInfo;

  const tplSlots = getTplSlots(tplComponent!.component);

  return (
    <div
      className="component-ctx-spotlight"
      ref={rootRef}
      style={{
        display: "initial",
        ...(focusedScalerRect && {
          top: focusedScalerRect.top,
          left: focusedScalerRect.left,
          width: focusedScalerRect.width,
          height: focusedScalerRect.height,
        }),
      }}
    >
      <div className="component-ctx-spotlight__shadow" />
      {tplSlots.length > 0 && focusedElements && (
        <div
          className="component-ctx-spotlight__controls"
          onClick={swallowClick}
        >
          <Switch
            size="small"
            checked={showDefaultSlotContents}
            onClick={() =>
              viewCtx.setShowDefaultSlotContents(!showDefaultSlotContents)
            }
          />{" "}
          Show default slot contents
        </div>
      )}
      {/* Show slot shadows if we are not showing default contents, as we cannot actually
      edit the content of the slot in master component mode */}
      {tplSlots && !showDefaultSlotContents && focusedScalerRect && (
        <div className="component-ctx-spotlight__slots">
          {tplSlots.map((s) => {
            const valDoms =
              swallow(() =>
                common
                  .ensureArray(
                    viewCtx.renderState.sel2dom(
                      new SlotSelection({
                        slotParam: s.param,
                        val: valComponent,
                      }),
                      viewCtx.canvasCtx
                    ) || []
                  )
                  .filter((x) => !!x && x.tagName !== "STYLE")
              ) || [];
            if (valDoms.length === 0) {
              return null;
            }
            const valRect = ensure(
              Box.mergeBBs(valDoms.map((d) => d.getBoundingClientRect())),
              "Should return a Box"
            ).rect();
            const valScalerRect = frameToScalerRect(valRect, viewCtx);
            return (
              <div
                key={s.uid}
                className={`component-ctx-spotlight__slots__slot`}
                style={{
                  top: valScalerRect.top - focusedScalerRect!.top,
                  left: valScalerRect.left - focusedScalerRect!.left,
                  width: valScalerRect.width,
                  height: valScalerRect.height,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function getSpotlightDomInfo(viewCtx: ViewCtx) {
  const valComponent = maybe(viewCtx.currentComponentCtx(), (x: ComponentCtx) =>
    x.valComponent()
  );
  const $focused = valComponent
    ? maybe(
        viewCtx.renderState.sel2dom(valComponent, viewCtx.canvasCtx),
        (doms) => $(doms)
      )
    : undefined;

  const focusedElements =
    $focused && $focused.get().some(hasLayoutBox)
      ? $focused.get().filter(hasLayoutBox)
      : undefined;

  const focusedFrameRect =
    focusedElements && recomputeBounds($(focusedElements)).rect();
  const focusedScalerRect =
    focusedFrameRect && frameToScalerRect(focusedFrameRect, viewCtx);

  return {
    focusedElements,
    focusedScalerRect,
  };
}

export function getSpotlightInfo(viewCtx: ViewCtx) {
  const tplComponent = maybe(viewCtx.currentComponentCtx(), (x: ComponentCtx) =>
    x.tplComponent()
  );
  const valComponent = maybe(viewCtx.currentComponentCtx(), (x: ComponentCtx) =>
    x.valComponent()
  );
  const shouldRender =
    tplComponent && valComponent && !viewCtx.studioCtx.isLiveMode;

  return {
    tplComponent,
    valComponent,
    shouldRender,
  };
}
