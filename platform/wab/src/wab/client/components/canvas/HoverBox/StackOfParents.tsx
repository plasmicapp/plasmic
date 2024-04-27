import { TplNode } from "@/wab/classes";
import styles from "@/wab/client/components/canvas/HoverBox/StackOfParents.module.scss";
import { createNodeIcon } from "@/wab/client/components/sidebar-tabs/tpl-tree";
import { FRAME_ICON, SLOT_ICON } from "@/wab/client/icons";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { getSlotSelectionDisplayName } from "@/wab/client/utils/tpl-client-utils";
import { Selectable, SQ } from "@/wab/selection";
import { FrameViewMode } from "@/wab/shared/Arenas";
import { SlotSelection } from "@/wab/slots";
import * as cssVariables from "@/wab/styles/css-variables";
import {
  isTplNamable,
  isTplTagOrComponent,
  isTplVariantable,
  summarizeTpl,
} from "@/wab/tpls";
import { observer } from "mobx-react";
import * as React from "react";
import { RefObject, useEffect, useMemo, useRef } from "react";

const AUTO_HIDE_TIMEOUT = 2000;

function useParentsOfFocusedSelectable() {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedViewCtx();
  const focusedSelectable = viewCtx?.focusedSelectable();
  const valUserRoot = viewCtx?.valState().maybeValUserRoot();
  const isValRendered = !!valUserRoot;

  const parentsChain = useMemo(
    () =>
      !isValRendered ||
      !focusedSelectable ||
      (focusedSelectable instanceof SlotSelection && !focusedSelectable.val)
        ? []
        : SQ(focusedSelectable, viewCtx!.valState(), false)
            .parents()
            .toArray()
            .map((selectable) => {
              const tpl = selectable.tpl;

              const isFrame =
                selectable === valUserRoot &&
                viewCtx?.arenaFrame().viewMode === FrameViewMode.Stretch;

              const name =
                selectable instanceof SlotSelection
                  ? getSlotSelectionDisplayName(selectable, viewCtx)
                  : isFrame
                  ? studioCtx
                      .tplMgr()
                      .describeArenaFrame(viewCtx?.arenaFrame()!)
                  : isTplNamable(tpl) && tpl.name
                  ? tpl.name
                  : summarizeTpl(
                      tpl!,
                      isTplVariantable(tpl)
                        ? viewCtx?.effectiveCurrentVariantSetting(tpl).rsh()
                        : undefined
                    );

              const icon =
                selectable instanceof SlotSelection
                  ? SLOT_ICON
                  : isFrame
                  ? FRAME_ICON
                  : createNodeIcon(
                      tpl as TplNode,
                      isTplTagOrComponent(tpl)
                        ? viewCtx?.effectiveCurrentVariantSetting(tpl)
                        : undefined
                    );

              return {
                key:
                  (selectable instanceof SlotSelection &&
                    selectable.val?.fullKey) ||
                  tpl?.uuid,
                selectable,
                name,
                icon,
              };
            })
            .reverse(),
    [viewCtx, focusedSelectable, isValRendered]
  );

  return parentsChain;
}

export const StackOfParents = observer(StackOfParents_);

function StackOfParents_({
  hoverTagRef,
}: {
  hoverTagRef: RefObject<HTMLDivElement>;
}) {
  const studioCtx = useStudioCtx();
  const viewCtx = studioCtx.focusedViewCtx();
  const focusedSelectable = viewCtx?.focusedSelectable();
  const parentsChain = useParentsOfFocusedSelectable();

  useEffect(
    () => () => {
      studioCtx.showStackOfParents = false;
    },
    [focusedSelectable]
  );

  const onClickItem = (val?: Selectable) => (e: React.MouseEvent) => {
    if (val && viewCtx) {
      viewCtx.change(() =>
        viewCtx.getViewOps().tryFocusObj(val, {
          anchorCloneKey: viewCtx.focusedCloneKey(),
          appendToMultiSelection: e.shiftKey,
          exact: true,
        })
      );
    }
  };

  const onMouseEnter = (val?: Selectable) => () =>
    viewCtx &&
    viewCtx.setViewCtxHoverBySelectable(val, viewCtx.focusedCloneKey());

  const onMouseLeave = () => viewCtx?.setViewCtxHoverBySelectable(null);

  const autoHideTimeoutRef = useRef(0);

  const cancelAutoHide = () => clearTimeout(autoHideTimeoutRef.current);

  const scheduleAutoHide = () => {
    cancelAutoHide();
    autoHideTimeoutRef.current = +setTimeout(() => {
      studioCtx.showStackOfParents = false;
    }, AUTO_HIDE_TIMEOUT);
  };

  useEffect(() => {
    if (studioCtx.showStackOfParents) {
      scheduleAutoHide();
    } else {
      // To make sure there's no pending auto-hide execution
      cancelAutoHide();
    }
  }, [studioCtx.showStackOfParents]);

  useEffect(() => {
    if (hoverTagRef.current) {
      hoverTagRef.current.addEventListener("mouseenter", cancelAutoHide);
      hoverTagRef.current.addEventListener("mouseleave", scheduleAutoHide);
    }

    return () => {
      if (hoverTagRef.current) {
        hoverTagRef.current.removeEventListener("mouseenter", cancelAutoHide);
        hoverTagRef.current.removeEventListener("mouseleave", scheduleAutoHide);
      }
    };
  }, [hoverTagRef.current]);

  return !parentsChain.length ? null : !studioCtx.showStackOfParents ? (
    <div className={styles.visualHint} />
  ) : (
    <div
      className={styles.root}
      onMouseEnter={cancelAutoHide}
      onMouseLeave={scheduleAutoHide as any}
    >
      {parentsChain.map((it, i) => (
        <div
          key={it.key}
          className={styles.stackItem}
          onClick={onClickItem(it.selectable)}
          onMouseEnter={onMouseEnter(it.selectable)}
          onMouseLeave={onMouseLeave}
        >
          <div
            className={styles.stackItemBackground}
            style={{
              background: `var(${cssVariables.selectionControlsColor})`,
              filter: `brightness(${1 + (i - parentsChain.length) * 0.07})`,
            }}
          />
          <div>
            {it.icon} {it.name}
          </div>
        </div>
      ))}
    </div>
  );
}
