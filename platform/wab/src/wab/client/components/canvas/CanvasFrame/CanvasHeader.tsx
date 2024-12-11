import { maybeShowContextMenu } from "@/wab/client/components/ContextMenu";
import {
  makeCanvasVariantContextMenu,
  StyleVariantEditor,
  VariantLabel,
} from "@/wab/client/components/VariantControls";
import { CanvasConfigButton } from "@/wab/client/components/canvas/CanvasFrame/CanvasConfigButton";
import styles from "@/wab/client/components/canvas/CanvasFrame/CanvasHeader.module.scss";
import { EditableLabelHandles } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import {
  useScaledElementRef,
  useZoomStyledRef,
} from "@/wab/client/hooks/useScaledElementRef";
import ComponentIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Component";
import PageIcon from "@/wab/client/plasmic/plasmic_kit_design_system/icons/PlasmicIcon__Page";
import { StudioCtx, useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { MaybeWrap } from "@/wab/commons/components/ReactUtil";
import {
  AnyArena,
  isComponentArena,
  isMixedArena,
  isPageArena,
} from "@/wab/shared/Arenas";
import {
  getDisplayVariants,
  isStyleOrCodeComponentVariant,
  StyleVariant,
} from "@/wab/shared/Variants";
import { cx } from "@/wab/shared/common";
import {
  isFrameComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import {
  ArenaFrame,
  Component,
  TplTag,
  Variant,
} from "@/wab/shared/model/classes";
import { Popover, Tooltip } from "antd";
import cn from "classnames";
import { observer } from "mobx-react";
import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";

export const CanvasHeader = observer(CanvasHeader_);

function CanvasHeader_(props: {
  studioCtx: StudioCtx;
  arena: AnyArena;
  frame: ArenaFrame;
}) {
  const { studioCtx, frame, arena } = props;
  const isFocused = studioCtx.focusedContentFrame() === frame;
  const isFocusedFrame = studioCtx.focusedViewCtx()?.arenaFrame() === frame;
  const shouldShowFrameConfigButton =
    !studioCtx.focusedMode && (!isComponentArena(arena) || isFocusedFrame);

  const rootRef = useScaledElementRef<HTMLDivElement>();

  useZoomStyledRef(
    (zoom) => ({ maxWidth: `${frame.width * zoom}px` }),
    rootRef
  );

  const [contentIsCollapsed, setContentIsCollapsed] = useState(false);
  useLayoutEffect(() => {
    if (rootRef.current) {
      setContentIsCollapsed(
        rootRef.current.offsetWidth < rootRef.current.scrollWidth
      );
    }
  }, [studioCtx.zoom]);

  return (
    <>
      <div
        ref={rootRef}
        className={cn(
          "CanvasFrame__Label flex flex-vcenter flex-no-shrink-children",
          {
            "CanvasFrame__Label--focused": isFocused,
          }
        )}
        onClick={async (e) => {
          if (studioCtx.isSpaceDown()) {
            // panning clicking.
            return;
          }
          e.stopPropagation();
          await studioCtx.changeUnsafe(() =>
            studioCtx.setStudioFocusOnFrame({ frame: frame, autoZoom: false })
          );
        }}
      >
        <CanvasHeaderContent
          showTooltip={
            studioCtx.focusedViewCtx()?.arenaFrame() !== frame &&
            contentIsCollapsed
          }
          studioCtx={studioCtx}
          frame={frame}
          arena={arena}
        />
      </div>
      {shouldShowFrameConfigButton && (
        <CanvasConfigButton showDims studioCtx={studioCtx} frame={frame} />
      )}
    </>
  );
}

const CanvasHeaderContent = observer(CanvasHeaderContent_);
function CanvasHeaderContent_(props: {
  studioCtx: StudioCtx;
  frame: ArenaFrame;
  arena: AnyArena;
  showTooltip: boolean;
}) {
  const { studioCtx, frame, arena, showTooltip } = props;
  const vc = studioCtx.focusedViewCtx();
  const component = frame.container.component;

  const arenaFrameNameLabel = studioCtx.tplMgr().describeArenaFrame(frame);
  const displayVariants = getDisplayVariants({
    frame,
    site: studioCtx.site,
    isPageArena: isPageArena(arena),
    focusedTag: vc && (vc.focusedTpl() as TplTag),
  })
    .map((it) => it.displayName)
    .join(" + ");

  const componentIcon = (
    <Icon
      icon={isPageComponent(component) ? PageIcon : ComponentIcon}
      className="flex-no-shrink dimdimfg mr-xsm"
    />
  );

  return (
    <MaybeWrap
      cond={showTooltip}
      wrapper={(children) => (
        <Tooltip
          placement={"topLeft"}
          title={
            <div>
              {isMixedArena(studioCtx.currentArena) && (
                <>
                  {componentIcon} {arenaFrameNameLabel}
                </>
              )}
              {displayVariants && (
                <div
                  className={
                    isMixedArena(studioCtx.currentArena)
                      ? styles.tooltipVariantsContainer
                      : undefined
                  }
                >
                  {displayVariants}
                </div>
              )}
            </div>
          }
        >
          {children}
        </Tooltip>
      )}
    >
      {isMixedArena(arena) && (
        <>
          {!isFrameComponent(component) && componentIcon}
          <span className="mr-ch">{arenaFrameNameLabel}</span>
        </>
      )}
      <CanvasVariantsDesc
        studioCtx={studioCtx}
        frame={frame}
        isPageArena={isPageArena(arena)}
      />
    </MaybeWrap>
  );
}

export const CanvasVariantsDesc = observer(CanvasVariantsDesc_);

export const VariantName = observer(function VariantName_({
  variant,
  isSelected,
  component,
}: {
  isSelected: boolean;
  variant: Variant;
  component: Component;
}) {
  const studioCtx = useStudioCtx();
  const variantLabelRef = useRef<EditableLabelHandles>(null);
  const [showStyleVariantEditor, setShowStyleVariantEditor] = useState(false);

  return (
    <span
      key={variant.uuid}
      className={cx("CanvasFrame__Label__variant", {
        "CanvasFrame__Label__variant--target": isSelected,
      })}
      onContextMenu={(e: any) => {
        e.preventDefault();
        maybeShowContextMenu(
          e,
          makeCanvasVariantContextMenu({
            studioCtx,
            variant,
            component,
            onRequestEditing: () => {
              if (isStyleOrCodeComponentVariant(variant)) {
                setShowStyleVariantEditor(true);
              } else {
                variantLabelRef.current?.setEditing(true);
              }
            },
          })
        );
      }}
    >
      <MaybeWrap
        cond={isStyleOrCodeComponentVariant(variant)}
        wrapper={(children) => (
          <Popover
            placement="left"
            transitionName=""
            destroyTooltipOnHide
            visible={showStyleVariantEditor}
            content={() => (
              <StyleVariantEditor
                variant={variant as StyleVariant}
                component={component}
                onDismiss={() => setShowStyleVariantEditor(false)}
              />
            )}
          >
            {children}
          </Popover>
        )}
      >
        <VariantLabel
          ref={variantLabelRef}
          doubleClickToEdit // Single-click to edit is disabled
          variant={variant}
          isRecording={isSelected}
        />
      </MaybeWrap>
    </span>
  );
});

function CanvasVariantsDesc_(props: {
  studioCtx: StudioCtx;
  frame: ArenaFrame;
  isPageArena?: boolean;
}) {
  const { studioCtx, frame } = props;

  if (frame === studioCtx.focusedViewCtx()?.arenaFrame()) {
    // Variants description in the recording panel instead
    return null;
  }

  const vc = studioCtx.tryGetViewCtxForFrame(frame);
  const displayVariants = getDisplayVariants({
    frame,
    site: studioCtx.site,
    isPageArena: props.isPageArena,
    focusedTag: vc && (vc.focusedTpl() as TplTag),
  });

  return (
    <div className="inline-flex flex-fill">
      {displayVariants.map((displayVariant) => (
        <VariantName
          key={displayVariant.variant.uuid}
          {...displayVariant}
          component={frame.container.component}
        />
      ))}
    </div>
  );
}
