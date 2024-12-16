import { getBoundingClientRect, getOffsetPoint } from "@/wab/client/dom";
import { removeFromArray } from "@/wab/commons/collections";
import { joinReactNodes } from "@/wab/commons/components/ReactUtil";
import { derefTokenRefs, isTokenRef } from "@/wab/commons/StyleToken";
import { AddItemKey, WrapItemKey } from "@/wab/shared/add-item-keys";
import {
  FrameViewMode,
  isDuplicatableFrame,
  isMixedArena,
  isPositionManagedFrame,
} from "@/wab/shared/Arenas";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  hasMaxWidthVariant,
  hasNonResponsiveColumnsStyle,
  redistributeColumnsSizes,
} from "@/wab/shared/columns-utils";
import * as common from "@/wab/shared/common";
import {
  assert,
  ensure,
  ensureArray,
  ensureInstance,
  ensureString,
  maybe,
  omitNils,
  switchType,
  tuple,
  unexpected,
  withoutNils,
} from "@/wab/shared/common";
import * as Components from "@/wab/shared/core/components";
import {
  cloneVariant,
  ComponentType,
  isCodeComponent,
  isFrameComponent,
  isPageComponent,
} from "@/wab/shared/core/components";
import * as exprs from "@/wab/shared/core/exprs";
import { codeLit } from "@/wab/shared/core/exprs";
import { mkImageAssetRef } from "@/wab/shared/core/image-assets";
import { isTagListContainer } from "@/wab/shared/core/rich-text-util";
import {
  isSelectable,
  Selectable,
  SelQuery,
  SQ,
} from "@/wab/shared/core/selection";
import {
  CONTENT_LAYOUT_FULL_BLEED,
  CONTENT_LAYOUT_WIDTH_OPTIONS,
  contentLayoutChildProps,
  defaultCopyableStyleNames,
  flexChildProps,
  getAllDefinedStyles,
  gridChildProps,
  ignoredConvertablePlainTextProps,
  slotCssProps,
  typographyCssProps,
  WRAP_AS_PARENT_PROPS,
} from "@/wab/shared/core/style-props";
import {
  getCssInitial,
  parseCssNumericNew,
  tryGetCssInitial,
} from "@/wab/shared/css";
import { AddItemPrefs, getSimplifiedStyles } from "@/wab/shared/default-styles";
import {
  computeDefinedIndicator,
  getTargetBlockingCombo,
} from "@/wab/shared/defined-indicator";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  adaptEffectiveVariantSetting,
  EffectiveVariantSetting,
} from "@/wab/shared/effective-variant-setting";
import {
  Box,
  isStandardSide,
  Pt,
  Rect,
  Side,
  sideToOrient,
} from "@/wab/shared/geom";
import { FRAME_LOWER } from "@/wab/shared/Labels";
import {
  ContainerLayoutType,
  ContainerType,
  convertSelfContainerType,
  convertToAbsolutePosition,
  convertToRelativePosition,
  convertToSlotContent,
  getRshContainerType,
  getRshPositionType,
  isContainerTypeVariantable,
  PositionLayoutType,
} from "@/wab/shared/layoututils";
import {
  ArenaFrame,
  Component,
  CustomCode,
  ensureKnownEventHandler,
  isKnownArenaFrame,
  isKnownEventHandler,
  isKnownExprText,
  isKnownImageAssetRef,
  isKnownNodeMarker,
  isKnownRenderExpr,
  isKnownTplComponent,
  isKnownTplNode,
  isKnownTplRef,
  isKnownTplTag,
  ObjectPath,
  Param,
  RawText,
  RichText,
  State,
  StyleToken,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Variant,
  VariantSetting,
} from "@/wab/shared/model/classes";
import { notification } from "antd";
import $ from "jquery";
import L, { clamp, isArray, merge } from "lodash";
import pluralize from "pluralize";
import React from "react";

import {
  FrameClip,
  isStyleClip,
  StyleClip,
  TplClip,
} from "@/wab/client/clipboard/local";
import { closestTaggedNonTextDomElt } from "@/wab/client/components/canvas/studio-canvas-util";
import { toast } from "@/wab/client/components/Messages";
import { promptExtractComponent } from "@/wab/client/components/modals/ExtractComponentModal";
import { promptWrapInComponent } from "@/wab/client/components/modals/WrapInComponentModal";
import { reactConfirm } from "@/wab/client/components/quick-modals";
import { getTreeNodeVisibility } from "@/wab/client/components/sidebar-tabs/OutlineCtx";
import {
  ensureTplColumnRs,
  ensureTplColumnsRs,
  getScreenVariant,
  makeTplColumn,
} from "@/wab/client/components/sidebar-tabs/ResponsiveColumns/tpl-columns-utils";
import { TargetBlockedTooltip } from "@/wab/client/components/sidebar/sidebar-helpers";
import { createAddTplComponent } from "@/wab/client/components/studio/add-drawer/AddDrawer";
import { OneShortcutCombo } from "@/wab/client/components/studio/Shortcuts";
import { LinkButton } from "@/wab/client/components/widgets";
import { AddTplItem, WRAPPERS_MAP } from "@/wab/client/definitions/insertables";
import {
  Adoptee,
  calcOffset,
  insertBySpec,
  InsertionSpec,
} from "@/wab/client/Dnd";
import { getBackgroundImageProps } from "@/wab/client/dom-utils";
import { showError } from "@/wab/client/ErrorNotifications";
import { FocusHeuristics } from "@/wab/client/focus-heuristics";
import { renderCantAddMsg } from "@/wab/client/messages/parenting-msgs";
import { promptComponentName, promptPageName } from "@/wab/client/prompts";
import { getComboForAction } from "@/wab/client/shortcuts/studio/studio-shortcuts";
import { ComponentCtx } from "@/wab/client/studio-ctx/component-ctx";
import { ensureBaseRs, ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { trackEvent } from "@/wab/client/tracking";
import {
  fontWeightOptions,
  isValidFontWeight,
} from "@/wab/client/typography-utils";
import { UndoRecord } from "@/wab/client/undo-log";
import {
  canSetDisplayNone,
  getContainerType,
} from "@/wab/client/utils/tpl-client-utils";
import {
  allGlobalVariants,
  allStyleTokens,
  DEFAULT_THEME_TYPOGRAPHY,
  isTplAttachedToSite,
  writeable,
} from "@/wab/shared/core/sites";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  findImplicitStatesOfNodesInTree,
  findImplicitUsages,
  getStateDisplayName,
  isPrivateState,
  isStateUsedInExpr,
} from "@/wab/shared/core/states";
import { px } from "@/wab/shared/core/styles";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  isTplComponent,
  isTplVariantable,
  RawTextLike,
} from "@/wab/shared/core/tpls";
import * as ValNodes from "@/wab/shared/core/val-nodes";
import {
  isSelectableValNode,
  slotContentValNode,
  ValComponent,
  ValNode,
  ValSlot,
  ValTag,
} from "@/wab/shared/core/val-nodes";
import {
  asTpl,
  asTplOrSlotSelection,
  equivTplOrSlotSelection,
} from "@/wab/shared/core/vals";
import {
  canAddChildren,
  canAddChildrenAndWhy,
  canAddChildrenToSlotSelection,
  canAddSiblings,
  canAddSiblingsAndWhy,
} from "@/wab/shared/parenting";
import {
  hasTypography,
  RSH,
  RuleSetHelpers,
} from "@/wab/shared/RuleSetHelpers";
import {
  isSizeProp,
  isTplAutoSizable,
  isTplDefaultSized,
  isTplResizable,
  resetTplSize,
} from "@/wab/shared/sizingutils";
import {
  getAncestorTplSlot,
  getParentOrSlotSelection,
  getSingleTextBlockFromArg,
  getSlotParams,
  getTplSlotDescendants,
  isPlainTextTplSlot,
  isTextBlockArg,
} from "@/wab/shared/SlotUtils";
import { capitalizeFirst } from "@/wab/shared/strs";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  ComponentCycleUserError,
  NestedTplSlotsError,
} from "@/wab/shared/UserError";
import {
  makeVariantComboSorter,
  sortedVariantSettingStack,
} from "@/wab/shared/variant-sort";
import {
  ensureBaseVariantSetting,
  ensureVariantSetting,
  isBaseVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  tryGetBaseVariantSetting,
  tryGetPrivateStyleVariant,
  VariantCombo,
} from "@/wab/shared/Variants";
import {
  clearTplVisibility,
  getEffectiveTplVisibility,
  getTplVisibilityAsDescendant,
  getVariantSettingVisibility,
  isVisibilityHidden,
  setTplVisibility,
  TplVisibility,
} from "@/wab/shared/visibility-utils";

export class ViewOps {
  _viewCtx: ViewCtx;

  constructor(opts: { viewCtx: ViewCtx }) {
    this._viewCtx = opts.viewCtx;
  }

  viewCtx() {
    return this._viewCtx;
  }

  private change(f: () => void) {
    this.viewCtx().change(f);
  }

  private valState() {
    return this.viewCtx().valState();
  }

  private tplMgr() {
    return this.viewCtx().tplMgr();
  }

  private site() {
    return this.viewCtx().site;
  }

  private canvasCtx() {
    return this.viewCtx().canvasCtx;
  }

  clipboard() {
    return this.viewCtx().clipboard;
  }

  /**
   * If the element is a text element or a component with just a single visible text slot, start editing it
   * If the element is a component instance, enter in spotlight mode
   * @param target
   */
  deepFocusElement(
    target: JQuery | undefined | null,
    trigger: "ctrl-click" | "dbl-click"
  ) {
    if (!target) {
      return;
    }

    const selectable = this.viewCtx().dom2val(target);
    const cloneKey = this.viewCtx().sel2cloneKey(selectable);

    this.viewCtx().change(() => {
      if (
        selectable &&
        this.tryEnterComponentContaining(selectable, trigger, cloneKey)
      ) {
        return;
      }
      this.tryEditText();
    });
  }

  moveForward(tpl?: TplNode) {
    tpl = tpl || this.viewCtx().focusedTpl() || undefined;
    if (tpl) {
      this.change(() => $$$(tpl!).moveForward());
    }
  }
  moveBackward(tpl?: TplNode) {
    tpl = tpl || this.viewCtx().focusedTpl() || undefined;
    if (tpl) {
      this.change(() => $$$(tpl!).moveBackward());
    }
  }

  moveStart(tpl?: TplNode) {
    tpl = tpl || this.viewCtx().focusedTpl() || undefined;
    if (tpl) {
      this.change(() => $$$(tpl!).moveStart());
    }
  }
  moveEnd(tpl?: TplNode) {
    tpl = tpl || this.viewCtx().focusedTpl() || undefined;
    if (tpl) {
      this.change(() => $$$(tpl!).moveEnd());
    }
  }

  nudgePosition(dir: "left" | "right" | "up" | "down", large = false) {
    const tpl = this.viewCtx().focusedTpl();

    if (
      this.studioCtx().focusedFrame() === this.viewCtx().arenaFrame() ||
      (tpl && this.isRootNodeOfFrame(tpl))
    ) {
      // We should nudge the frame instead
      const frame = this.viewCtx().arenaFrame();
      const prop = ["left", "right"].includes(dir) ? "left" : "top";
      if (frame[prop] != null) {
        const cur = frame[prop] as number;
        const amount =
          1 * (large ? 10 : 1) * (["left", "up"].includes(dir) ? -1 : 1);
        frame[prop] = cur + amount;
      }
      return;
    }

    if (!tpl || !Tpls.isTplTagOrComponent(tpl)) {
      return;
    }

    const nudgeOrder = (delta: number) => {
      if (delta >= 0) {
        if (large) {
          $$$(tpl).moveEnd();
        } else {
          $$$(tpl).moveForward();
        }
      } else {
        if (large) {
          $$$(tpl).moveStart();
        } else {
          $$$(tpl).moveBackward();
        }
      }
    };

    if (isKnownTplComponent(tpl.parent)) {
      return nudgeOrder(["left", "up"].includes(dir) ? -1 : 1);
    }

    const parent = $$$(tpl).layoutParent().maybeOneTpl();
    if (!Tpls.isTplTag(parent)) {
      return;
    }

    const vtm = this.viewCtx().variantTplMgr();
    const curExp = vtm.effectiveVariantSetting(tpl).rsh();
    const targetExp = () => RSH(vtm.ensureCurrentVariantSetting(tpl).rs, tpl);

    const parentExp = this.viewCtx()
      .effectiveCurrentVariantSetting(parent)
      .rsh();
    const parentContainerType = getRshContainerType(parentExp);
    const posType = getRshPositionType(curExp);

    const nudgeAlignment = (
      prop: string,
      selfValue: string | undefined,
      parentValue: string,
      delta: number
    ) => {
      const alignOrder = ["flex-start", "center", "flex-end"];
      let curAlignSelf = selfValue;
      if (!curAlignSelf || !alignOrder.includes(curAlignSelf)) {
        // If no align-self is currently specified, we use the default based on
        // what the parent's align-items is
        curAlignSelf = alignOrder.includes(parentValue)
          ? parentValue
          : alignOrder[0];
      }
      const curIndex = alignOrder.indexOf(curAlignSelf);
      const newIndex = large
        ? delta >= 0
          ? alignOrder.length - 1
          : 0
        : Math.min(alignOrder.length - 1, Math.max(0, curIndex + delta));
      if (0 <= newIndex && newIndex < alignOrder.length) {
        // Only set align-self we're within the index range (so if we're already
        // on flex-start and we nudge -1, we don't do anything)
        let newAlignSelf = alignOrder[newIndex];
        if (newAlignSelf === parentValue) {
          // If happens to be the same as parent, then set to auto
          newAlignSelf = "auto";
        }
        targetExp().set(prop, newAlignSelf);
      }
    };

    if (
      posType === PositionLayoutType.free ||
      posType === PositionLayoutType.fixed
    ) {
      const nudgePx = (prop: string, delta: number) => {
        if (large) {
          delta *= 10;
        }
        const cur = curExp.get(prop);
        const curNum = (cur && parseInt(cur)) || 0;
        targetExp().set(prop, `${curNum + delta}px`);
      };

      const oppositeSide = (side: "left" | "top") => {
        if (side === "left") {
          return "right";
        }
        return "bottom";
      };

      const getSideDir = (side: "left" | "top") => {
        const hasSide = curExp.get(side) !== "auto";
        const sideDir = hasSide ? side : oppositeSide(side);
        const sideSignal = hasSide ? 1 : -1;
        return { sideDir, sideSignal };
      };

      const leftDir = getSideDir("left");
      const topDir = getSideDir("top");

      switch (dir) {
        case "left":
          return nudgePx(leftDir.sideDir, -1 * leftDir.sideSignal);
        case "right":
          return nudgePx(leftDir.sideDir, 1 * leftDir.sideSignal);
        case "up":
          return nudgePx(topDir.sideDir, -1 * topDir.sideSignal);
        case "down":
          return nudgePx(topDir.sideDir, 1 * topDir.sideSignal);
      }
    } else if (
      parentContainerType === ContainerLayoutType.flexRow ||
      parentContainerType === ContainerLayoutType.flexColumn
    ) {
      const nudgeAlignSelf = (delta: number) => {
        // When parent is flex-row and we press up or down, we want to switch alignment
        // of this item between flex-start, center, and flex-end.
        return nudgeAlignment(
          "align-self",
          curExp.get("align-self"),
          parentExp.get("align-items"),
          delta
        );
      };
      if (parentContainerType === ContainerLayoutType.flexRow) {
        switch (dir) {
          case "left":
            return nudgeOrder(-1);
          case "right":
            return nudgeOrder(1);
          case "up":
            return nudgeAlignSelf(-1);
          case "down":
            return nudgeAlignSelf(1);
        }
      } else if (parentContainerType === ContainerLayoutType.flexColumn) {
        switch (dir) {
          case "left":
            return nudgeAlignSelf(-1);
          case "right":
            return nudgeAlignSelf(1);
          case "up":
            return nudgeOrder(-1);
          case "down":
            return nudgeOrder(1);
        }
      }
    } else if (parentContainerType === ContainerLayoutType.grid) {
      switch (dir) {
        case "left":
          return nudgeOrder(-1);
        case "right":
          return nudgeOrder(1);
        default:
          return;
      }
    } else if (parentContainerType === ContainerLayoutType.contentLayout) {
      const nudgeJustifySelf = (delta: number) => {
        return nudgeAlignment(
          "justify-self",
          curExp.get("justify-self"),
          parentExp.get("justify-items"),
          delta
        );
      };
      switch (dir) {
        case "left":
          return nudgeJustifySelf(-1);
        case "right":
          return nudgeJustifySelf(1);
        case "up":
          return nudgeOrder(-1);
        case "down":
          return nudgeOrder(1);
        default:
          return;
      }
    }
  }

  /**
   * Performs a quick frame rect change, without
   * enforcing the reevaluation of the tpl tree
   *
   * @param rect
   */
  quicklyChangeFrameRect(
    frame: ArenaFrame,
    rect: {
      width: number;
      height: number;
      top: number;
      left: number;
    }
  ) {
    // Even though the following styles will react to
    // changes made to frame's top and left props,
    // to make sure we have a smooth resizing,
    // we directly update them here
    if (isPositionManagedFrame(this.studioCtx(), frame)) {
      const domElt = this.viewCtx().canvasCtx.viewportContainer();
      domElt.style.setProperty("width", `${rect.width}px`);
      domElt.style.setProperty("height", `${rect.height}px`);

      domElt.style.setProperty("top", `${rect.top}px`);
      domElt.style.setProperty("left", `${rect.left}px`);
    }

    window.requestAnimationFrame(() => {
      this.change(() => {
        if (isPositionManagedFrame(this.studioCtx(), frame)) {
          frame.top = rect.top;
          frame.left = rect.left;
        }

        this.studioCtx().changeFrameSize({
          frame,
          dim: "width",
          amount: rect.width,
        });
        this.studioCtx().changeFrameSize({
          frame,
          dim: "height",
          amount: rect.height,
        });
      });
    });
  }

  nudgeSize(dim: "width" | "height", grow: boolean, large = false) {
    const tpl = this.viewCtx().focusedTpl();

    if (
      this.studioCtx().focusedFrame() === this.viewCtx().arenaFrame() ||
      (tpl && this.isRootNodeOfFrame(tpl))
    ) {
      // We should nudge the frame instead
      const frame = this.viewCtx().arenaFrame();
      const amount = 1 * (large ? 10 : 1) * (grow ? 1 : -1);
      this.studioCtx().changeFrameSize({
        dim: dim,
        amount: frame[dim] + amount,
      });
      return;
    }

    if (!tpl || !Tpls.isTplTagOrComponent(tpl)) {
      return;
    }

    const resizable = isTplResizable(tpl, this.viewCtx().variantTplMgr());
    if (!resizable[dim]) {
      return;
    }

    const parent = tpl.parent;
    const vtm = this.viewCtx().variantTplMgr();
    const targetExp = () => RSH(vtm.ensureCurrentVariantSetting(tpl).rs, tpl);

    const parentExp = Tpls.isTplTag(parent)
      ? vtm.effectiveVariantSetting(parent).rsh()
      : undefined;
    const parentContainerType = parentExp
      ? getRshContainerType(parentExp)
      : undefined;
    const autoDim = isTplDefaultSized(tpl, vtm, dim);

    if (
      autoDim &&
      parentExp &&
      parentContainerType &&
      parentContainerType.includes("flex")
    ) {
      const nudgeFlex = () => {
        if (grow) {
          targetExp().set("flex-grow", "1");
        } else {
          targetExp().set("flex-grow", "0");
        }
      };
      const nudgeStretch = () => {
        if (grow) {
          targetExp().set("align-self", "stretch");
        } else {
          targetExp().set("align-self", "flex-start");
        }
      };
      if (parentContainerType === ContainerLayoutType.flexRow) {
        if (dim === "width") {
          nudgeFlex();
        } else {
          nudgeStretch();
        }
      } else {
        if (dim === "height") {
          nudgeFlex();
        } else {
          nudgeStretch();
        }
      }
    } else {
      const delta = (large ? 10 : 1) * (grow ? 1 : -1);
      const curNum = ensure(
        this.viewCtx().focusedDomElt(),
        "Unexpected undefined focusedDomElt when nudging size"
      )[0].getBoundingClientRect()[dim];
      targetExp().set(dim, `${Math.max(0, curNum + delta)}px`);
    }
  }

  async wrapInComponent(target?: TplNode | TplNode[]): Promise<void> {
    const targets = target
      ? ensureArray(target)
      : this.viewCtx().focusedTplsOrSlotSelections();
    if (!targets || targets.length === 0) {
      return;
    }
    const targetTpls = targets.filter((t) => isKnownTplNode(t)) as TplNode[];
    if (targetTpls.length !== targets.length || !Tpls.areSiblings(targetTpls)) {
      notification.error({
        message: "Cannot wrap non-sibling nodes.",
        description: "This is not supported at the moment.",
      });
      return;
    }
    const tpls =
      targetTpls.length > 1 ? Tpls.sortByTreeOrder(targetTpls) : targetTpls;
    if (Tpls.hasTextAncestor(tpls[0])) {
      notification.error({
        message: "Cannot wrap text inside rich text block into a component.",
        description: "This feature is not supported at the moment.",
      });
      return;
    }
    const selectedComponent = await promptWrapInComponent({
      studioCtx: this.studioCtx(),
      component: this.viewCtx().currentComponent(),
    });
    if (!selectedComponent) {
      return;
    }
    let moveRep = false;
    if (
      tpls.length === 1 &&
      isTplVariantable(tpls[0]) &&
      tpls[0].vsettings[0].dataRep
    ) {
      moveRep = !!(await reactConfirm({
        message:
          "You're wrapping a repeated element. Do you want to repeat the new component instance?",
        confirmLabel: "Move repetition to component instance",
        cancelLabel: "Wrap repeated items in the component children",
      }));
    }
    const spec = createAddTplComponent(selectedComponent);
    const extraInfo = spec.asyncExtraInfo
      ? await spec.asyncExtraInfo(this.viewCtx().studioCtx)
      : undefined;
    if (extraInfo === false) {
      return;
    }
    this.doWrap(spec, tpls, moveRep, extraInfo);
  }

  async wrapInContainer(
    type: ContainerType,
    target?: TplNode | TplNode[]
  ): Promise<void> {
    const targets = target
      ? ensureArray(target)
      : this.viewCtx().focusedTplsOrSlotSelections();
    if (!targets || targets.length === 0) {
      return;
    }
    const targetTpls = targets.filter((t) => isKnownTplNode(t)) as TplNode[];
    if (targetTpls.length !== targets.length || !Tpls.areSiblings(targetTpls)) {
      notification.error({
        message: "Cannot wrap non-sibling nodes.",
        description: "This is not supported at the moment.",
      });
      return;
    }
    const tpls =
      targetTpls.length > 1 ? Tpls.sortByTreeOrder(targetTpls) : targetTpls;
    if (Tpls.hasTextAncestor(tpls[0])) {
      notification.error({
        message: "Cannot wrap text inside rich text block into a container.",
        description: "This feature is not supported at the moment.",
      });
      return;
    }
    let moveRep = false;
    if (
      tpls.length === 1 &&
      isTplVariantable(tpls[0]) &&
      tpls[0].vsettings[0].dataRep
    ) {
      moveRep = !!(await reactConfirm({
        message:
          "You're wrapping a repeated element. Do you want to repeat the new container?",
        confirmLabel: "Move repetition to container",
        cancelLabel: "Wrap repeated items in the container",
      }));
    }
    const spec = WRAPPERS_MAP[
      type === "flex-row" ? WrapItemKey.hstack : WrapItemKey.vstack
    ] as AddTplItem;
    const extraInfo = spec.asyncExtraInfo
      ? await spec.asyncExtraInfo(this.viewCtx().studioCtx)
      : undefined;
    if (extraInfo === false) {
      return;
    }
    this.doWrap(spec, tpls, moveRep, extraInfo);
  }

  private doWrap(
    spec: AddTplItem<any>,
    tpls: TplNode[],
    moveRep: boolean,
    extraInfo?: any
  ) {
    let newNode: TplNode | null = null;
    this.change(() => {
      newNode = this.tryInsertInsertableSpec(
        spec,
        InsertRelLoc.wrap,
        extraInfo,
        tpls[0]
      );
      if (newNode) {
        assert(
          Tpls.isTplTag(newNode) ||
            (Tpls.isTplComponent(newNode) && Tpls.hasChildrenSlot(newNode)),
          "Container created by 'wrap in container' is expected to be TplTag or TplComponent with children slot"
        );
        for (let i = 1; i < tpls.length; i++) {
          $$$(tpls[i]).detach();
          $$$(newNode).append(tpls[i]);
        }
        this.viewCtx().selectNewTpl(newNode, true);
        if (moveRep) {
          assert(
            Tpls.isTplVariantable(tpls[0]),
            "moveRep should not be true if tpl is not variantable"
          );
          newNode.vsettings[0].dataRep = tpls[0].vsettings[0].dataRep;
          tpls[0].vsettings[0].dataRep = null;
        }
      }
    });
    return newNode;
  }

  getNextCycledAutoLayoutType(tpl: TplTag) {
    const rsh = this.viewCtx()
      .variantTplMgr()
      .effectiveVariantSetting(tpl)
      .rsh();
    const containerType = getRshContainerType(rsh);
    const toggleTypes: ContainerType[] = ["free", "flex-row", "flex-column"];
    const curIndex = Math.max(0, toggleTypes.indexOf(containerType));
    const nextIndex = (curIndex + 1) % toggleTypes.length;
    return toggleTypes[nextIndex];
  }

  private getUndoHead = () => this.viewCtx().studioCtx.undoLog.head();
  private undoRecordAfterLastAutoLayoutGuess?: UndoRecord;
  toggleAutoLayout(tpl = this.viewCtx().focusedTpl()) {
    if (
      tpl &&
      Tpls.isTplTag(tpl) &&
      Tpls.isTplContainer(tpl) &&
      !Tpls.isCodeComponentRoot(tpl)
    ) {
      const { nextAutoLayoutType, reorderedChildren, isGuess } =
        this.getNextAutoLayoutInfo(tpl);
      this.viewCtx().change(() => {
        this.convertContainerType(tpl, nextAutoLayoutType, reorderedChildren);
      });
      this.viewCtx().postEval(() => {
        if (isGuess) {
          this.undoRecordAfterLastAutoLayoutGuess = this.getUndoHead();
        }
      });
    }
  }

  setHstackLayout(tpl = this.viewCtx().focusedTpl()) {
    if (tpl) {
      this.setStackLayout(tpl, "flex-row");
    }
  }

  setVstackLayout(tpl = this.viewCtx().focusedTpl()) {
    if (tpl) {
      this.setStackLayout(tpl, "flex-column");
    }
  }

  /**
   * Perform stack conversion along with best-effort reordering of children
   * based on any available current rendered positions.
   */
  setStackLayout(tpl: TplNode, desiredDir: ContainerType) {
    if (
      Tpls.isTplTag(tpl) &&
      Tpls.isTplContainer(tpl) &&
      !Tpls.isCodeComponentRoot(tpl)
    ) {
      const doit = (reorderedChildren?: TplNode[]) => {
        this.viewCtx().change(() => {
          this.convertContainerType(tpl, desiredDir, reorderedChildren);
        });
      };
      const selectable = this.viewCtx().focusedTpl()
        ? this.viewCtx().focusedSelectable()
        : this.viewCtx().renderState.tpl2bestVal(
            tpl,
            this.viewCtx().focusedCloneKey()
          );
      const rsh = this.viewCtx()
        .variantTplMgr()
        .effectiveVariantSetting(tpl)
        .rsh();
      if (selectable instanceof ValTag && getRshContainerType(rsh) === "free") {
        const { children } = this.getContainerRectAndChildren(selectable);
        const [_, reorderedChildren] = this.linearizeItems(
          children,
          desiredDir
        );
        doit(reorderedChildren);
      } else {
        doit(tpl.children);
      }
    }
  }

  getNextAutoLayoutInfo(tpl: TplTag) {
    const selectable = this.viewCtx().focusedTpl()
      ? this.viewCtx().focusedSelectable()
      : this.viewCtx().renderState.tpl2bestVal(
          tpl,
          this.viewCtx().focusedCloneKey()
        );
    const rsh = this.viewCtx()
      .variantTplMgr()
      .effectiveVariantSetting(tpl)
      .rsh();
    const containerType = getRshContainerType(rsh);
    let nextAutoLayoutType: ContainerType,
      reorderedChildren: TplNode[] | undefined = undefined,
      isGuess = false;
    if (!(selectable instanceof ValTag)) {
      // There's no visible DOM to guess based off of.  Just cycle through a
      // standard ordering.
      nextAutoLayoutType = this.getNextCycledAutoLayoutType(tpl);
    } else if (containerType === "free") {
      // It's a free container, so we guess based on the current DOM layout.
      [nextAutoLayoutType, reorderedChildren] =
        this.guessAutoLayoutType(selectable);
      isGuess = true;
    } else if (this.undoRecordAfterLastAutoLayoutGuess === this.getUndoHead()) {
      // We just did an autolayout that was a guess, but the user requested
      // another autolayout.  So we cycle through to the only other possible
      // autolayout.
      nextAutoLayoutType =
        containerType === "flex-row" ? "flex-column" : "flex-row";
    } else {
      // If we didn't just do an autolayout and the element is auto-layout,
      // then toggle back to free.
      nextAutoLayoutType = "free";
    }
    return { nextAutoLayoutType, reorderedChildren, isGuess };
  }

  getPositionType(tpl: TplTag | TplComponent) {
    const rsh = this.viewCtx()
      .variantTplMgr()
      .effectiveVariantSetting(tpl)
      .rsh();
    const positionType = getRshPositionType(rsh);
    return positionType;
  }

  /**
   * Omit desiredAxis to guess default the guess to be based on size.
   */
  private linearizeItems(
    children: [TplNode, Rect][],
    desiredDir?: ContainerType
  ): [ContainerType, TplNode[]] {
    const centerToValNode = new Map<Pt, TplNode>();
    const centers = children.map((child) => {
      const center = Box.fromRect(child[1]).midpt();
      centerToValNode.set(center, child[0]);
      return center;
    });
    const bbox = centers.length > 0 && Box.enclosingPts(centers);
    const reordered = (getMetric: (pt: Pt) => number) => {
      return L.uniq(
        L.sortBy(centers, getMetric).map((center) =>
          ensure(
            centerToValNode.get(center),
            "All centers should be in centerToValNode map"
          )
        )
      );
    };
    return desiredDir === "flex-row" || (bbox && bbox.width() > bbox.height())
      ? ["flex-row", reordered((p) => p.x)]
      : ["flex-column", reordered((p) => p.y)];
  }

  private doGuessAutoLayoutType(
    container: Rect | undefined,
    children: Array<[TplNode, Rect]>
  ): [ContainerType, TplNode[] | undefined] {
    if (children.length < 2) {
      // If there aren't multiple children, then just default based on if the
      // parent is wider than taller.
      if (container) {
        return [
          container.width > container.height ? "flex-row" : "flex-column",
          undefined,
        ];
      } else {
        return ["flex-row", undefined];
      }
    }
    return this.linearizeItems(children);
  }

  private guessAutoLayoutType(
    selectable: ValTag
  ): [ContainerType, TplNode[] | undefined] {
    const { containerRect, children } =
      this.getContainerRectAndChildren(selectable);
    return this.doGuessAutoLayoutType(containerRect, children);
  }

  private getContainerRectAndChildren(selectable: ValTag) {
    const sq = SQ(selectable, this.valState(), false);
    const selectableDom = this.viewCtx().renderState.sel2dom(
      selectable,
      this.canvasCtx()
    );
    const containerRect = selectableDom
      ? getBoundingClientRect(...ensureArray(selectableDom))
      : undefined;
    const children = withoutNils(
      sq
        .children()
        .toArrayOfValNodes()
        .map((child) => {
          const doms = this.viewCtx().renderState.sel2dom(
            child,
            this.canvasCtx()
          );
          if (doms) {
            const domElts = ensureArray(doms);
            if (domElts.length > 0) {
              const childRect = getBoundingClientRect(...domElts);
              return tuple(child.tpl, childRect);
            }
          }
          return undefined;
        })
    );
    return { containerRect, children };
  }

  autoSizeFocused() {
    const tpl = this.viewCtx().focusedTpl();
    if (tpl && Tpls.isTplTagOrComponent(tpl)) {
      if (
        this.isRootNodeOfFrame(tpl) &&
        isPageComponent(this.viewCtx().arenaFrame().container.component)
      ) {
        // Can't auto-size page component roots
        return;
      }
      const vtm = this.viewCtx().variantTplMgr();
      if (isTplDefaultSized(tpl, vtm)) {
        // Already auto-sized; nothing to do
        return;
      }
      if (!isTplAutoSizable(tpl, vtm)) {
        notification.error({
          message: "You should not auto-size a free container",
          description: "A free container cannot be sized by its content.",
        });
        return;
      }
      resetTplSize(tpl, vtm);
    }
  }

  tryRenameParam(name: string, param: Param) {
    this.tplMgr().renameParam(this.viewCtx().currentComponent(), param, name);
  }

  renameTpl(name: string, tpl: TplTag | TplComponent, component?: Component) {
    if (
      isKnownTplComponent(tpl) &&
      tpl.component.states.some((s) => !isPrivateState(s)) &&
      !name
    ) {
      notification.error({
        message: "Instances of components with public states must be named.",
      });
      return;
    }
    component = component || $$$(tpl).owningComponent();
    this.tplMgr().renameTpl(component, tpl, name);
  }

  renameToken(name: string, token: StyleToken) {
    name = name.trim();
    if (name) {
      const existingNames = this.site().styleTokens.map((t) => t.name);
      name = common.uniqueName(existingNames, name, {
        normalize: toVarName,
      });
      token.name = name;
    }
  }

  private focusHeuristics() {
    return new FocusHeuristics(
      this.site(),
      this.tplMgr(),
      this.valState(),
      this.viewCtx().currentComponentCtx(),
      this.viewCtx().showDefaultSlotContents()
    );
  }

  private getFocusObjForEditText(
    focusObj = this.viewCtx().focusedSelectable()
  ): ValNodes.ValTextTag | undefined {
    if (!focusObj) {
      return undefined;
    }

    // Make sure this is a valid in-context focusObject
    focusObj = this.focusHeuristics().bestFocusTarget(focusObj, {
      exact: true,
    }).focusTarget;

    if (!focusObj) {
      return undefined;
    }

    // If focusObj is a SlotSelection or a ValSlot, and their only content is a
    // single text node or if focusObj is a ValComponent that has only a single
    // text slot, then we edit the text.
    if (focusObj instanceof SlotSelection) {
      const param = focusObj.slotParam;
      const valComponent = focusObj.val;
      if (valComponent) {
        const vals = valComponent.slotArgs.get(param);
        if (vals) {
          if (vals.length === 1 && Tpls.isTplTextBlock(vals[0].tpl)) {
            focusObj = vals[0];
          }
        }
      }
    } else if (focusObj instanceof ValSlot) {
      const contents = focusObj.contents?.map(slotContentValNode);
      if (
        contents &&
        contents.length === 1 &&
        Tpls.isTplTextBlock(contents[0].tpl)
      ) {
        focusObj = contents[0];
      }
    } else if (focusObj instanceof ValComponent) {
      const tpl = focusObj.tpl;
      const textArg = getMergedTextArg(tpl);
      if (textArg) {
        const slotContent = new SlotSelection({
          val: focusObj,
          slotParam: textArg.param,
        }).tryGetContent();

        if (slotContent && slotContent.length === 1) {
          focusObj = slotContent[0];
        }
      }
    }

    if (focusObj instanceof ValNodes.ValTextTag) {
      // Edit oldest text ancestor; e.g. if you double-click in a list item in
      // a big rich text block it should edit the whole block instead of only
      // the list item.
      const sq = SQ(focusObj, this.valState());
      const valPath = sq.ancestors().toArray().reverse();
      focusObj = valPath.find((obj) => obj instanceof ValNodes.ValTextTag);

      return this.viewCtx().renderState.tryGetUpdatedVal(
        focusObj as ValNodes.ValTextTag
      );
    }

    return undefined;
  }

  /**
   * Checks if text editing is blocked. That happens in two cases:
   *
   * 1. The source of the text content is from some other variant that
   * is blocking editing the target variant.
   * 2. Text is generated from a custom code expression.
   *
   * If editing is blocked, returns an error message; otherwise returns
   * undefined.
   */
  private textEditingIsBlocked(textValNode: ValTag): JSX.Element | undefined {
    const vtm = this.viewCtx().variantTplMgr();
    const effectiveVs = this.viewCtx().effectiveCurrentVariantSetting(
      textValNode.tpl
    );
    const source = effectiveVs.getTextSource();
    if (!source) {
      return undefined;
    }
    const indicator = computeDefinedIndicator(
      this.site(),
      this.viewCtx().currentComponent(),
      source,
      vtm.getTargetIndicatorComboForNode(textValNode.tpl)
    );
    const targetBlockingCombo = getTargetBlockingCombo([indicator]);
    if (targetBlockingCombo) {
      return (
        <TargetBlockedTooltip
          displayName="text"
          combo={targetBlockingCombo}
          studioCtx={this.studioCtx()}
        />
      );
    }

    return undefined;
  }

  tryEditText(
    { focusObj } = {
      focusObj: this.viewCtx().focusedSelectable(),
    }
  ) {
    const textValNode = this.getFocusObjForEditText(focusObj);
    if (!textValNode || this.viewCtx().isOutOfContext(textValNode.tpl)) {
      return;
    }

    // The text node may not be rendered at all, especially for
    // CanvasTextElement passed to code component.
    const handle = textValNode.handle;
    if (!handle || this.studioCtx().blockChanges) {
      return;
    }

    const blockedText = this.textEditingIsBlocked(textValNode);
    if (blockedText !== undefined) {
      notification.warn({ message: blockedText });
      return;
    }
    if (Tpls.isExprText(textValNode.text)) {
      this.viewCtx().setTriggerEditingTextDataPicker(true);
      return;
    }
    const editHandle = handle.enterEdit();
    if (editHandle !== undefined) {
      notification.warn({ message: blockedText });
      return;
    }
    const variantTplMgr = this.viewCtx().variantTplMgr();

    if (focusObj instanceof ValNodes.ValTextTag) {
      this.viewCtx().setStudioFocusBySelectable(textValNode);
    }
    this.viewCtx().setEditingTextContext({
      val: textValNode,
      targetVs: DEVFLAGS.unconditionalEdits
        ? variantTplMgr.ensureBaseVariantSetting(textValNode.tpl)
        : variantTplMgr.ensureCurrentVariantSetting(textValNode.tpl),
      draftText: maybe(textValNode.text, (text) =>
        ensureInstance(text, RawText, RawTextLike)
      ),
      run: undefined,
      editor: undefined,
    });
  }

  saveText() {
    // We could have double-called this from handleKeyDown then onBlur.
    const editingTextContext = this.viewCtx().editingTextContext();
    if (!editingTextContext) {
      return;
    }

    // Note here we use textValNode as the value node, rather than calling
    // this.getFocusObjForEditText(this.viewCtx().focusedSelectable()) because
    // the viewCtx may have already lose the focus (e.g. when user clicked
    // outside any frame)
    const baseVariant = editingTextContext.val.tpl.vsettings[0].variants[0];

    function saveTextToTpl(
      tpl: TplTag,
      targetVs: VariantSetting,
      newText: RichText | RawTextLike | undefined,
      newChildren?: TplNode[]
    ) {
      const uuidToTpl = new Map<string, TplNode>();
      for (const child of tpl.children) {
        uuidToTpl.set(child.uuid, child);
      }

      /**
       * If uuidToTpl has tpl.uuid, update and return existing TplTag.
       * Otherwise, create and return new TplTag.
       */
      function createOrUpdateTpl(tplTag: TplTag) {
        const text = tplTag.vsettings[0].text as RawText | undefined;
        if (uuidToTpl.has(tplTag.uuid)) {
          // The TplTag in the marker already exists, so we just want to
          // update its text with the text from newMarker.tpl.
          const existingTpl = uuidToTpl.get(tplTag.uuid) as TplTag;
          const vs = ensureVariantSetting(existingTpl, targetVs.variants);
          saveTextToTpl(existingTpl, vs, text, tplTag.children);
          return existingTpl;
        }
        // The TplTag didn't already exist.
        const newTpl = Tpls.clone(tplTag);
        const vs = newTpl.vsettings[0];
        vs.variants = [baseVariant];
        saveTextToTpl(newTpl, vs, text, tplTag.children);
        return newTpl;
      }

      if (isKnownExprText(newText)) {
        targetVs.text = newText;
      } else if (newText) {
        // TplTag of text type.
        const rawText = ensureInstance(newText, RawText, RawTextLike);
        targetVs.text = new RawText({
          text: rawText.text,
          markers: rawText.markers.map((m) => {
            const newMarker = Tpls.cloneMarker(m, undefined, true);
            if (isKnownNodeMarker(newMarker)) {
              newMarker.tpl = createOrUpdateTpl(newMarker.tpl as TplTag);
            }
            return newMarker;
          }),
        });
        Tpls.fixTextChildren(tpl);
      } else {
        // TplTag of non-text type.
        assert(
          newChildren,
          "newChildren cannot be undefined for non-text TplTag"
        );
        tpl.children = newChildren.map((c) => createOrUpdateTpl(c as TplTag));
      }
      Tpls.reconnectChildren(tpl);
    }

    if (
      editingTextContext.draftText &&
      editingTextContext.draftText !== editingTextContext.val.text
    ) {
      saveTextToTpl(
        editingTextContext.val.tpl,
        editingTextContext.targetVs,
        editingTextContext.draftText
      );
    }
  }

  focusedTpl() {
    return this.viewCtx().focusedTpl();
  }
  tryEnterComponentContaining(
    focusObj: Selectable,
    trigger: "dbl-click" | "ctrl-click",
    cloneKey?: string
  ) {
    const container =
      this.focusHeuristics().containingComponentWithinCurrentComponentCtx(
        focusObj
      );
    if (container != null) {
      const containerCtx =
        container.container != null
          ? new ComponentCtx({ valComponent: container.container })
          : null;
      if (!containerCtx) {
        notification.warning({
          message: "You cannot edit imported components or code components.",
        });
        return false;
      }
      const codeComponent = isCodeComponent(
        containerCtx.tplComponent().component
      );
      const tplComponent = containerCtx.tplComponent().component;
      const ownedBySite = this.tplMgr().isOwnedBySite(
        containerCtx.tplComponent().component
      );
      if (
        codeComponent ||
        !ownedBySite ||
        !this.studioCtx().canEditComponent(tplComponent)
      ) {
        // Cannot edit master component of code component or external component.
        notification.warning({
          message: `You cannot edit ${
            codeComponent ? "a code" : ownedBySite ? "this" : "an imported"
          } component.`,
        });
        return false;
      }
      this.viewCtx().setCurrentComponentCtx(containerCtx);
      const subtarget = this.focusHeuristics().bestFocusTarget(focusObj, {
        exact: true,
      });
      this.viewCtx().setStudioFocusBySelectable(
        subtarget.focusTarget,
        cloneKey
      );
      trackEvent("ComponentSpotlight", { trigger });
      return true;
    } else {
      return false;
    }
  }
  // Focus on either the given valNode/focusObj or the most reasonable containing
  // component, according to bestFocusTarget.
  tryFocusObj(
    focusObj: Selectable,
    opts: {
      allowLocked?: boolean;
      anchorCloneKey?: string;
      appendToMultiSelection?: boolean;
      exact: boolean;
    }
  ) {
    // This focus request may have happened while the ViewCtx is still
    // evaluating.  We do our best to look up the corresponding ValNode
    // to try to select, but the ValNode may be obsolete / about to be
    // replaced.  Usually this is fine, because the ValNode is pointing
    // to a TplNode that still exists, and so when we are done evaluating,
    // we will just fix the selection to point to the new ValNode instead.
    // But it's possible that this ValNode is now referencing a TplNode
    // that no longer exists.  In that case, we give up on the focus attempt.
    // Note that whereas ValNode may be "obsolete", the TplNode is always
    // up to date (model changes are guaranteed serially by StudioCtx).
    const focusedObjTpl =
      focusObj instanceof ValNode ? focusObj.tpl : focusObj.getTpl();
    if (!isTplAttachedToSite(this.viewCtx().site, focusedObjTpl)) {
      // give up
      return;
    }

    const { componentCtx, focusTarget } =
      this.focusHeuristics().bestFocusTarget(focusObj, {
        ...opts,
        curFocused: this.viewCtx().focusedSelectable(),
      });
    if (
      this.viewCtx().focusedSelectable() === focusTarget &&
      this.viewCtx().isFocusedViewCtx() &&
      this.viewCtx().focusedCloneKey() === opts?.anchorCloneKey
    ) {
      return;
    }

    this.viewCtx().setCurrentComponentCtx(componentCtx || null);
    return this.viewCtx().setStudioFocusBySelectable(
      focusTarget,
      opts?.anchorCloneKey,
      opts
    );
  }
  tryHoverObj(
    obj: Selectable | undefined,
    opts: {
      allowLocked?: boolean;
      anchorCloneKey?: string;
      exact: boolean;
    }
  ) {
    if (this.studioCtx().showStackOfParents) {
      return;
    }
    if (!obj) {
      this.viewCtx().setViewCtxHoverBySelectable(null);
      return;
    }
    const { focusTarget } = this.focusHeuristics().bestFocusTarget(obj, {
      ...opts,
      curFocused: this.viewCtx().focusedSelectable(),
    });
    if (focusTarget) {
      if (focusTarget) {
        this.viewCtx().setViewCtxHoverBySelectable(
          focusTarget,
          opts?.anchorCloneKey
        );
      }
    }
  }

  tryFocusDomElt(
    $elt: JQuery,
    opts: { appendToMultiSelection?: boolean; exact: boolean }
  ) {
    const focusable = this.viewCtx().dom2focusObj($elt);
    const cloneKey = this.viewCtx().sel2cloneKey(focusable);

    this.viewCtx().change(() => {
      if (focusable != null) {
        this.tryFocusObj(focusable, { ...opts, anchorCloneKey: cloneKey });
      } else {
        this.viewCtx().setStudioFocusBySelectable(null, undefined, opts);
      }
    });

    return focusable;
  }

  tryHoverDomElt($elt: JQuery, opts: { exact: boolean }) {
    const $closest = closestTaggedNonTextDomElt($elt, this.viewCtx(), {
      excludeNonSelectable: true,
    });
    if (!$closest) {
      return;
    }

    const focusable = this.viewCtx().dom2focusObj($closest);
    const cloneKey = this.viewCtx().sel2cloneKey(focusable);

    if (focusable) {
      this.tryHoverObj(focusable, {
        anchorCloneKey: cloneKey,
        exact: opts.exact,
      });
    }
  }
  getFinalFocusable($elt: JQuery) {
    const $closest = closestTaggedNonTextDomElt($elt, this.viewCtx(), {
      excludeNonSelectable: true,
    });

    if (!$closest) {
      return { val: null, focusedDom: null, focusedTpl: null };
    }

    const focusableSelectable = this.viewCtx().dom2focusObj($closest);
    const cloneKey = this.viewCtx().sel2cloneKey(focusableSelectable);

    if (!focusableSelectable) {
      return { val: null, focusedDom: null, focusedTpl: null };
    }
    const { focusTarget } = this.focusHeuristics().bestFocusTarget(
      focusableSelectable,
      { exact: true }
    );
    return this.viewCtx().computeFocus(focusTarget, cloneKey);
  }

  _tryMoveSelect(
    selector: (current: SelQuery) => SelQuery,
    canSelectHiddenElement: boolean,
    currentSelected: Selectable | null
  ): Selectable | undefined {
    let candidate: Selectable | undefined;

    do {
      if (!currentSelected) {
        return undefined;
      }

      candidate = selector(SQ(currentSelected, this.valState())).tryGet();
      if (
        !candidate ||
        (candidate instanceof ValNode &&
          !this.isSelectableValNode(candidate)) ||
        currentSelected == candidate
      ) {
        return undefined;
      }
      currentSelected = candidate;
    } while (!canSelectHiddenElement && !this.isSelectableVisible(candidate));

    if (this.isSelectableVisible(candidate)) {
      this.tryFocusObj(candidate, {
        allowLocked: true,
        anchorCloneKey: this.viewCtx().focusedCloneKey(),
        exact: true,
      });
    }
    return candidate;
  }

  _trySelect(
    selector: (current: SelQuery) => SelQuery,
    canSelectHiddenElement: boolean
  ): Selectable | undefined {
    const selectable = this.viewCtx().focusedSelectable() as Selectable | null;

    return this._tryMoveSelect(selector, canSelectHiddenElement, selectable);
  }

  private isSelectableValNode(node: ValNode) {
    if (node.tpl.parent && isPlainTextTplSlot(node.tpl.parent)) {
      // If this is the single text val node in a slot, then it shouldn't be selectable;
      // instead, we always want to be selecting the parent slot
      return false;
    }
    return isSelectableValNode(node);
  }

  tryNavParent() {
    // Allow traversing full stack but only if we have hit the root element
    // of a component's tree.  When selecting parent of slot arg, should
    // stick to the same owner.
    return this._trySelect(
      (sq: /*TWZ*/ SelQuery) =>
        sq.wrap(sq.parent().tryGet() || sq.parentFullstack().tryGet()),
      false
    );
  }
  tryNavChild() {
    const firstChild = this._trySelect(
      (sq: /*TWZ*/ SelQuery) => sq.firstChild(),
      true
    );
    if (!firstChild) {
      return undefined;
    }

    return this.isSelectableVisible(firstChild)
      ? firstChild
      : this._tryMoveSelect((x) => x.next(), false, firstChild);
  }
  tryNavPrev() {
    return this._trySelect((x) => x.prev(), false);
  }
  tryNavNext() {
    return this._trySelect((x) => x.next(), false);
  }
  async deleteFrame(arenaFrame: ArenaFrame) {
    return this.viewCtx().studioCtx.siteOps().removeArenaFrame(arenaFrame);
  }

  clearFrameComboSettings(frame: ArenaFrame) {
    return this.studioCtx().siteOps().clearFrameComboSettings(frame);
  }

  ungroup(tpl: TplNode) {
    this.change(() => $$$(tpl).ungroup());
    return true;
  }

  tryDelete({
    tpl: _target,
    forceDelete,
  }: {
    tpl?: TplNode | SlotSelection | (TplNode | SlotSelection | null)[] | null;
    forceDelete?: boolean;
  }) {
    if (_target == null) {
      _target = this.viewCtx().focusedTplsOrSlotSelections();
    }

    if (_target == null) {
      return;
    }

    const targets = withoutNils(Array.isArray(_target) ? _target : [_target]);

    if (targets.length === 0) {
      return;
    }

    if (targets.some((t) => t instanceof SlotSelection)) {
      // Only support clearing one SlotSelection at a time
      if (targets.length > 1) {
        notification.warn({
          message:
            "Removing multi-selections with slots is not supported at the moment.",
        });
        return;
      }
    }

    // now targets is either a single SlotSelection or multiple tpls. We unwrap
    // into just a list of TplNodes, and call prepareFocusedTpls() on it to remove
    // redundant nodes (for example, if you have ancestor and descedant both
    // selected, the descendant will be filtered out)
    const tpls = Tpls.prepareFocusedTpls(
      targets.flatMap((t) =>
        t instanceof SlotSelection ? this.getSlotTplContent(t) ?? [] : t
      )
    );

    if (tpls.length === 0) {
      return;
    }

    if (tpls.some((t) => t === this.viewCtx().currentCtxTplUserRoot())) {
      notification.error({
        message: "Cannot remove the root element",
      });
      return;
    }

    if (tpls.some((t) => this.isRootNodeOfStretchFrame(t))) {
      // If any of the selection includes the root of a stretch frame,
      // then just delete the frame, and there's nothing else to do!
      common.spawn(this.deleteFrame(this.viewCtx().arenaFrame()));
      return;
    }

    const vtm = this.viewCtx().variantTplMgr();
    const currentCombo = vtm.getCurrentVariantCombo();

    const isHiding = !forceDelete && !isBaseVariant(currentCombo);

    if (isHiding) {
      this.change(() => {
        for (const tpl of tpls) {
          if (isTplVariantable(tpl)) {
            setTplVisibility(
              tpl,
              currentCombo,
              canSetDisplayNone(this.viewCtx(), tpl)
                ? TplVisibility.DisplayNone
                : TplVisibility.NotRendered
            );
          }
        }
        const onlyRootSelected = tpls.length === 1 && tpls[0].parent === null;
        const key = common.mkShortId();
        const description = (
          <>
            The item <strong>is now hidden</strong> on the current variant.{" "}
            {!onlyRootSelected && (
              <strong>
                <LinkButton
                  onClick={() => {
                    this.tryDelete({ tpl: tpls, forceDelete: true });
                    notification.close(key);
                  }}
                >
                  Delete instead
                </LinkButton>
                .
              </strong>
            )}
            <hr />
            <strong>Tip:</strong> to delete an item from all variants, use
            <OneShortcutCombo combo={getComboForAction("DELETE")} />.
          </>
        );
        toast(description, { key });
      });
      return;
    } else {
      const component = Tpls.tryGetTplOwnerComponent(tpls[0]);
      if (component) {
        const removedImplicitStates: State[] = [];
        for (const tpl of tpls) {
          if (!component) {
            continue;
          }
          removedImplicitStates.push(
            ...findImplicitStatesOfNodesInTree(component, tpl)
          );
        }
        for (const state of removedImplicitStates) {
          const refs = Tpls.findExprsInTree(component.tplTree, tpls).filter(
            ({ expr }) => isStateUsedInExpr(state, expr)
          );
          if (refs.length > 0) {
            const maybeNode = refs.find((r) => r.node)?.node;
            const key = common.mkUuid();
            notification.error({
              key,
              message: "Cannot remove element",
              description: (
                <>
                  It contains variable "{getStateDisplayName(state)}" which is
                  referenced in the current component.{" "}
                  {maybeNode ? (
                    <a
                      onClick={() => {
                        this.viewCtx().setStudioFocusByTpl(maybeNode);
                        notification.close(key);
                      }}
                    >
                      [Go to reference]
                    </a>
                  ) : null}
                </>
              ),
            });
            return;
          }
          const implicitUsages = findImplicitUsages(this.site(), state);
          if (implicitUsages.length > 0) {
            const components = L.uniq(
              implicitUsages.map((usage) => usage.component)
            );
            notification.error({
              message: "Cannot remove element",
              description: `It contains variable "${getStateDisplayName(
                state
              )}" which is referenced in ${components
                .map((c) => Components.getComponentDisplayName(c))
                .join(", ")}.`,
            });
            return;
          }
        }
        for (const { expr, node: maybeNode } of Tpls.findExprsInComponent(
          component
        )) {
          if (isKnownTplRef(expr) && tpls.includes(expr.tpl)) {
            const key = common.mkUuid();
            notification.error({
              key,
              message: "Cannot remove element",
              description: (
                <>
                  It is referenced by another element in an invoke action
                  element interaction.{" "}
                  {maybeNode ? (
                    <a
                      onClick={() => {
                        this.viewCtx().setStudioFocusByTpl(maybeNode);
                        notification.close(key);
                      }}
                    >
                      [Go to reference]
                    </a>
                  ) : null}
                </>
              ),
            });
            return;
          }
        }
      }

      const deleteOneTpl = (tpl: TplNode) => {
        const parent = tpl.parent;
        $$$(tpl).remove({ deep: true });

        // Remove list containers when they become empty (i.e., their latest
        // item is removed).
        if (
          Tpls.isTplTag(parent) &&
          isTagListContainer(parent.tag) &&
          parent.children.length === 0
        ) {
          $$$(parent).remove({ deep: true });
        }

        // handle tpl columns sizing
        if (parent && Tpls.isTplColumns(parent)) {
          redistributeColumnsSizes(parent, this.viewCtx().variantTplMgr());
        }
      };

      this.change(() => {
        const nextFocus = this.findNearestFocusable(tpls[0], {
          excludeTpls: tpls,
          visibleInCombo: currentCombo,
        });
        if (nextFocus) {
          if (nextFocus instanceof SlotSelection) {
            this.viewCtx().setStudioFocusBySelectable(nextFocus);
          } else {
            this.viewCtx().setStudioFocusByTpl(nextFocus);
          }
        }
        for (const tpl of tpls) {
          deleteOneTpl(tpl);
        }
      });
    }
  }

  private findNearestFocusable(
    tpl: TplNode,
    opts: {
      excludeTpls?: TplNode[];
      visibleInCombo?: VariantCombo;
    }
  ) {
    const { excludeTpls = [], visibleInCombo } = opts;

    // First prefer siblings
    const isFocusable = (tpl2: TplNode) => {
      if (excludeTpls.includes(tpl2)) {
        return false;
      }
      if (isTplVariantable(tpl2) && visibleInCombo) {
        return getEffectiveTplVisibility(tpl2, visibleInCombo) === "visible";
      } else {
        return true;
      }
    };

    let curSibling: TplNode | undefined = $$$(tpl).next().maybeOneTpl();
    while (curSibling) {
      if (isFocusable(curSibling)) {
        return curSibling;
      }
      curSibling = $$$(curSibling).next().maybeOneTpl();
    }

    curSibling = $$$(tpl).prev().maybeOneTpl();
    while (curSibling) {
      if (isFocusable(curSibling)) {
        return curSibling;
      }
      curSibling = $$$(curSibling).prev().maybeOneTpl();
    }

    let curParent: TplNode | SlotSelection | undefined = $$$(tpl)
      .parentOrSlotSelection()
      .maybeOne();
    while (curParent) {
      if (curParent instanceof SlotSelection) {
        return curParent;
      } else if (isFocusable(curParent)) {
        return curParent;
      }
      curParent = $$$(curParent).parentOrSlotSelection().maybeOne();
    }

    return undefined;
  }

  toggleBold() {
    const vc = this.viewCtx();
    if (vc) {
      const tpl = vc.focusedTpl();
      if (tpl && Tpls.isTplTextBlock(tpl)) {
        const exp = vc.variantTplMgr().effectiveVariantSetting(tpl).rsh();
        const rsh = vc.variantTplMgr().targetRshForNode(tpl);
        const isBolded = exp.get("font-weight") === "700";
        if (!isBolded) {
          rsh.set("font-weight", "700");
        } else {
          if (vc.isEditingNonBaseVariant) {
            rsh.set("font-weight", "400");
          } else {
            rsh.clear("font-weight");
          }
        }
      }
    }
  }

  updateFontSize(dir: number) {
    const vc = this.viewCtx();
    if (vc) {
      const tpl = vc.focusedTpl();
      if (tpl && Tpls.isTplTextBlock(tpl)) {
        const exp = vc.variantTplMgr().effectiveVariantSetting(tpl).rsh();
        const rsh = vc.variantTplMgr().targetRshForNode(tpl);

        let fontSize = exp.get("font-size");
        if (isTokenRef(fontSize)) {
          fontSize = derefTokenRefs(
            allStyleTokens(this.site(), { includeDeps: "all" }),
            fontSize
          );
        }

        const parsed = parseCssNumericNew(fontSize);

        let num = 16;
        let units = "px";
        if (parsed) {
          num = parsed.num;
          units = parsed.units;
        }

        const newNum = Math.max(num + dir, 0);
        rsh.set("font-size", `${newNum}${units}`);
      }
    }
  }

  updateFontWeight(dir: number) {
    const vc = this.viewCtx();
    if (vc) {
      const tpl = vc.focusedTpl();
      if (tpl && Tpls.isTplTextBlock(tpl)) {
        const exp = vc
          .variantTplMgr()
          .effectiveVariantSetting(tpl)
          .rshWithTheme();
        const rsh = vc.variantTplMgr().targetRshForNode(tpl);

        let fontFamily = exp.get("font-family");
        if (fontFamily === "initial") {
          fontFamily = DEFAULT_THEME_TYPOGRAPHY["font-family"];
        }

        const spec = this.studioCtx()
          .fontManager.availFonts()
          .find((s) => s.fontFamily === fontFamily);
        const validWeights = fontWeightOptions.filter((option) => {
          return isValidFontWeight(option.value, spec);
        });

        let fontWeight = exp.get("font-weight");
        if (fontWeight === "normal") {
          fontWeight = DEFAULT_THEME_TYPOGRAPHY["font-weight"];
        }

        const idx = validWeights.findIndex(
          (option) => option.value == fontWeight
        );

        const newIdx = clamp(idx + dir, 0, validWeights.length - 1);
        rsh.set("font-weight", validWeights[newIdx].value);
      }
    }
  }

  convertToLink(maybeTpl?: TplNode) {
    const tpl = maybeTpl ?? this.viewCtx().focusedTpl();

    // If the tpl is a text element or a non-atomic tag element, just turn
    // its tag to "a" instead of wrapping in an "a" container.
    if (Tpls.isTplTag(tpl)) {
      if (
        Tpls.isTplTextBlock(tpl) ||
        (!Tpls.isAtomicTag(tpl.tag) && !isTagListContainer(tpl.tag))
      ) {
        tpl.tag = "a";
        return;
      }
    }

    if (Tpls.isTplTag(tpl) || Tpls.isTplComponent(tpl) || Tpls.isTplSlot(tpl)) {
      const tplLink = Tpls.mkTplTag("a");
      if (this.canInsertAsParent(tplLink, tpl, true)) {
        this.insertAsParent(tplLink, tpl);

        // Move repetition to newly created (link) tpl.
        const baseVs = ensureVariantSetting(tplLink, tpl.vsettings[0].variants);
        baseVs.dataRep = tpl.vsettings[0].dataRep;
        tpl.vsettings[0].dataRep = null;
      }
    }
  }

  async cut() {
    const copied = this.copy();
    if (copied) {
      if (isKnownArenaFrame(copied)) {
        await this.studioCtx()
          .siteOps()
          .removeArenaFrame(copied, { pruneUnnamedComponent: false });
      } else {
        await this.tryDelete({
          tpl: copied,
          forceDelete: DEVFLAGS.unconditionalEdits,
        });
      }
    }
    return copied;
  }
  copy() {
    const frame = this.viewCtx().studioCtx.focusedFrame();
    if (frame) {
      this.clipboard().copy(this.createFrameClip(frame));
      return frame;
    }

    const focusedObjs = this.viewCtx().focusedTplsOrSlotSelections();
    if (focusedObjs.length > 1) {
      if (focusedObjs.some((node) => node instanceof SlotSelection)) {
        notification.warn({
          message:
            "Copying multi-selections with slots is not supported at the moment.",
        });
        return undefined;
      }
      const nodes = Tpls.prepareFocusedTpls(focusedObjs);
      this.clipboard().copy(nodes.map((t) => this.createTplClip(t)));
      return nodes;
    }

    const obj = this.viewCtx().focusedTplOrSlotSelection();
    if (obj) {
      if (isKnownTplNode(obj)) {
        const tplClip = this.createTplClip(obj);
        this.clipboard().copy(tplClip);
        return obj;
      } else {
        // obj is a SlotSelection; when you copy/paste SlotSelection, you probably
        // intended to copy/paste the content?
        const content = this.getSlotTplContent(obj);
        if (content && content.length > 0) {
          this.clipboard().copy(this.createTplClip(content[0]));
          return content[0];
        }
      }
    }
    return undefined;
  }

  private getSlotTplContent(obj: SlotSelection) {
    const tplComponent = obj.getTpl();
    const arg = $$$(tplComponent).getSlotArgForParam(obj.slotParam);
    if (arg && isKnownRenderExpr(arg.expr) && arg.expr.tpl.length > 0) {
      return [...arg.expr.tpl];
    }
    return undefined;
  }

  createTplClip(tpl: TplNode, component?: Component): TplClip {
    return {
      type: "tpl",
      node: tpl,
      component: component || this.viewCtx().currentComponent(),
      activeVariants: Tpls.isTplVariantable(tpl)
        ? [...this.viewCtx().variantTplMgr().getActivatedVariantsForNode(tpl)]
        : undefined,
    };
  }

  private createFrameClip(frame: ArenaFrame): FrameClip {
    const newFrame = this.tplMgr().cloneFrame(frame, false);
    return {
      type: "frame",
      frame: newFrame,
    };
  }

  duplicate(
    item:
      | ArenaFrame
      | TplNode
      | null
      | undefined = this.viewCtx().studioCtx.focusedFrame() ||
      this.viewCtx().focusedTpl()
  ) {
    if (!item) {
      return;
    }
    if (isKnownArenaFrame(item)) {
      if (
        isDuplicatableFrame(
          ensure(
            this.studioCtx().currentArena,
            "Unexpected undefined currentArena when trying to duplicate an ArenaFrame"
          ),
          item
        )
      ) {
        // Only duplicate custom frames
        this.pasteFrameClip(this.createFrameClip(item), item);
      } else {
        // TODO: maybe we can?
        notification.error({
          message: "Cannot duplicate this artboard",
        });
      }
    } else if (this.isRootNodeOfStretchFrame(item)) {
      this.pasteFrameClip(this.createFrameClip(this.viewCtx().arenaFrame()));
    } else if (isKnownTplNode(item) && canAddSiblings(item, item)) {
      this.pasteNode(Tpls.clone(item), undefined, item, InsertRelLoc.after);
    } else if (isKnownTplNode(item) && Tpls.isTplTextBlock(item.parent)) {
      const parent = item.parent;
      const vs = this.viewCtx()
        .variantTplMgr()
        .ensureCurrentVariantSetting(parent);
      const newTpl = Tpls.duplicateMarkerTpl(vs.text as RawText, item);
      this.viewCtx().selectNewTpl(newTpl);
    }
  }

  copyStyle(tpl?: TplNode, cssProps?: string[]) {
    tpl = tpl || this.viewCtx().focusedTpl() || undefined;
    if (
      !Tpls.isTplTag(tpl) &&
      !(Tpls.isTplComponent(tpl) && isCodeComponent(tpl.component))
    ) {
      return;
    }

    const exp = this.viewCtx()
      .variantTplMgr()
      .effectiveVariantSetting(tpl)
      .rsh();

    const styleProps = cssProps || defaultCopyableStyleNames;
    const props = Object.fromEntries(
      common.withoutNilTuples(styleProps.map((p) => tuple(p, exp.getRaw(p))))
    );
    console.log("Copied styles", props);
    // TODO: also copy mixins
    this.clipboard().copy({ type: "style", cssProps: props });
  }

  tryPasteStyleFromClipboard(targetTpl?: TplNode, cssProps?: string[]) {
    if (!this.clipboard().isSet()) {
      return;
    }
    const clip = this.clipboard().paste();
    if (!isStyleClip(clip)) {
      return;
    }
    this.pasteStyleClip(clip, targetTpl, cssProps);
  }

  pasteStyleClip(
    clip: StyleClip,
    targetTpl?: TplNode,
    cssProps?: string[]
  ): boolean {
    targetTpl = targetTpl || this.viewCtx().focusedTpl() || undefined;
    if (
      !Tpls.isTplTag(targetTpl) &&
      !(Tpls.isTplComponent(targetTpl) && isCodeComponent(targetTpl.component))
    ) {
      notification.warn({
        message: "Cannot paste styles - must select an element",
      });
      return false;
    }

    const exp = RSH(
      this.viewCtx().variantTplMgr().ensureCurrentVariantSetting(targetTpl).rs,
      targetTpl
    );

    const propsToCopy = cssProps
      ? L.pick(clip.cssProps, cssProps)
      : clip.cssProps;
    console.log("Pasting styles", propsToCopy);
    for (const [prop, val] of Object.entries(propsToCopy)) {
      exp.set(prop, val);
    }
    return true;
  }

  copyBgImageStyle(tpl?: TplNode) {
    this.copyStyle(tpl, ["background"]);
  }

  pasteBgImageStyle(targetTpl?: TplNode) {
    this.tryPasteStyleFromClipboard(targetTpl, ["background"]);
  }

  tryStartSavingPreset(maybeTpl?: TplNode) {
    if (this.studioCtx().freestyleState() || !this.studioCtx().isDevMode) {
      return;
    }
    const tpl = maybeTpl ?? this.focusedTpl();
    if (!tpl) {
      return;
    }
    if (!Tpls.isTplComponent(tpl)) {
      return;
    }

    const clip = this.createTplClip(tpl);
    const presetTpl = this.adaptTplForPaste(clip, [this.site().globalVariant]);
    if (presetTpl && Tpls.isTplComponent(presetTpl)) {
      assert(
        Tpls.isTplVariantable(presetTpl),
        "If presetTpl is TplComponent it is also a TplNode"
      );
      const dom = this.viewCtx().focusedDomElt()?.get(0);
      if (this.studioCtx().prepareSavingPresets(!!dom)) {
        this.studioCtx().saveAsPresetState = {
          tpl: presetTpl,
          vc: this.viewCtx(),
          dom,
        };
      }
    }
  }

  adaptTplNodeForPaste = (
    node: TplNode,
    component: Component,
    activeVariants: VariantCombo,
    targetVariants?: VariantCombo
  ) => {
    if (!Tpls.isTplVariantable(node)) {
      return;
    }
    const nonGlobalActiveVariants = activeVariants.filter(
      (v) => !isGlobalVariant(v)
    );
    const nonGlobalActiveVsettings = sortedVariantSettingStack(
      node.vsettings,
      nonGlobalActiveVariants,
      makeVariantComboSorter(this.site(), component)
    );
    const effectiveVs = new EffectiveVariantSetting(
      node,
      nonGlobalActiveVsettings,
      this.site(),
      nonGlobalActiveVariants
    );

    // We handle global and private style variants different from "normal"
    // ones. If the user copied a TplNode from a component where a component
    // variant "red" and a global variant "desktop" were active, we want to
    // copy the styles from "red" and paste as "base" (note there is no "red"
    // variant here), while we want variant settings from [red, desktop]
    // to be merged with [desktop] in here.
    //
    // The code below filters variant settings that are active when in
    // combination with any global and private variants, remove nonglobal
    // variants from them, and then generate a map effectiveVsMap from variant
    // combos to effective variant settings. We use effective variant
    // settings to merge variant settings such as [red, desktop] and
    // [desktop], which will be simply [desktop] in the paste.
    const preservedVSettings = node.vsettings.filter((vs) =>
      vs.variants.every(
        (v) =>
          isGlobalVariant(v) ||
          nonGlobalActiveVariants.includes(v) ||
          isPrivateStyleVariant(v)
      )
    );
    preservedVSettings.forEach(
      (vs) =>
        (vs.variants = vs.variants.filter(
          (v) => isGlobalVariant(v) || isPrivateStyleVariant(v)
        ))
    );
    const effectiveVsMap = new Map<Variant[], EffectiveVariantSetting>();
    for (const vs of preservedVSettings) {
      if (vs.variants.length === 0) {
        continue;
      }

      if (!effectiveVsMap.has(vs.variants)) {
        const activeVSettings = sortedVariantSettingStack(
          preservedVSettings.filter((_vs) =>
            common.arrayEqIgnoreOrder(_vs.variants, vs.variants)
          ),
          vs.variants,
          makeVariantComboSorter(this.site(), component)
        );
        effectiveVsMap.set(
          vs.variants,
          new EffectiveVariantSetting(
            node,
            activeVSettings,
            this.site(),
            vs.variants
          )
        );
      }
    }

    node.vsettings = [];
    const vtm = this.viewCtx().variantTplMgr();
    const targetVs = targetVariants
      ? ensureVariantSetting(node, targetVariants)
      : vtm.ensureBaseVariantSetting(node);

    adaptEffectiveVariantSetting(node, targetVs, effectiveVs, false);

    for (const [variants, evs] of effectiveVsMap) {
      const vs = ensureVariantSetting(node, variants);
      adaptEffectiveVariantSetting(node, vs, evs, false);
    }

    if (Tpls.isTplTextBlock(node)) {
      Tpls.fixTextChildren(node);
    }
  };

  private adaptTplForPaste = (clip: TplClip, targetVariants?: VariantCombo) => {
    const newTree = Tpls.clone(clip.node);
    const newTpls = Tpls.flattenTplsBottomUp(newTree);
    if (
      isFrameComponent(this.viewCtx().currentComponent()) &&
      getTplSlotDescendants(newTree).length > 0
    ) {
      notification.error({
        message: `You can only paste slots into a component ${FRAME_LOWER}`,
        description: `You can first convert this ${FRAME_LOWER} into a component.`,
      });
      return undefined;
    }
    const pastedImplicitStates = new Set(
      findImplicitStatesOfNodesInTree(
        clip.component,
        clip.origNode ?? clip.node
      )
    );
    const externalStates = clip.component.states.filter(
      (s) => !pastedImplicitStates.has(s)
    );
    for (const state of externalStates) {
      const refs = Tpls.findExprsInTree(clip.origNode ?? clip.node).filter(
        ({ expr }) => isStateUsedInExpr(state, expr)
      );
      if (refs.length > 0) {
        notification.error({
          message: "Cannot paste elements",
          description: `They contain a reference to "${getStateDisplayName(
            state
          )}".`,
        });
        return;
      }
    }

    Tpls.fixTplRefEpxrs(
      newTpls,
      clip.origNode ? Tpls.flattenTplsBottomUp(clip.origNode) : [],
      (referencedTpl) => this.notifyMissingTplRef(null, referencedTpl)
    );

    newTpls.forEach((child) =>
      this.adaptTplNodeForPaste(
        child,
        clip.component,
        ensure(
          clip.activeVariants,
          "Unexpected undefined value for clip activeVariants"
        ),
        targetVariants
      )
    );
    return newTree;
  };

  pasteTplClip({
    clip,
    cursorClientPt,
    target,
    loc,
  }: {
    clip: TplClip;
    cursorClientPt?: Pt;
    target?: TplNode | Selectable;
    loc?: InsertRelLoc;
  }) {
    this.maybeFocus(target);
    if (clip.component === this.viewCtx().currentComponent()) {
      const node = Tpls.clone(clip.node);
      // We are pasting a node in the same component context, so we only need
      // to prune deleted variants.
      if (Tpls.isTplVariantable(node)) {
        const existingVariants = new Set([
          ...allGlobalVariants(this.site()),
          ...Components.allComponentVariants(clip.component),
        ]);
        node.vsettings = node.vsettings.filter((vs) =>
          vs.variants.every((v) => existingVariants.has(v))
        );
      }
      if (this.pasteNode(node, cursorClientPt, target, loc)) {
        return node;
      } else {
        return undefined;
      }
    } else {
      // Else, we are pasting a node from one component to another, so we need to do some
      // surgery.  Specifically, we want to take the effective variant settings from
      // when the node was copied, and store them as the base variant settings for the
      // target viewCtx.  Why the base variant settings instead of the current variant
      // settings?  It's hard to know what the user intended, but it seems better to populate
      // the base than the current so that we don't end up with an empty base settings with
      // no styling at all.
      //
      // The new node should still be conditionally visible in the current
      // variant (in the standard way all newly created TplNodes are), via
      // pasteNode.
      const newTree = this.adaptTplForPaste(clip);
      if (newTree) {
        if (this.pasteNode(newTree, cursorClientPt, target, loc)) {
          return newTree;
        }
      }
      return undefined;
    }
  }

  pasteTplClips({
    clips,
    cursorClientPt,
    target,
    loc,
  }: {
    clips: TplClip[];
    cursorClientPt?: Pt;
    target?: TplNode | Selectable;
    loc?: InsertRelLoc;
  }) {
    const newTpls: TplNode[] = [];
    let curTarget = target;
    let curLoc = loc;
    for (const c of clips) {
      const clipResult = this.pasteTplClip({
        clip: c,
        cursorClientPt,
        target: curTarget,
        loc: curLoc,
      });
      if (clipResult && !isArray(clipResult)) {
        newTpls.push(clipResult);
        curTarget = clipResult;
        curLoc = InsertRelLoc.after;
      }
    }
    this.viewCtx().selectNewTpls(newTpls);
    return newTpls;
  }

  pasteFrameClip(clip: FrameClip, originalFrame?: ArenaFrame) {
    this.studioCtx().siteOps().pasteFrameClip(clip, originalFrame);
  }

  /**
   * Paste the given item.  The item is assumed to be the actual instance to
   * insert - no further cloning is performed within this paste().
   *
   * When pasting frames, we are just creating a new view of the same component.
   *  We do not clone the component itself.
   *
   * Returns true if the paste was successful
   */
  pasteNode(
    newItem: TplNode,
    cursorClientPt?: Pt,
    target:
      | TplNode
      | Selectable
      | undefined = this.viewCtx().focusedTplOrSlotSelection() ||
      this.viewCtx().tplRoot() ||
      undefined,
    location?: InsertRelLoc
  ): boolean {
    if (!target) {
      notification.error({
        message: "Choose where to paste",
        description:
          "You must first select an item.  Pasting will then paste into that item.",
      });
      return false;
    }

    const targetTplOrSlotSelection = asTplOrSlotSelection(target);

    const getInsertLoc = () => {
      const validLocs = this.getValidInsertLocsForItem(
        newItem,
        targetTplOrSlotSelection
      );
      const preferredLocs = getPreferredInsertLocs(
        this.viewCtx(),
        targetTplOrSlotSelection
      );
      return L.head(preferredLocs.filter((loc) => validLocs.includes(loc)));
    };

    const loc = location || getInsertLoc();
    if (
      !loc ||
      !this.canInsertAt(newItem, targetTplOrSlotSelection, loc, false)
    ) {
      // If we are inserting as sibling, try to warn why it's not possible
      if (loc === InsertRelLoc.after || loc === InsertRelLoc.before) {
        const canAdd = canAddSiblingsAndWhy(targetTplOrSlotSelection);
        if (canAdd !== true) {
          notification.error({
            message: "Cannot paste as sibling here",
            description: renderCantAddMsg(canAdd),
          });
          return false;
        }
      }

      notification.error({
        message: "Cannot paste here",
        description:
          "You cannot paste into or around the selected" +
          " element. Try pasting elsewhere.",
      });
      return false;
    }

    const focused = ensure(
      this.maybeFocus(target),
      "Unexpected undefined focus for target"
    );
    assert(
      equivTplOrSlotSelection(targetTplOrSlotSelection, focused),
      "Unexpected unequal values for targetTplOrSlotSelection and focused, should be the same"
    );

    // Fix up the new node before we paste!
    const component = this.viewCtx().currentComponent();
    const newTplSlots: TplSlot[] = [];
    for (const newNode of Tpls.flattenTpls(newItem)) {
      if (Tpls.isTplSlot(newNode)) {
        newTplSlots.push(newNode);
      }

      if (Tpls.isTplVariantable(newNode)) {
        // Assert that this new node has variant settings that are compatible with the current
        // component's, by checking that its base variant is the same as the current component's.
        // It is the caller's responsibility to make sure this is the case.
        const base = tryGetBaseVariantSetting(newNode);
        common.assert(!!base && base.variants[0] === component.variants[0]);

        // fix private style variant by cloning.
        newNode.vsettings.forEach((vs) => {
          const privateSV = tryGetPrivateStyleVariant(vs.variants);
          if (privateSV) {
            const index = vs.variants.indexOf(privateSV);
            assert(
              index !== -1,
              "Unexpected not found privateSV in variant list"
            );
            const clonedPrivateSV = cloneVariant(privateSV);
            clonedPrivateSV.forTpl = newNode;
            vs.variants[index] = clonedPrivateSV;
            component.variants.push(clonedPrivateSV);
          }
        });
      }
    }
    // Remove all VarRefs that do not exist in the current context.
    const componentVars = new Set(component.params.map((p) => p.variable));
    const varRefs = Array.from(Components.findVarRefs(newItem));
    varRefs.forEach((varRef) => {
      if (!componentVars.has(varRef.var) && varRef.arg) {
        common.removeWhere(varRef.vs.args, (arg) => arg === varRef.arg);
      }
    });

    // If this newItem is being pasted into a non-base context, then set the base variant setting
    // to invisible, just as we do when drawing a new node in a non-base context.
    const vtm = this.viewCtx().variantTplMgr();
    if (
      Tpls.isTplVariantable(newItem) &&
      !isBaseVariant(vtm.getTargetVariantComboForNode(newItem))
    ) {
      vtm.ensureBaseVariantSetting(newItem).dataCond = codeLit(false);
      vtm.ensureCurrentVariantSetting(newItem, component).dataCond =
        codeLit(true);
    }

    // If we pasted new TplSlots, then we create new corresponding params
    if (newTplSlots.length > 0) {
      for (const newSlot of newTplSlots) {
        const newParam = Components.addSlotParam(
          this.site(),
          component,
          newSlot.param.variable.name
        );
        writeable(newParam).tplSlot = newSlot;
        writeable(newSlot).param = newParam;
      }
      notification.info({
        message: `Auto-created ${pluralize("slot", newTplSlots.length)}`,
        description: `You pasted ${
          newTplSlots.length === 1 ? "a slot" : "some slots"
        }, so ${
          newTplSlots.length === 1 ? "a new slot was" : "new slots were"
        } created in the "${component.name}" component.`,
      });
    }

    this.insertAt(newItem, cursorClientPt, loc, targetTplOrSlotSelection);

    return true;
  }

  /**
   * Focus on the given item if present.  (Never clears the focus.)
   */
  private maybeFocus(target: TplNode | Selectable | undefined) {
    if (isKnownTplNode(target)) {
      this.viewCtx().setStudioFocusByTpl(target);
    } else if (isSelectable(target)) {
      this.viewCtx().setStudioFocusBySelectable(target);
    }

    return this.viewCtx().focusedTplOrSlotSelection();
  }

  canInsertAsChild(
    newItem: TplNode,
    targetTplOrSlotSelection: TplNode | SlotSelection,
    showErrors: boolean
  ) {
    const canAdd = canAddChildrenAndWhy(targetTplOrSlotSelection, newItem);
    if (canAdd !== true) {
      if (showErrors) {
        notification.error({
          message: "Cannot insert here",
          description: renderCantAddMsg(canAdd),
        });
      }
      return false;
    }

    if (
      isKnownTplNode(targetTplOrSlotSelection) &&
      Tpls.isTplColumns(targetTplOrSlotSelection) &&
      !Tpls.isTplColumn(newItem)
    ) {
      if (showErrors) {
        notification.error({
          message: `Cannot insert into Columns.`,
          description: `Columns can only have children elements of type Column.`,
        });
      }
      return false;
    }

    if (
      !(
        isKnownTplNode(targetTplOrSlotSelection) &&
        Tpls.isTplColumns(targetTplOrSlotSelection)
      ) &&
      Tpls.isTplColumn(newItem)
    ) {
      if (showErrors) {
        notification.error({
          message: `Cannot insert Column.`,
          description: `Responsive columns must be kept together.`,
        });
      }
      return false;
    }

    if (
      Tpls.isTplSlot(targetTplOrSlotSelection) &&
      Tpls.getTplOwnerComponent(targetTplOrSlotSelection) ===
        this.viewCtx().currentComponent() &&
      !this.viewCtx().showingDefaultSlotContentsFor(
        this.viewCtx().currentTplComponent()
      )
    ) {
      if (showErrors) {
        notification.error({
          message: `Cannot insert into this slot.`,
          description: `If you want to edit the default contents, turn on "Show default slot contents".`,
        });
      }
      return false;
    }
    const destOwner = Tpls.getTplOwnerComponent(
      asTpl(targetTplOrSlotSelection)
    );
    const hasComponentCycle = Tpls.detectComponentCycle(destOwner, [newItem]);
    if (hasComponentCycle) {
      if (showErrors) {
        showError(new ComponentCycleUserError());
      }
      return false;
    }

    if (
      Tpls.ancestorsUp(asTpl(targetTplOrSlotSelection)).some(Tpls.isTplSlot) &&
      Tpls.flattenTpls(newItem).some(Tpls.isTplSlot)
    ) {
      if (showErrors) {
        showError(new NestedTplSlotsError());
      }
      return false;
    }

    return true;
  }

  canInsertAsSibling(
    newItem: TplNode,
    target: TplNode | SlotSelection,
    showErrors: boolean
  ) {
    const canAdd = canAddSiblingsAndWhy(target, newItem);
    if (canAdd !== true) {
      if (showErrors) {
        notification.error({
          message: "Cannot insert sibling here",
          description: renderCantAddMsg(canAdd),
        });
      }
      return false;
    }

    // Column can only be sibling of another column
    if (
      !(isKnownTplNode(target) && Tpls.isTplColumn(target)) &&
      Tpls.isTplColumn(newItem)
    ) {
      if (showErrors) {
        notification.error({
          message: `Cannot insert Column here.`,
          description: `Responsive columns must be kept together.`,
        });
      }
      return false;
    }
    if (
      isKnownTplNode(target) &&
      Tpls.isTplColumn(target) &&
      !Tpls.isTplColumn(newItem)
    ) {
      if (showErrors) {
        notification.error({
          message: `Cannot insert sibling here.`,
          description: `Column elements can only have siblings of type Column.`,
        });
      }
      return false;
    }

    if (target instanceof SlotSelection) {
      return false;
    } else {
      const targetParent = ensure(
        getParentOrSlotSelection(target),
        "Unexpected undefined value of parent/slotSelection for target"
      );
      return this.canInsertAsChild(newItem, targetParent, showErrors);
    }
  }

  getValidInsertLocsForItem(newItem: TplNode, target: TplNode | SlotSelection) {
    const validLocs: InsertRelLoc[] = [];

    if (this.canInsertAsSibling(newItem, target, false)) {
      validLocs.push(InsertRelLoc.after, InsertRelLoc.before);
    }

    if (this.canInsertAsChild(newItem, target, false)) {
      validLocs.push(InsertRelLoc.append, InsertRelLoc.prepend);
    }

    if (this.canInsertAsParent(newItem, target, false)) {
      validLocs.push(InsertRelLoc.wrap);
    }

    return validLocs;
  }

  tryInsertAt(
    newItem: TplNode,
    cursorClientPt: Pt | undefined,
    loc: InsertRelLoc,
    target: TplNode | Selectable,
    preserveCloneKey?: boolean
  ): boolean {
    if (!this.canInsertAt(newItem, asTplOrSlotSelection(target), loc, true)) {
      return false;
    }
    this.insertAt(newItem, cursorClientPt, loc, target, preserveCloneKey);
    return true;
  }

  canInsertAt(
    newItem: TplNode,
    target: TplNode | SlotSelection,
    loc: InsertRelLoc,
    showErrorNotification: boolean
  ) {
    switch (loc) {
      case InsertRelLoc.before:
      case InsertRelLoc.after:
        if (target instanceof SlotSelection) {
          if (showErrorNotification) {
            notification.error({
              message: "Cannot insert before/after a slot",
            });
          }
          return false;
        }
        return this.canInsertAsSibling(newItem, target, showErrorNotification);
      case InsertRelLoc.prepend:
      case InsertRelLoc.append:
        return this.canInsertAsChild(newItem, target, showErrorNotification);
      case InsertRelLoc.wrap:
        if (
          !Tpls.isTplTag(newItem) &&
          (!Tpls.isTplComponent(newItem) || !Tpls.hasChildrenSlot(newItem))
        ) {
          if (showErrorNotification) {
            notification.error({
              message:
                "Can only wrap in basic elements or components with a children slot",
            });
          }
          return false;
        }
        return this.canInsertAsParent(newItem, target, showErrorNotification);
      default:
        return unexpected();
    }
  }

  insertAt(
    newItem: TplNode,
    cursorClientPt: Pt | undefined,
    loc: InsertRelLoc,
    target: TplNode | Selectable,
    preserveCloneKey?: boolean
  ) {
    assert(
      this.canInsertAt(newItem, asTplOrSlotSelection(target), loc, false),
      "Must be able to insert newItem at target"
    );

    const targetTplOrSlotSelection = ensure(
      this.maybeFocus(target),
      "Unexpected undefined focus for target of insertion"
    );

    const deriveParentOffset = () => {
      const $targetElt = this.viewCtx().focusedDomElt();
      return $targetElt && cursorClientPt
        ? calcOffset($targetElt[0], cursorClientPt, this.viewCtx())
        : undefined;
    };

    if (isKnownTplNode(targetTplOrSlotSelection)) {
      switch (loc) {
        case InsertRelLoc.prepend:
        case InsertRelLoc.append:
          this.insertAsChild(newItem, targetTplOrSlotSelection, {
            parentOffset: deriveParentOffset(),
            prepend: loc === InsertRelLoc.prepend,
          });
          break;
        case InsertRelLoc.before:
        case InsertRelLoc.after:
          this.insertAsSibling(newItem, targetTplOrSlotSelection, loc);
          break;
        case InsertRelLoc.wrap: {
          const newParent = ensureInstance(
            $$$(newItem).clear().one(),
            TplTag,
            TplComponent
          );
          this.insertAsParent(
            newParent,
            ensureInstance(
              targetTplOrSlotSelection,
              TplTag,
              TplComponent,
              TplSlot
            )
          );
          break;
        }
        default:
          unexpected();
      }
    } else if (targetTplOrSlotSelection instanceof SlotSelection) {
      assert(
        loc === InsertRelLoc.prepend || loc === InsertRelLoc.append,
        "Unexpected loc type for inserting at SlotSelection"
      );
      this.insertAsChild(newItem, targetTplOrSlotSelection);
    } else {
      unexpected();
    }

    this.viewCtx().selectNewTpl(
      newItem,
      false,
      this.viewCtx().focusedSelectable(),
      preserveCloneKey
    );
  }

  async extractComponent(tpl?: TplNode) {
    tpl =
      tpl ||
      ensure(
        this.viewCtx().focusedTpl(),
        "Should have focused tpl to be able to extract component"
      );
    if (Tpls.isBodyTpl(tpl)) {
      notification.error({
        message: "Cannot extract page body",
        description:
          "Page body is a special element.  Choose another element to" +
          " extract as a component.",
      });
      return;
    }

    if (Tpls.isTplTextBlock(tpl.parent)) {
      notification.error({
        message: "Cannot extract inline text into a component.",
        description: "This feature is not supported at the moment.",
      });
      return;
    }

    if (!Tpls.isTplTagOrComponent(tpl) || Tpls.isTplColumn(tpl)) {
      notification.error({
        message: "Cannot extract this into a component.",
        description:
          "You can only extract tags or component instances into a new Component.",
      });
      return;
    }

    const containingComponent = $$$(tpl).owningComponent();
    const flattenedTpls = Tpls.flattenTpls(tpl);
    const flattenedTplsSet = new Set(flattenedTpls);
    const varRefs = Array.from(Components.findVarRefs(tpl));

    const removedImplicitStates = new Set(
      findImplicitStatesOfNodesInTree(containingComponent, tpl)
    );
    const containingComponentExprs = Tpls.findExprsInTree(
      containingComponent.tplTree,
      [tpl]
    );
    for (const state of removedImplicitStates) {
      const refs = containingComponentExprs.filter(({ expr }) =>
        isStateUsedInExpr(state, expr)
      );
      if (refs.length > 0) {
        const maybeNode = refs.find((r) => r.node)?.node;
        const key = common.mkUuid();
        notification.error({
          key,
          message: "Cannot create component",
          description: (
            <>
              Selected elements contain variable "{getStateDisplayName(state)}"
              which is referenced in the current component.{" "}
              {maybeNode ? (
                <a
                  onClick={() => {
                    this.viewCtx().setStudioFocusByTpl(maybeNode);
                    notification.close(key);
                  }}
                >
                  [Go to reference]
                </a>
              ) : null}
            </>
          ),
        });
        return;
      }
      const implicitUsages = findImplicitUsages(this.site(), state);
      if (implicitUsages.length > 0) {
        const components = L.uniq(
          implicitUsages.map((usage) => usage.component)
        );
        notification.error({
          message: "Cannot create component",
          description: `Selected nodes contain variable "${getStateDisplayName(
            state
          )}" which is referenced in ${components
            .map((c) => Components.getComponentDisplayName(c))
            .join(", ")}.`,
        });
        return;
      }
    }

    const tplExprs = Tpls.findExprsInTree(tpl);
    const exprsInInteractions = tplExprs
      .filter(({ expr }) => isKnownEventHandler(expr))
      .flatMap(({ expr }) => {
        const eventHandler = ensureKnownEventHandler(expr);
        return eventHandler.interactions.flatMap((interaction) =>
          Tpls.findExprsInInteraction(interaction)
        );
      });
    const remainingStates = containingComponent.states.filter(
      (s) => !removedImplicitStates.has(s)
    );
    for (const state of remainingStates) {
      // We try to extract the component if the state is not referenced in any
      // interaction. We guess that this state is read-only in this context and
      // can be passed in as a prop of the new component.
      const refsInInteractions = new Set(
        exprsInInteractions.filter((expr) => isStateUsedInExpr(state, expr))
      );
      if (refsInInteractions.size === 0) {
        continue;
      }
      const refs = tplExprs.filter(
        ({ expr }) =>
          isStateUsedInExpr(state, expr) && refsInInteractions.has(expr)
      );
      if (refs.length > 0) {
        const maybeNode = refs.find((r) => r.node)?.node;
        const key = common.mkUuid();
        notification.error({
          key,
          message: "Cannot create component",
          description: (
            <>
              Selected elements contain reference to "
              {getStateDisplayName(state)}".{" "}
              {maybeNode ? (
                <a
                  onClick={() => {
                    this.viewCtx().setStudioFocusByTpl(maybeNode);
                    notification.close(key);
                  }}
                >
                  [Go to reference]
                </a>
              ) : null}
            </>
          ),
        });
        return;
      }
    }

    for (const tplRef of tplExprs) {
      const expr = tplRef.expr;
      if (isKnownTplRef(expr)) {
        if (!flattenedTplsSet.has(expr.tpl)) {
          this.notifyMissingTplRef(tplRef.node ?? null, expr.tpl);
          return;
        }
      }
    }

    const { params: paramsUsedInExprs, queries: queriesToCreateProps } =
      Components.findObjectsUsedInExprs(containingComponent, tpl);
    const linkedParams = L.uniq([
      ...flattenedTpls
        .filter((t): t is TplSlot => Tpls.isTplSlot(t))
        .map((slot) => slot.param),
      ...varRefs
        .map((r) => r.var)
        .map((v) => Components.getParamForVar(containingComponent, v)),
      ...paramsUsedInExprs,
    ]);
    const resp = await promptExtractComponent({
      site: this.site(),
      containingComponent,
      linkedParams,
      queriesToCreateProps,
    });
    if (!resp) {
      return;
    }

    const name = this.tplMgr().getUniqueComponentName(resp.name);
    this.change(() => {
      const tplComponent = Components.extractComponent({
        site: this.site(),
        name,
        tpl: ensure(
          tpl as TplTag | TplComponent,
          "Unexpected tpl type to extract component"
        ),
        containingComponent,
        resurfaceParams: true,
        tplMgr: this.tplMgr(),
        getCanvasEnvForTpl: this.viewCtx().getCanvasEnvForTpl.bind(
          this.viewCtx()
        ),
      });
      this.tplMgr().attachComponent(tplComponent.component);
      this.viewCtx().selectNewTpl(tplComponent, true);
      if (tplComponent.component.name !== name) {
        this.studioCtx().maybeWarnComponentRenaming(
          name,
          tplComponent.component.name
        );
      }
      const arena = this.viewCtx().studioCtx.currentArena;
      const key = common.mkUuid();
      notification.info({
        key,
        message: "Component created",
        description: (
          <>
            <a
              onClick={() => {
                this.viewCtx().change(() => {
                  if (this.site().components.includes(tplComponent.component)) {
                    if (isMixedArena(arena)) {
                      this.studioCtx()
                        .siteOps()
                        .createNewFrameForMixedArena(
                          tplComponent.component,
                          {}
                        );
                    } else {
                      this.studioCtx().switchToComponentArena(
                        tplComponent.component
                      );
                    }
                  }
                });
                notification.close(key);
              }}
            >
              {isMixedArena(arena)
                ? "[Edit component in new artboard]"
                : "[Open component]"}
            </a>
          </>
        ),
        duration: 10,
      });
    });

    // Segment track
    trackEvent("Create component", {
      projectName: this.studioCtx().siteInfo.name,
      componentName: name,
      type: "component",
      action: "extract-tpl-to-component",
    });
  }
  isEditing(domNode: HTMLElement | null = null) {
    const editingTextContext = this.viewCtx().editingTextContext();
    if (!editingTextContext) {
      return false;
    }
    if (!domNode) {
      return true;
    }

    // Check if the argument Node is the valNode we're editing (or a
    // descendant). We check all ancestors to return true if any rich text
    // ancestor of domNode is being edited.
    const elements = [...$(domNode).parents(".__wab_editor")];
    if ($(domNode).hasClass("__wab_editor")) {
      elements.push(domNode);
    }
    const domVals = common.filterMapTruthy(elements, (e) =>
      this.viewCtx().dom2val($(e))
    );

    for (const domVal of domVals) {
      if (
        domVal instanceof ValNode &&
        ValNodes.representsSameValNode(domVal, editingTextContext.val)
      ) {
        return true;
      }
    }

    return false;
  }

  insertFreestyle(
    insertableSpec: AddTplItem,
    insertionSpec: InsertionSpec,
    place: Rect | Pt,
    adoptees: Adoptee[]
  ) {
    assert(
      insertionSpec.type !== "ErrorInsertion",
      "insertionSpec type should not be ErrorInsertion"
    );
    const insertableKey = ensureString(insertableSpec.key);
    const cmptTpl = insertableSpec.factory(
      this.viewCtx(),
      place instanceof Pt ? undefined : place
    );
    if (!cmptTpl || !Tpls.isTplTag(cmptTpl)) {
      return;
    }
    const isStack = ["hstack", "vstack", "stack"].includes(insertableKey);
    ensureBaseRs(
      this.viewCtx(),
      cmptTpl,
      omitNils({
        ...(!(place instanceof Pt)
          ? {
              width: px(place.width),
              height: px(place.height),
            }
          : undefined),
        ...(isStack
          ? getSimplifiedStyles(
              insertableKey as AddItemKey,
              this.site().activeTheme?.addItemPrefs as AddItemPrefs | undefined
            )
          : {}),
      })
    );

    insertBySpec(this.viewCtx(), insertionSpec, cmptTpl, true);

    //
    // Determine what's lasso'd into the new element.
    //

    let uniqAdoptees = L.uniqBy(adoptees, (item) => item.val.tpl);
    if (uniqAdoptees.length > 0 && !(place instanceof Pt)) {
      // Remove any default content from cmptTpl, as we will be replacing them
      // with the adoptees
      $$$(cmptTpl).clear();
      const parentRect = Box.fromRect(place).rect();

      if (["hstack", "vstack"].includes(insertableKey)) {
        uniqAdoptees = L.sortBy(uniqAdoptees, (item) =>
          insertableKey === "hstack" ? item.domBox.left() : item.domBox.top()
        );
      } else if (insertableKey === "stack") {
        const [containerType, maybeReorderedTpl] = this.doGuessAutoLayoutType(
          parentRect,
          uniqAdoptees.map((item) => tuple(item.val.tpl, item.domBox.rect()))
        );
        ensureBaseRs(this.viewCtx(), cmptTpl, {
          flexDirection: containerType === "flex-row" ? "row" : "column",
        });
        if (maybeReorderedTpl) {
          uniqAdoptees = maybeReorderedTpl.map((tpl) =>
            ensure(
              uniqAdoptees.find((item) => item.val.tpl === tpl),
              "Should find tpl in uniqAdoptees to reorder the array"
            )
          );
        }
      }

      for (const item of uniqAdoptees) {
        const itemRect = item.domBox.rect();
        const parentOffset = new Pt(
          itemRect.left - parentRect.left,
          itemRect.top - parentRect.top
        );
        const opts = isStack ? { keepFree: false } : undefined;
        this.insertAsChild(item.val.tpl, cmptTpl, opts);
      }
    }

    this.viewCtx().postEval(() => {
      if (insertableKey === "text") {
        this.tryEditText();
      }
    });
  }

  tryInsertAsSibling(
    newNode: TplNode,
    targetNode: TplNode,
    loc: "before" | "after" | Side
  ) {
    if (!this.canInsertAsSibling(newNode, targetNode, true)) {
      return false;
    }
    this.insertAsSibling(newNode, targetNode, loc);
    return true;
  }

  /**
   * Inserts the argument `newNode` as a sibling to `targetNode`.  This will
   * also adopt the parent container's container type for the newNode (so if
   * parent is free, child becomes free; if parent is flex, child becomes
   * relative, etc.)
   */
  insertAsSibling(
    newNode: TplNode,
    targetNode: TplNode,
    loc: "before" | "after" | Side
  ) {
    assert(
      this.canInsertAsSibling(newNode, targetNode, false),
      "Should be able to insert newNode as sibling of targetNode"
    );
    const targetParent = ensure(
      getParentOrSlotSelection(targetNode),
      "targetNode should have a targetParent to be used for inserting newNode"
    );
    if (loc === "before" || loc === "after") {
      this.insertAsChild(
        newNode,
        targetParent,
        loc === "before"
          ? { beforeNode: targetNode }
          : { afterNode: targetNode }
      );
    } else {
      assert(
        isStandardSide(loc),
        "insertAsSibling: loc should be before | after | Side"
      );
      const spec = WRAPPERS_MAP[
        sideToOrient(loc) === "horiz" ? WrapItemKey.hstack : WrapItemKey.vstack
      ] as AddTplItem;
      const newWrapper = this.doWrap(spec, [targetNode], true);
      if (newWrapper) {
        this.insertAsChild(
          newNode,
          newWrapper,
          loc === "left" || loc === "top"
            ? { beforeNode: targetNode }
            : { afterNode: targetNode }
        );
      }
    }
  }

  tryInsertAsChild(
    newNode: TplNode,
    newParent: TplNode | SlotSelection,
    opts: {
      parentOffset?: Pt;
      forceFree?: boolean;
      prepend?: boolean;
      beforeNode?: TplNode;
      afterNode?: TplNode;
    } = {}
  ) {
    if (!this.canInsertAsChild(newNode, newParent, true)) {
      return false;
    }
    this.insertAsChild(newNode, newParent, opts);
    return true;
  }

  /**
   * Inserts the argument `newNode` as the last child of `newParent`.  This
   * will also adopt the parent container's container type for the `newNode`
   * (so if parent is free, child becomes free; if parent is flex, child
   * becomes relative, etc.)
   * @param opts.parentOffset if parent is free, or if opts.forceFree is true,
   *   then the
   *   `newNode` will be absolutely positioned.  `parentOffset` specifies where
   *   in the new parent container this node should be.
   * @param opts.forceFree if parent is not free, usually the child will be
   *   relatively- positioned.  You can force the child to still be foree by
   *   passing true for forceFree.
   * @param opts.keepFree if argument `newNode` has position free, keep it, else
   *   use `newParent` container position to calculate the new child position.
   *   Defaults to true.
   */
  insertAsChild(
    newNode: TplNode,
    newParent: TplNode | SlotSelection,
    opts: {
      parentOffset?: Pt;
      forceFree?: boolean;
      keepFree?: boolean;
      prepend?: boolean;
      beforeNode?: TplNode;
      afterNode?: TplNode;
    } = {}
  ) {
    opts = merge({ keepFree: true }, opts);
    assert(
      this.canInsertAsChild(newNode, newParent, false),
      "Should be able to insert newParent as parent of newNode"
    );
    const existingParent = newNode.parent;
    const isNewNode = !existingParent;
    if (Tpls.isTplTextBlock(newParent)) {
      // Break up text block into a container and text, so we can insert more content
      newParent = ensure(
        this.convertTextBlockToContainer(newParent),
        "Unexpected undefined tpl after converting text to container"
      );
    }
    if (
      Tpls.isTplSlot(newParent) &&
      Tpls.isTplTextBlock(newNode, "div") &&
      newParent.defaultContents.length === 0 &&
      Tpls.hasOnlyStyles(newNode, typographyCssProps, {
        excludeProps: ignoredConvertablePlainTextProps,
      })
    ) {
      // When adding a text block into a TplSlot, we're going to forcibly adopt
      // its styles for the TplSlot
      this.copyMixins(newNode, newParent);
      this.transferStyleProps(newNode, newParent, typographyCssProps);
      this.clearAllStyles(newNode);
    }

    this.adoptLayoutParentContainerStyle(newNode, newParent, opts);
    if (
      isKnownTplNode(newParent) &&
      (Tpls.isTplSlot(newParent) || getAncestorTplSlot(newParent, true))
    ) {
      // If newNode is going to become defaultContent of something, then only keep
      // its base variant setting
      this.viewCtx().variantTplMgr().ensureSlotDefaultContentSetting(newNode);
    }
    if (opts.beforeNode) {
      $$$(opts.beforeNode).before(newNode);
    } else if (opts.afterNode) {
      $$$(opts.afterNode).after(newNode);
    } else if (newParent !== existingParent) {
      if (opts.prepend) {
        $$$(newParent).prepend(newNode);
      } else {
        $$$(newParent).append(newNode);
      }
    }

    this.postInsertAsChildUpdates(newNode, newParent, isNewNode);
  }

  private postInsertAsChildUpdates(
    newNode: TplNode,
    newParent: TplNode | SlotSelection,
    isNewNode: boolean
  ) {
    if (
      isKnownTplNode(newParent) &&
      Tpls.isTplColumns(newParent) &&
      Tpls.isTplColumn(newNode)
    ) {
      redistributeColumnsSizes(newParent, this.viewCtx().variantTplMgr());
      // We clear the tpl column visibility when it's added,
      // so that we don't have empty spaces by default when the
      // user is recording a variant and adding new column.
      const vtm = this.viewCtx().variantTplMgr();
      const baseVs = vtm.ensureBaseVariantSetting(newNode);
      clearTplVisibility(newNode, baseVs.variants);
    }

    if (isNewNode && Tpls.isTplVariantable(newNode)) {
      this.fixupNewlyInsertedNode(newNode);
    }
  }

  private fixupNewlyInsertedNode(newNode: TplNode) {
    const vtm = this.viewCtx().variantTplMgr();
    const curCombo = vtm.getTargetVariantComboForNode(newNode, {
      forVisibility: true,
    });
    if (!isBaseVariant(curCombo)) {
      // If this is a new node for a non-base variant, then we may have set its
      // visibility to not visible in the base variant, so that it is only visible
      // in this current combo.  But that is redundant if it is being added to a subtree
      // that is already invisible in the base variant, so we clear the visibility setting
      // from both its base and cur variants if some ancestor node is already invisible
      // in the base variant.
      const baseVs = vtm.ensureBaseVariantSetting(newNode);
      if (
        getVariantSettingVisibility(baseVs) !== TplVisibility.Visible &&
        getTplVisibilityAsDescendant(newNode, baseVs.variants, false) !==
          TplVisibility.Visible
      ) {
        clearTplVisibility(newNode, curCombo);
        clearTplVisibility(newNode, baseVs.variants);
      }
    }
  }

  // Make sure that in all variant settings of tpl, props are all set to default
  // value.
  private ensureDefaultSetting(tpl: TplNode, props: Set<string> | undefined) {
    if (props === undefined) {
      tpl.vsettings.forEach((vs) => {
        vs.rs.values = {};
        vs.rs.mixins = [];
      });
      return;
    }
    const tag = isKnownTplTag(tpl) ? tpl.tag : "div";
    tpl.vsettings.forEach((vs) => {
      // read from mixins, but write goes to exp directly.
      const exp = new EffectiveVariantSetting(
        tpl,
        [vs],
        this.viewCtx().site
      ).rsh();
      const writer = new RuleSetHelpers(vs.rs, tag);
      for (const prop of props) {
        if (exp.has(prop) || exp.get(prop) !== getCssInitial(prop, tag)) {
          writer.set(prop, getCssInitial(prop, tag));
        }
      }
    });
  }

  private copyMixins(fromNode: TplNode, toNode: TplNode) {
    const vtm = this.viewCtx().variantTplMgr();
    for (const fromVs of fromNode.vsettings) {
      if (fromVs.variants.some((v) => isPrivateStyleVariant(v))) {
        // Only transfer non-private variants
        continue;
      }
      vtm.ensureVariantSetting(toNode, fromVs.variants).rs.mixins =
        fromVs.rs.mixins.slice(0);
    }
  }

  private transferStyleProps(
    fromNode: TplNode,
    toNode: TplNode,
    props?: string[],
    clearProps?: string[]
  ) {
    const vtm = this.viewCtx().variantTplMgr();
    for (const fromVs of fromNode.vsettings) {
      // Only transfer non-private variants
      if (fromVs.variants.some((v) => isPrivateStyleVariant(v))) {
        continue;
      }
      const fromExp = RSH(fromVs.rs, fromNode);
      for (const prop of props || getAllDefinedStyles(fromVs.rs)) {
        if (fromExp.has(prop)) {
          RSH(vtm.ensureVariantSetting(toNode, fromVs.variants).rs, toNode).set(
            prop,
            fromExp.get(prop)
          );
          if (!clearProps || clearProps.includes(prop)) {
            fromExp.clear(prop);
          }
        }
      }
    }
  }

  /**
   * Inserts the argument `newNode` as a wrapping parent for the argument
   * `child`. The `newNode` will adopt the positioning styles of the `child`,
   * and the `child` will be converted to relatively-positioned within the
   * parent.
   */
  insertAsParent(
    newNode: TplTag | TplComponent | SlotSelection,
    child: TplTag | TplComponent | TplSlot
  ) {
    assert(
      this.canInsertAsParent(newNode, child, false),
      "Should be able to insert newNode as parent of child"
    );

    const tplNewNode =
      newNode instanceof SlotSelection
        ? ensure(
            newNode.toTplSlotSelection().tpl,
            "Unexpected TplSlotSelection without tpl"
          )
        : newNode;

    const vtm = this.viewCtx().variantTplMgr();

    if (Tpls.isTplTag(tplNewNode) && tplNewNode.type !== "other") {
      tplNewNode.type = "other";
      RSH(ensureBaseRs(this.viewCtx(), tplNewNode), tplNewNode).set(
        "display",
        "flex"
      );
    }

    if (Tpls.isComponentRoot(child) && Tpls.isTplVariantable(tplNewNode)) {
      // If the child is a component root, then the newNode will become the
      // new component root.  There are some invariants on what VariantSettings
      // must exist for the root element; we carry that invariant here.
      child.vsettings.forEach((vs) =>
        vtm.ensureVariantSetting(tplNewNode, vs.variants)
      );
    }

    if (Tpls.isTplSlot(child)) {
      $$$(child).wrap(tplNewNode);
      return;
    }

    $$$(child).wrap(newNode);

    if (Tpls.isTplTag(tplNewNode)) {
      // Transfer all the positioning styles from the child to parent
      this.transferStyleProps(
        child,
        tplNewNode,
        WRAP_AS_PARENT_PROPS,
        undefined
      );
      // By default, the new wrapping parent should be a flex container
      const baseParentExp = RSH(
        vtm.ensureBaseVariantSetting(tplNewNode).rs,
        tplNewNode
      );
      if (!baseParentExp.has("display")) {
        baseParentExp.set("display", "flex");
      }
      const variantCombos = child.vsettings.map((vs) => vs.variants);
      for (const variantCombo of variantCombos) {
        this.adoptParentContainerStyleForVariant(
          child,
          tplNewNode,
          variantCombo,
          {
            parentOffset: new Pt(0, 0),
          }
        );
      }
    }
  }

  canInsertAsParent(
    newNode: TplNode | SlotSelection,
    target: TplNode | SlotSelection,
    showErrorNotification: boolean
  ) {
    // This better be a new node.
    const tpl =
      newNode instanceof SlotSelection
        ? newNode.toTplSlotSelection().tpl
        : newNode;
    if (!tpl) {
      return false;
    }
    assert(!tpl.parent, "Unexpected tpl with parent");

    // If we are dealing with a node element being wrapped, then we need to check that the relationship
    // between the parent and the child is still valid after the wrap. So we need to check if the parent
    // of the target can accept the new node as a child.
    if (isKnownTplNode(target)) {
      const parentOrSlotSelection = getParentOrSlotSelection(target);

      // We may be wrapping the root node, in which case the parent won't exist
      if (parentOrSlotSelection) {
        const canAddToParent = canAddChildrenAndWhy(parentOrSlotSelection, tpl);
        if (canAddToParent !== true) {
          if (showErrorNotification) {
            notification.error({
              message: "Cannot wrap in container",
              description: renderCantAddMsg(canAddToParent),
            });
          }
          return false;
        }
      }
    }

    if (isKnownTplNode(target) && Tpls.isTplColumn(target)) {
      if (showErrorNotification) {
        notification.error({
          message: "Cannot wrap Column elements",
        });
      }
      return false;
    }

    if (
      !(
        Tpls.isTplTag(newNode) ||
        Tpls.isTplComponent(newNode) ||
        newNode instanceof SlotSelection
      ) ||
      !canAddChildren(newNode)
    ) {
      if (showErrorNotification) {
        notification.error({
          message: "Cannot wrap with this element",
        });
      }
      return false;
    }

    return true;
  }

  // If convertAtomically set to true, it means always convert tpl as the
  // defaultContent of a slot.
  convertToSlot(tpl: TplTag | TplComponent, convertAtomically?: boolean) {
    // You cannot convert a tpl to a TplSlot if it's already a default content for
    // some TplSlot!
    if (
      $$$(tpl)
        .ancestors()
        .toArrayOfTplNodes()
        .find((n) => Tpls.isTplSlot(n))
    ) {
      notification.error({
        message: "Error converting to a slot",
        description:
          "This element is already the default content for a slot; you cannot nest slots.",
      });
      return;
    }

    // You also cannot convert a tpl to a TplSlot if it already has TplSlot as a
    // descendant!
    const containedSlots = getTplSlotDescendants(tpl);
    if (containedSlots.length > 0) {
      notification.error({
        message: "Error converting to a slot",
        description: (
          <>
            This element already contains slots{" "}
            {joinReactNodes(
              containedSlots.map((s) => <code>{s.param.variable.name}</code>),
              ", "
            )}
            . You cannot nest slots.
          </>
        ),
      });
      return;
    }

    if (Tpls.hasTextAncestor(tpl)) {
      notification.error({
        message: "Cannot convert element inside rich text block to a slot.",
        description: "This feature is not supported at the moment.",
      });
      return;
    }

    // And you cannot convert a tpl to a TplSlot if it contains VarRef Exprs as
    // attrs or as args
    const varRefs = Array.from(Components.findVarRefs(tpl));
    if (varRefs.length > 0) {
      notification.error({
        message: "Error converting to a slot",
        description: (
          <>
            This element contains elements linked to props{" "}
            {joinReactNodes(
              varRefs.map((r) => <code>{r.var.name}</code>),
              ", "
            )}
            .
          </>
        ),
      });
      return;
    }

    if (!convertAtomically && Tpls.canConvertInnerTextToSlot(tpl)) {
      // If we're converting a non-div text block into a slot, or a div text block with
      // non-typography styles then we turn the text block into a container first, and
      // then convert the div-text block inside into the slot.
      // The thinking is that is there's a `button` text block, and you turn it into a slot,
      // you probably intended to turn the button text into a slot, not the whole button element.
      tpl = ensure(
        this.convertTextBlockToContainer(tpl, true),
        "Unexpected undefined tpl after converting text to container"
      );
      this.convertToSlot(tpl.children[0] as TplTag, true);
      return;
    }

    const component = $$$(tpl).owningComponent();
    const slotParam = Components.addSlotParam(
      this.site(),
      component,
      tpl.name || undefined
    );

    if (Tpls.isTplComponent(tpl.parent)) {
      // This tpl is currently an Arg to a TplComponent!  Just wrap it in a slot as-is
      // as the defaultContents
      const slot = this.viewCtx()
        .variantTplMgr()
        .mkSlot(slotParam, [Tpls.clone(tpl)]);
      $$$(tpl).replaceWith(slot);
      this.viewCtx().selectNewTpl(slot);
      return;
    }

    if (Tpls.isTplContainer(tpl)) {
      // To turn a container into a slot, we create a TplSlot as the only child of this
      // node, and its defaultContent will be a new div containing the previous
      // children of this node.  So instead of...
      //   <div><blah>hello</blah></div>, it becomes
      //   <div><slot><blah>hello</div></slot></div>.
      // We keep the original wrapping div because it contains all the positioning /
      // spacing / styling we expect to see for the slot content.
      //
      // Note that this is quite different from what we do for turning non-containers
      // into slots; when you turn a container into a slot, we expect the container to
      // still be part of the Component, rather than part of the defaultContents.
      let defaultContents: TplNode[] = [];
      const $$$children = $$$(tpl).children();
      if ($$$children.length() > 0) {
        defaultContents = $$$children
          .remove({ deep: true })
          .clone()
          .toArrayOfTplNodes();
      }
      const slot = this.viewCtx()
        .variantTplMgr()
        .mkSlot(slotParam, defaultContents);
      $$$(tpl).append(slot);
      this.viewCtx().selectNewTpl(slot);
      return;
    }

    // Now we're only dealing with atomic TplTag (text block, image, input) or TplComponent.
    // To turn a non-container into a slot, we can't just replace the tpl with
    // a TplSlot with tpl as the defaultContents.  That's because the tpl may have
    // positioning styles that you'd want to wrap the TplSlot in.

    const vtm = this.viewCtx().variantTplMgr();
    // we need a parent
    //   - if any of the vs has reference to mixin
    //   - or, for non text node, any of the VariantSettings has any
    //     WRAP_AS_PARENT_PROPS settings.
    //   - or, for text node, any of the VariantSettings has any
    //     non typography settings.
    const useMixins = !!tpl.vsettings.find((vs) => vs.rs.mixins.length > 0);
    const toCopyToParent = new Set<string>();

    // If this is a text block, we will be converting it to a plain text TplSlot
    const isTplText = Tpls.isTplTextBlock(tpl, "div");
    tpl.vsettings.forEach((vs) => {
      Object.keys(vs.rs.values).forEach((r) => {
        // We only bother copying style props if any of the variants has a
        // non-default style value
        const val = vs.rs.values[r];
        if (
          val !== tryGetCssInitial(r, Tpls.isTplTag(tpl) ? tpl.tag : undefined)
        ) {
          if (isTplText) {
            // For text blocks, we are converting into a plain text slot, so
            // we want to copy all non-typography css to the parent
            if (!slotCssProps.includes(r)) {
              toCopyToParent.add(r);
            }
          } else if (WRAP_AS_PARENT_PROPS.includes(r)) {
            // For everything else, we just want to copy all styles we usually
            // copy when we wrap a new container as parent
            toCopyToParent.add(r);
          } else if (isSizeProp(r)) {
            // We keep the size on `tpl` for TplComponent or TplImage; so only
            // transfer the image to parent for other normal tags.  We avoid this
            // for TplComponent because TplComponent has special size values like
            // "default"
            if (Tpls.isTplTag(tpl) && !Tpls.isTplImage(tpl)) {
              toCopyToParent.add(r);
            }
          }
        }
      });
    });

    let newContainer;
    let insertIndex = 0;
    if (!tpl.parent || useMixins || toCopyToParent.size > 0) {
      // So tpl has some positioning styles that we'd want in the wrapper.
      // We create a new container with the positioning styles of tpl, then a slot
      // as the child, then the tpl as the defaultContent (but without the positioning styles)
      // We also always do this if tpl is the root node, because we can't have the root node
      // be a TplSlot.
      newContainer = vtm.mkTplTagX("div", undefined, undefined, true);
      // attach the node before performing any variant settings change
      $$$(tpl).wrap(newContainer);
      // We remove deeply instead of just `replace` to remove all private
      // style variants for `tpl`
      $$$(tpl).remove({ deep: true });
      const baseVs = vtm.ensureBaseVariantSetting(newContainer);
      const containerType = getContainerType(
        newContainer.parent,
        this.viewCtx()
      );
      if (containerType && containerType !== "free") {
        convertSelfContainerType(RSH(baseVs.rs, newContainer), containerType);
      }
      this.copyMixins(tpl, newContainer as TplTag);
      this.transferStyleProps(
        tpl,
        newContainer as TplTag,
        Array.from(toCopyToParent),
        [] // don't clear anything!
      );
    } else {
      // Otherwise, there's no need for a new container, and we can just use the existing
      // container as the parent of the TplSlot
      newContainer = ensure(tpl.parent, "Unexpected TplSlot without parent");
      insertIndex = switchType(newContainer)
        .when(TplTag, (tag) => tag.children.findIndex((c) => c === tpl))
        .when(TplSlot, (slot) =>
          slot.defaultContents.findIndex((c) => c === tpl)
        )
        .elseUnsafe(() => -1);
      insertIndex = Math.max(0, insertIndex);
      $$$(tpl).remove({ deep: true });
    }
    const defaultContent = Tpls.clone(tpl);
    this.ensureDefaultSetting(
      defaultContent,
      isTplText ? undefined : toCopyToParent
    );

    const slot = this.viewCtx()
      .variantTplMgr()
      .mkSlot(slotParam, [defaultContent]);
    $$$(newContainer).insertAt(slot, insertIndex);

    if (isTplText) {
      // For plain text slots, transfer styles from the text node to the TplSlot
      this.copyMixins(tpl, slot);
      this.transferStyleProps(tpl, slot, slotCssProps, []);
      this.clearAllStyles(defaultContent as TplTag);
    }
    this.viewCtx().selectNewTpl(slot, true);
  }

  /**
   * Converts tpl to responsive columns
   * Try to convert each child of tpl to a column:
   *  if the child is not a container:
   *   it's created a column and the child is wrapped on it
   *  if the child is a container with sytling that will be lost if transfomed
   * to the column: it's created a column and the child is wrapped on it else:
   * the container is converted to a column
   */
  convertToResponsiveColumns(tpl: TplTag) {
    const variant = getScreenVariant(this.viewCtx());
    const isBaseColumn = variant && !hasMaxWidthVariant(variant);

    tpl.type = Tpls.TplTagType.Columns;
    ensureTplColumnsRs(this.viewCtx(), tpl, variant, isBaseColumn);

    $$$(tpl)
      .children()
      .toArrayOfTplNodes()
      .forEach((child) => {
        let new_child;
        if (
          Tpls.isTplContainer(child) &&
          !hasNonResponsiveColumnsStyle(child)
        ) {
          (child as TplTag).type = Tpls.TplTagType.Column;
          // erase the variant settings of this node because it's going to be transformed into
          // a column and receive the variant settings of a new column
          child.vsettings = [];
          ensureTplColumnRs(this.viewCtx(), child);
          new_child = child;
        } else {
          const column = makeTplColumn(this.viewCtx());
          $$$(child).wrap(column);
          new_child = column;
        }

        // after converting the element to a column or wrapping it in one, we can have elements
        // that were free positioned before and then we need to update their style based on the
        // parent style
        $$$(new_child)
          .children()
          .toArrayOfTplNodes()
          .forEach((nchild) => {
            if (Tpls.isTplVariantable(nchild)) {
              this.adoptParentContainerStyle(nchild, new_child, {
                keepFree: true,
              });
            }
          });
      });

    redistributeColumnsSizes(
      tpl as Tpls.TplColumnsTag,
      this.viewCtx().variantTplMgr(),
      {
        forceEqual: true,
      }
    );
  }

  transferTextStyleToSlot(text: TplTag, slot: TplSlot) {
    this.copyMixins(text, slot);
    this.transferStyleProps(text, slot, slotCssProps);
  }

  private clearAllStyles(tpl: TplNode) {
    tpl.vsettings.forEach((vs) => {
      vs.rs.values = {};
      vs.rs.mixins = [];
    });
  }

  private adoptLayoutParentContainerStyle(
    child: TplNode,
    parent: TplNode | SlotSelection,
    opts: { parentOffset?: Pt; forceFree?: boolean; keepFree?: boolean } = {}
  ) {
    const layoutParent = $$$(parent)
      .layoutParent({ includeSelf: true })
      .maybeOne();
    const curLayoutParent = $$$(child)
      .layoutParent({ includeSelf: false })
      .maybeOne();

    if (layoutParent === curLayoutParent) {
      // If the layout parent hasn't changed, then we will preserve existing styles
      // instead of resetting them
      return;
    }

    const layoutChildren = $$$(child).layoutContent().toArray();
    if (Tpls.isTplTag(layoutParent)) {
      for (const layoutChild of layoutChildren) {
        if (Tpls.isTplVariantable(layoutChild)) {
          this.adoptParentContainerStyle(layoutChild, layoutParent, opts);
        }
      }
    } else if (layoutParent instanceof SlotSelection) {
      for (const layoutChild of layoutChildren) {
        if (Tpls.isTplVariantable(layoutChild)) {
          this.convertToSlotContent(layoutChild);
        }
      }
    }
  }

  /**
   * Adopts the parent's container style across all variants where the parent's
   * container style is specified.
   */
  private adoptParentContainerStyle(
    layoutChild: TplNode,
    layoutParent: TplTag,
    opts: { parentOffset?: Pt; forceFree?: boolean; keepFree?: boolean }
  ) {
    if (!Tpls.isTplTagOrComponent(layoutChild)) {
      return;
    }

    const vtm = this.viewCtx().variantTplMgr();

    vtm.ensureBaseVariantSetting(layoutChild);
    vtm.ensureCurrentVariantSetting(layoutChild);

    // If we are re-parenting, then we must fix up and adapt to the new parent
    // for all variants.  Else if we are in the same parent, then we are only
    // moving absolute position or the relative ordering of the child, so we
    // should only target the current variant.
    const curLayoutParent = $$$(layoutChild).layoutParent().maybeOneTpl();
    const variantCombos =
      curLayoutParent === layoutParent
        ? [vtm.getTargetVariantComboForNode(layoutChild)]
        : layoutChild.vsettings.map((vs) => vs.variants);

    // We loop through and adopt parent style for all relavant variants
    for (const variantCombo of variantCombos) {
      this.adoptParentContainerStyleForVariant(
        layoutChild,
        layoutParent,
        variantCombo,
        opts
      );
    }
  }

  private convertToSlotContent(child: TplNode, variantCombo?: VariantCombo) {
    const vtm = this.viewCtx().variantTplMgr();
    const combos = variantCombo
      ? [variantCombo]
      : child.vsettings.map((vs) => vs.variants);

    for (const combo of combos) {
      // If adding to a slot, then slot children is always relatively positioned
      const effectiveExp = vtm.effectiveVariantSetting(child, combo).rsh();
      if (
        getRshPositionType(effectiveExp) !== PositionLayoutType.auto ||
        ["left", "top", "bottom", "right"].some((prop) =>
          effectiveExp.has(prop)
        )
      ) {
        convertToSlotContent(
          effectiveExp,
          RSH(vtm.ensureVariantSetting(child, combo).rs, child)
        );
      }
    }
  }

  /**
   * Adopts the parent's container style for a specific variant
   */
  private adoptParentContainerStyleForVariant(
    layoutChild: TplNode,
    layoutParent: TplTag,
    variantCombo: VariantCombo,
    opts: { parentOffset?: Pt; forceFree?: boolean; keepFree?: boolean }
  ) {
    if (!Tpls.isTplTagOrComponent(layoutChild)) {
      return;
    }
    const vtm = this.viewCtx().variantTplMgr();
    const effectiveParentExp = vtm
      .effectiveVariantSetting(layoutParent, variantCombo)
      .rsh();
    const parentContainerType = getRshContainerType(effectiveParentExp);
    const effectiveChildExp = vtm
      .effectiveVariantSetting(layoutChild, variantCombo)
      .rsh();
    const childPositionType = getRshPositionType(effectiveChildExp);

    // Clear irrelevant styles that may have come from
    // being a child of a different layout
    const exp = RSH(
      vtm.ensureVariantSetting(layoutChild, variantCombo).rs,
      layoutChild
    );
    if (parentContainerType !== ContainerLayoutType.contentLayout) {
      exp.clearAll(contentLayoutChildProps);
      const width = exp.getRaw("width");
      if (width && CONTENT_LAYOUT_WIDTH_OPTIONS.includes(width)) {
        exp.set("width", "stretch");
      }
    }
    if (parentContainerType !== ContainerLayoutType.grid) {
      exp.clearAll(gridChildProps);
    }
    if (!parentContainerType.includes("flex")) {
      exp.clearAll(flexChildProps);
    }

    // Fixed elements aren't affected by their parent style changes
    if (childPositionType === PositionLayoutType.fixed) {
      return;
    }

    // as sticky works with both layout types, we just adopt it
    // recalculating the offset
    if (childPositionType === PositionLayoutType.sticky) {
      this.adoptStickyPositionType(layoutChild, variantCombo);
      return;
    }

    const newChildPosType =
      opts.forceFree ||
      parentContainerType === ContainerLayoutType.free ||
      (opts.keepFree && childPositionType === PositionLayoutType.free)
        ? "free"
        : "auto";
    if (newChildPosType === "free") {
      let offset: Pt | "current" | undefined = opts.parentOffset;
      if (!offset) {
        if (layoutChild.parent === layoutParent) {
          // If this is the same parent, then by default when going to freely-positioned,
          // we use the current offset of the DOM
          offset = "current";
        } else {
          // Else if we are re-parenting, and there's no offset specified, then the best
          // we can do is at the origin!
          offset = new Pt(0, 0);
        }
      }
      this.adoptFreePositionType(layoutChild, variantCombo, offset);
    } else {
      this.adoptRelativePositionType(layoutChild, variantCombo);
    }
  }

  /**
   * Adopts the "free" position type for the argument `node` for the argument
   * `variant`.
   *
   * @param parentOffset If specified, then it is used as the left/top position
   *   for the
   * `node`.  If you specify "current" as parentOffset, then the current
   * DOM offset will be used.  Note that this is a little weird, as the current
   *   DOM offset may not actually reflect the argument `variant` you're using!
   *    If not specified, then top/left are left unchanged.
   *
   * If we are converting from fixed position, then we are going to ignore
   * offsets since it can represent a position outside of the parent, considering
   * it can lead to bugs.
   *
   * If we are converting from relative position, then the width/height of
   * current relatively-positioned DOM node will be explicitly set as the
   *   width/height.
   */
  adoptFreePositionType(
    node: TplTag | TplComponent,
    variants: Variant[],
    parentOffset?: Pt | "current"
  ) {
    const vtm = this.viewCtx().variantTplMgr();
    const effectiveExp = vtm.effectiveVariantSetting(node, variants).rsh();
    const curPosType = getRshPositionType(effectiveExp);

    // We want to avoid creating a new VariantSetting if the effective VS is already
    // correct
    const mkExp = () => RSH(vtm.ensureVariantSetting(node, variants).rs, node);

    if (curPosType !== PositionLayoutType.free) {
      const exp = mkExp();
      convertToAbsolutePosition(exp);
      if (!parentOffset) {
        parentOffset = this.getTplDomOffset(node);
      }
    }

    let offset: { x: number; y: number } | undefined;

    // Ignore offset if it's coming from a fixed element
    if (curPosType === PositionLayoutType.fixed) {
      offset = { x: 0, y: 0 };
    } else {
      if (parentOffset === "current") {
        offset = this.getTplDomOffset(node);
      } else {
        offset = parentOffset;
      }
    }

    if (
      offset &&
      (effectiveExp.get("left") !== `${offset.x}px` ||
        effectiveExp.get("top") !== `${offset.y}px`)
    ) {
      const exp = mkExp();
      exp.set("left", `${offset.x}px`);
      exp.set("top", `${offset.y}px`);
      exp.clear("right");
      exp.clear("bottom");
    }
  }

  /**
   * Adopts "auto" / relative position type for the argument `node` for the
   * argument `variant`.
   */
  adoptRelativePositionType(
    node: TplTag | TplComponent,
    variantCombo: VariantCombo
  ) {
    const vtm = this.viewCtx().variantTplMgr();
    const effectiveExp = vtm.effectiveVariantSetting(node, variantCombo).rsh();
    const curPosType = getRshPositionType(effectiveExp);
    if (
      curPosType !== PositionLayoutType.auto ||
      ["left", "top", "right", "bottom"].some((prop) => effectiveExp.has(prop))
    ) {
      const exp = RSH(vtm.ensureVariantSetting(node, variantCombo).rs, node);
      convertToRelativePosition(effectiveExp, exp);
    }
  }

  /**
   * Adopts fixed position type for the argument `node`.
   *
   * Used the element offset to position the element properly.
   */
  adoptFixedPositionType(
    node: TplTag | TplComponent,
    variantCombo: VariantCombo
  ) {
    const vtm = this.viewCtx().variantTplMgr();
    const effectiveExp = vtm.effectiveVariantSetting(node, variantCombo).rsh();
    const curPosType = getRshPositionType(effectiveExp);

    if (curPosType !== PositionLayoutType.fixed) {
      const exp = RSH(vtm.ensureVariantSetting(node, variantCombo).rs, node);

      const offset = this.getTplDomOffset(node) || { x: 0, y: 0 };
      exp.set("left", `${offset.x}px`);
      exp.set("top", `${offset.y}px`);
      exp.clear("right");
      exp.clear("bottom");

      if (!effectiveExp.has("z-index")) {
        exp.set("z-index", "1");
      }

      exp.set("position", "fixed");
    }
  }

  /**
   * Adopts sticky position type for the argument `node`.
   */
  adoptStickyPositionType(
    node: TplTag | TplComponent,
    variantCombo: VariantCombo
  ) {
    const vtm = this.viewCtx().variantTplMgr();
    const effectiveExp = vtm.effectiveVariantSetting(node, variantCombo).rsh();
    const curPosType = getRshPositionType(effectiveExp);

    if (curPosType !== PositionLayoutType.sticky) {
      const exp = RSH(vtm.ensureVariantSetting(node, variantCombo).rs, node);

      let offset: { x: number; y: number } | undefined;
      if (
        curPosType === PositionLayoutType.fixed ||
        curPosType === PositionLayoutType.auto
      ) {
        offset = { x: 0, y: 0 };
      } else {
        offset = this.getTplDomOffset(node) || { x: 0, y: 0 };
      }

      exp.set("left", `${offset.x}px`);
      exp.set("top", `${offset.y}px`);
      exp.clear("right");
      exp.clear("bottom");

      if (!effectiveExp.has("z-index")) {
        exp.set("z-index", "1");
      }

      exp.set("position", "sticky");
    }
  }

  convertContainerType(
    tpl: TplTag,
    type: ContainerType,
    reorderedChildren: TplNode[] | undefined
  ) {
    const layoutChildren = $$$(tpl)
      .children()
      .layoutContent()
      .toArrayOfTplNodes();

    const baseVs = ensureBaseVariantSetting(tpl);
    const prevBaseContainerType = getRshContainerType(RSH(baseVs.rs, tpl));
    const isNonVariantableConversion =
      !isContainerTypeVariantable(prevBaseContainerType) ||
      !isContainerTypeVariantable(type as ContainerLayoutType);
    const vtm = this.viewCtx().variantTplMgr();
    if (isNonVariantableConversion) {
      if (!isContainerTypeVariantable(type)) {
        // If the new container type is not variantable, then we must clear
        // clear "display" from all variants except for the base
        for (const vs of tpl.vsettings) {
          if (isBaseVariant(vs.variants)) {
            convertSelfContainerType(RSH(vs.rs, tpl), type);
          } else {
            RSH(vs.rs, tpl).clear("display");
          }
        }
      } else {
        // Else just do it for the current vs
        convertSelfContainerType(
          RSH(vtm.ensureCurrentVariantSetting(tpl).rs, tpl),
          type
        );
      }

      if (reorderedChildren) {
        this.tplMgr().reorderChildren(tpl, reorderedChildren);
      }

      // When doing a non-variantable conversion, the children must
      // be reset in all variants, not just the current variants
      for (const child of layoutChildren) {
        if (isTplVariantable(child)) {
          for (const vs of child.vsettings) {
            this.adoptParentContainerStyleForVariant(child, tpl, vs.variants, {
              keepFree: true,
            });
          }
        }
      }
    } else {
      // Now doing variantable conversion (among free, and flex),
      // we just need to perform the conversion for the current
      // variant
      const rsh = RSH(vtm.ensureCurrentVariantSetting(tpl).rs, tpl);
      const baseRsh = RSH(vtm.ensureBaseVariantSetting(tpl).rs, tpl);

      const effectiveExp = vtm.effectiveVariantSetting(tpl).rsh();
      const previousType = getRshContainerType(effectiveExp);
      const combo = vtm.getTargetVariantComboForNode(tpl);
      if (!convertSelfContainerType(rsh, type, baseRsh)) {
        return;
      }

      if (reorderedChildren) {
        this.tplMgr().reorderChildren(tpl, reorderedChildren);
      }

      // If both layout types aren't free we gonna keep the free elements in their positions
      const keepFree =
        previousType !== ContainerLayoutType.free &&
        type !== ContainerLayoutType.free;

      layoutChildren.forEach((child) => {
        if (Tpls.isTplVariantable(child)) {
          this.adoptParentContainerStyleForVariant(child, tpl, combo, {
            keepFree,
          });
        }
      });
    }
  }

  convertTextBlockToContainer(
    tpl: Tpls.TplTextTag,
    inferFlexStyleFromChild = false
  ) {
    if (Tpls.hasTextAncestor(tpl)) {
      notification.error({
        message: "Cannot convert text inside rich text block to a container.",
        description: "This feature is not supported at the moment.",
      });
      return undefined;
    }
    const container = tpl as TplTag;
    container.type = "other";
    const vtm = this.viewCtx().variantTplMgr();
    const textChildNode = vtm.mkTplTagX(
      "div",
      { type: Tpls.TplTagType.Text },
      undefined,
      true
    );
    textChildNode.children = container.children;
    container.children = [];
    Tpls.fixParentPointers(textChildNode);
    const owningComponent = $$$(container).tryGetOwningComponent();
    const privateStyleVariantsMap = new Map<Variant, Variant>();
    for (const vs of container.vsettings) {
      const variantCombo = vs.variants.map((v) => {
        if (privateStyleVariantsMap.has(v)) {
          return ensure(
            privateStyleVariantsMap.get(v),
            "Should check if privateStyleVariantsMap contains variant"
          );
        }
        if (isPrivateStyleVariant(v) && owningComponent) {
          const newVariant = this.tplMgr().createPrivateStyleVariant(
            owningComponent,
            textChildNode,
            maybe(v.selectors, (s) => [...s])
          );
          privateStyleVariantsMap.set(v, newVariant);
          return newVariant;
        }
        return v;
      });
      const childVs = vtm.ensureVariantSetting(
        textChildNode,
        variantCombo,
        vtm.getOwningComponentForNewNode()
      );
      // Move the text and typography styling from parent to child vs
      childVs.text = vs.text;
      vs.text = undefined;

      const parentExpr = RSH(vs.rs, container);
      const childExpr = RSH(childVs.rs, container);

      if (inferFlexStyleFromChild) {
        // `button` without text-align is assumed to have `text-align:
        // center` from default user agent styles.
        if (parentExpr.has("text-align") || container.tag === "button") {
          const align = parentExpr.get("text-align") || "center";
          if (align === "center") {
            parentExpr.set("justify-content", "center");
          } else if (align === "right") {
            parentExpr.set("justify-content", "flex-end");
          }
        }
      }

      for (const prop of typographyCssProps) {
        if (parentExpr.has(prop)) {
          const val = parentExpr.getRaw(prop);
          if (val) {
            childExpr.set(prop, val);
          }
          parentExpr.clear(prop);
        } else if (container.tag === "button") {
          childExpr.set("text-align", "center");
        }
      }

      for (const mixin of vs.rs.mixins) {
        if (hasTypography(RSH(mixin.rs, container))) {
          childVs.rs.mixins.push(mixin);
          removeFromArray(vs.rs.mixins, mixin);
        }
      }
    }

    // On the base variant, set the default container type.
    const baseVs = vtm.ensureBaseVariantSetting(container);
    const parentType = getContainerType(container.parent, this.viewCtx());
    if (parentType && parentType !== "free" && !inferFlexStyleFromChild) {
      convertSelfContainerType(RSH(baseVs.rs, container), parentType);
    } else {
      convertSelfContainerType(RSH(baseVs.rs, container), "flex-row");
    }
    $$$(container).append(textChildNode);
    this.adoptParentContainerStyleForVariant(
      textChildNode,
      container,
      baseVs.variants,
      {}
    );
    return container;
  }

  convertPictureToContainer(tpl: Tpls.TplPictureTag) {
    // Convert into a div container
    (tpl as TplTag).type = "other";
    (tpl as TplTag).tag = "div";
    for (const vs of tpl.vsettings) {
      // For each vsetting, convert the image src ref into a
      // background image layer
      const srcAttr = vs.attrs.src;
      if (!srcAttr) {
        continue;
      }

      delete vs.attrs.src;

      let imageUri: string | undefined = undefined;
      if (isKnownImageAssetRef(srcAttr)) {
        const asset = srcAttr.asset;
        if (asset.dataUri) {
          imageUri = mkImageAssetRef(asset);
        }
      } else {
        imageUri = exprs.tryExtractLit(srcAttr);
      }

      if (!imageUri) {
        continue;
      }

      const props = getBackgroundImageProps(imageUri);
      RSH(vs.rs, tpl).merge({
        ...props,
        display: "flex",
      });
    }
  }

  getTplDom(node: TplNode) {
    const valNode = this.viewCtx().renderState.tpl2bestVal(
      node,
      this.viewCtx().focusedCloneKey()
    );
    // Even if we valNode is not undefined, it might not have a DOM element if it's
    // a component instance whose root node is not visible.
    const maybeDom =
      valNode &&
      this.viewCtx().renderState.sel2dom(valNode, this.viewCtx().canvasCtx);
    return maybeDom ? (common.asOne(maybeDom) as HTMLElement) : undefined;
  }

  private getTplDomOffset(node: TplNode) {
    const dom = this.getTplDom(node);
    return dom ? getOffsetPoint(dom) : undefined;
  }

  /**
   * Returns true if TplNode is visible for current target variants
   **/
  getTargetTplVisibility = (tpl: TplNode) => {
    const combo = this.viewCtx()
      .variantTplMgr()
      .getTargetVariantComboForNode(tpl);
    return getEffectiveTplVisibility(tpl, combo);
  };

  /**
   * Returns true if TplNode is visible for current active variants
   **/
  getEffectiveTplVisibility = (tpl: TplNode) => {
    const combo = [
      ...this.viewCtx().variantTplMgr().getActivatedVariantsForNode(tpl),
    ];
    return getEffectiveTplVisibility(tpl, combo);
  };

  isSelectableVisible = (selectable: Selectable) => {
    return switchType(selectable)
      .when(ValNode, (valNode) => {
        if (!isTplVariantable(valNode.tpl)) {
          return false;
        }
        const effectiveVisibility = this.getEffectiveTplVisibility(valNode.tpl);
        const effectiveVs = this.viewCtx()
          .variantTplMgr()
          .effectiveVariantSetting(valNode.tpl);
        return !isVisibilityHidden(
          effectiveVisibility,
          effectiveVs.dataCond,
          () => this.viewCtx().getCanvasEnvForTpl(valNode.tpl),
          {
            projectFlags: this.viewCtx().projectFlags(),
            component: valNode.valOwner?.tpl.component ?? null,
            inStudio: true,
          }
        );
      })
      .when(SlotSelection, (slotSelection) => {
        return (
          getTreeNodeVisibility(this._viewCtx, slotSelection) ===
          TplVisibility.Visible
        );
      })
      .result();
  };

  setTplVisibility = (tpl: TplNode, visibility: TplVisibility) => {
    const combo = this.viewCtx()
      .variantTplMgr()
      .getTargetVariantComboForNode(tpl, { forVisibility: true });
    setTplVisibility(tpl, combo, visibility);
  };

  setDataCond = (tpl: TplNode, cond: CustomCode | ObjectPath) => {
    const combo = this.viewCtx()
      .variantTplMgr()
      .getTargetVariantComboForNode(tpl, { forVisibility: true });
    const vs = ensureVariantSetting(tpl, combo);
    vs.dataCond = cond;
  };

  private getFocusedTplOrError() {
    const tpl = this.viewCtx().focusedTpl(true);
    if (!tpl) {
      // Can make this more descriptive.
      notification.error({
        message: "Cannot insert into the selected element.",
        description: "Choose a container to insert in.",
      });
    }
    return tpl;
  }

  tryInsertInsertableSpec<T>(
    spec: {
      key?: AddItemKey | string;
      factory: (viewCtx: ViewCtx, extraInfo: T) => TplNode | undefined;
    },
    loc: InsertRelLoc,
    extraInfo: T,
    target?: TplNode | SlotSelection
  ): TplNode | null {
    let insertedTpl: TplNode | null = null;
    this.change(() => {
      const tpl =
        target ||
        this.viewCtx().focusedTplOrSlotSelection() ||
        this.viewCtx().arenaFrame().container.component.tplTree;
      const preserveCloneKey = !target;

      if (!tpl) {
        return;
      }
      const cmptTpl = spec.factory(this.viewCtx(), extraInfo);
      if (!cmptTpl) {
        return;
      }
      if (
        isKnownTplNode(target) &&
        this.isRootNodeOfFrame(target) &&
        isPageComponent(this.viewCtx().arenaFrame().container.component)
      ) {
        if (Tpls.isTplVariantable(cmptTpl)) {
          cmptTpl.vsettings.forEach((vs) => {
            const rsh = RSH(vs.rs, cmptTpl);
            rsh.set("width", CONTENT_LAYOUT_FULL_BLEED);
            rsh.set("height", "stretch");
          });
        }
      } else if (
        tpl instanceof SlotSelection &&
        isCodeComponent(tpl.getTpl().component)
      ) {
        // we don't know the layout of code component. So let's clear the position style
        // of cmptTpl, which is generated by spec.factory by default.
        if (Tpls.isTplVariantable(cmptTpl)) {
          cmptTpl.vsettings.forEach((vs) => {
            RSH(vs.rs, cmptTpl).clear("position");
          });
        }
      }

      // Ensure the newly created wrapping container is visible in the base variant
      if (InsertRelLoc.wrap === loc && isKnownTplTag(cmptTpl)) {
        const baseVs = cmptTpl.vsettings.find((vs) =>
          isBaseVariant(vs.variants)
        );
        if (baseVs) {
          setTplVisibility(cmptTpl, baseVs.variants, TplVisibility.Visible);
        }
      }
      if (this.tryInsertAt(cmptTpl, undefined, loc, tpl, preserveCloneKey)) {
        insertedTpl = cmptTpl;
      }
    });

    if (spec.key === AddItemKey.text) {
      // window.requestAnimationFrame(() => this.tryEditText());
    }

    if ([InsertRelLoc.append, InsertRelLoc.prepend].includes(loc)) {
      const parentElement = this._viewCtx.focusedDomElt()?.[0]?.parentElement;
      window.requestAnimationFrame(() =>
        parentElement?.scrollTo(
          parentElement?.scrollWidth,
          parentElement?.scrollHeight
        )
      );
    }

    return insertedTpl;
  }

  isRootNodeOfStretchFrame(node: TplNode) {
    return (
      this.isRootNodeOfFrame(node) &&
      this.viewCtx().arenaFrame().viewMode === FrameViewMode.Stretch
    );
  }

  isFocusedOnRootOfStretchFrame() {
    const tpl = this.viewCtx().focusedTpl();
    return !!tpl && this.isRootNodeOfStretchFrame(tpl);
  }

  isRootNodeOfFrame(node: TplNode) {
    const frame = this.viewCtx().arenaFrame();
    return frame.container.component.tplTree === node;
  }

  async convertFrameToComponent(name?: string, type?: "component" | "page") {
    const frame = this.viewCtx().arenaFrame();
    if (!type) {
      type = frame.viewMode === FrameViewMode.Stretch ? "page" : "component";
    }
    if (!name) {
      name = await (type === "page"
        ? promptPageName({ default: frame.name })
        : promptComponentName({ default: frame.name }));
    }
    if (!name) {
      return;
    }
    this.change(() => {
      const component = this.viewCtx().component;

      this.studioCtx()
        .siteOps()
        .tryRenameComponent(component, name as string);

      component.type = ComponentType.Plain;

      if (type === "page") {
        this.tplMgr().convertComponentToPage(component);
      }
    });

    // Segment track
    trackEvent("Create component", {
      projectName: this.studioCtx().siteInfo.name,
      componentName: name,
      type,
      action: "extract-frame-to-component",
    });
  }

  clearTargetVariants() {
    const viewCtx = this.viewCtx();
    viewCtx.currentComponentStackFrame().setTargetVariants([]);
    viewCtx.globalFrame.setTargetVariants([]);
  }

  private studioCtx() {
    return this.viewCtx().studioCtx;
  }

  renameNode(nameable: ArenaFrame | Tpls.TplNamable, name: string) {
    if (isKnownArenaFrame(nameable) && nameable?.container.component.name) {
      nameable.container.component.name = name;
      nameable.name = "";
    } else {
      nameable.name = name;
    }
  }

  private notifyMissingTplRef(
    tplWithExpr: TplNode | null,
    referencedTpl: TplNode
  ) {
    const name = Tpls.isTplNamable(referencedTpl)
      ? referencedTpl.name
      : undefined;
    const key = common.mkUuid();
    notification.error({
      key,
      message: "Cannot create component",
      description: (
        <>
          Selected elements contain reference to "
          {name ?? capitalizeFirst(Tpls.summarizeTpl(referencedTpl))}
          ".{" "}
          {tplWithExpr && (
            <a
              onClick={() => {
                this.viewCtx().setStudioFocusByTpl(tplWithExpr);
                notification.close(key);
              }}
            >
              [Go to reference]
            </a>
          )}
        </>
      ),
    });
  }
}

export const enum InsertRelLoc {
  before = "before",
  prepend = "prepend",
  append = "append",
  after = "after",
  wrap = "wrap",
  freestyle = "freestyle",
}

const AS_CHILD_LOC = [InsertRelLoc.prepend, InsertRelLoc.append];
const AS_SIBLING_LOC = [InsertRelLoc.before, InsertRelLoc.after];
export type AsChildInsertRelLoc = InsertRelLoc.prepend | InsertRelLoc.append;
export type AsSiblingInsertRelLoc = InsertRelLoc.before | InsertRelLoc.after;

export function isAsChildRelLoc(loc: InsertRelLoc): loc is AsChildInsertRelLoc {
  return AS_CHILD_LOC.includes(loc);
}
export function isAsSiblingRelLoc(
  loc: InsertRelLoc
): loc is AsSiblingInsertRelLoc {
  return AS_SIBLING_LOC.includes(loc);
}

/**
 * Returns the set of valid InsertRelLocs when inserting at the target node.
 *
 * Note that for slots, we determine whether we're editing default slot
 * contents.  So it's not just a check of canAddChildren.  This is why we
 * require viewCtx.
 */
export function getValidInsertLocs(
  viewCtx: ViewCtx,
  target: TplNode | SlotSelection
): Set<InsertRelLoc> {
  const validLocs = new Set<InsertRelLoc>();

  function addAll(locs: InsertRelLoc[]) {
    locs.forEach((loc) => validLocs.add(loc));
  }

  if (target instanceof SlotSelection) {
    if (canAddChildrenToSlotSelection(target)) {
      addAll([InsertRelLoc.prepend, InsertRelLoc.append]);
    }
  } else {
    if (canAddChildren(target)) {
      if (Tpls.isTplSlot(target)) {
        const owner = Tpls.getTplOwnerComponent(target);
        if (viewCtx.showingDefaultSlotContentsForComponent(owner)) {
          // If we are focused on a ValSlot (so tpl is a TplSlot), and we are currently
          // showing the default slot contents for the owning TplComponent, then
          // we want to append to the slot as default content.
          addAll(AS_CHILD_LOC);
        }
      } else {
        addAll(AS_CHILD_LOC);
      }
    }

    if (canAddSiblings(target)) {
      addAll(AS_SIBLING_LOC);
    }

    if (Tpls.canBeWrapped(target)) {
      addAll([InsertRelLoc.wrap]);
    }
  }

  return validLocs;
}

/**
 * Determines the preferred InsertRelLoc when inserting at the given node.
 *
 * Usually we try to append if possible (within), otherwise insert after
 * (around).  We consult getValidInsertLocs for what's possible.
 *
 * But there are special cases, where although they *can* receive children (e.g.
 * a component instance, or an h1 text block), we still prefer to insert around
 * them.
 */
export function getPreferredInsertLocs(
  viewCtx: ViewCtx,
  target: TplNode | SlotSelection
): InsertRelLoc[] {
  // Special cases
  if (
    isKnownTplNode(target) &&
    canAddSiblings(target) &&
    (Tpls.isTplComponent(target) ||
      Tpls.isTplTextBlock(target) ||
      Tpls.isTplImage(target))
  ) {
    return [InsertRelLoc.after, InsertRelLoc.before];
  }

  const rank: InsertRelLoc[] = [
    InsertRelLoc.append,
    InsertRelLoc.prepend,
    InsertRelLoc.after,
    InsertRelLoc.before,
  ];
  const validInsertLocs = getValidInsertLocs(viewCtx, target);
  return rank.filter((r) => validInsertLocs.has(r));
}

export function getFocusedInsertAnchor(viewCtx: ViewCtx) {
  const target = viewCtx.focusedTplOrSlotSelection();
  if (target) {
    return target;
  } else {
    return viewCtx.tplRoot();
  }
}

export function getMergedTextArg(tpl: TplComponent) {
  const slotParams = getSlotParams(tpl.component)
    .map((p) => {
      if (p.mergeWithParent) {
        const arg = $$$(tpl).getSlotArgForParam(p);
        const maybeText = getSingleTextBlockFromArg(arg);
        if (maybeText) {
          return tuple(p, arg);
        }
      }
      return undefined;
    })
    .filter(common.isNonNil);

  if (slotParams.length === 0) {
    return undefined;
  } else if (slotParams.length === 1) {
    return slotParams[0][1];
  } else {
    const childrenSlot = slotParams.find(
      ([p, t]) => p.variable.name === "children"
    );
    if (childrenSlot) {
      return childrenSlot[1];
    }
    return slotParams[0][1];
  }
}

export function getOnlyVisibleTextArg(viewCtx: ViewCtx, tpl: TplNode) {
  const slotParams =
    isTplComponent(tpl) && getSlotParams((tpl as TplComponent).component);
  const visibleSlotParams =
    slotParams &&
    slotParams.filter(
      (p) =>
        getTreeNodeVisibility(
          viewCtx,
          new SlotSelection({ tpl: tpl as TplComponent, slotParam: p })
        ) === TplVisibility.Visible
    );
  const arg =
    visibleSlotParams &&
    visibleSlotParams.length === 1 &&
    $$$(tpl).getSlotArg(visibleSlotParams[0].variable.name);
  return arg && isTextBlockArg(arg) ? arg : undefined;
}
