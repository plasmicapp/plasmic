import {
  getPreferredInsertLocs,
  InsertRelLoc,
} from "@/wab/client/components/canvas/view-ops";
import { useCommentsCtx } from "@/wab/client/components/comments/CommentsProvider";
import { maybeShowContextMenu } from "@/wab/client/components/ContextMenu";
import { PlumyIcon } from "@/wab/client/components/plume/plume-markers";
import {
  variantComboName,
  VariantSettingPopoverContent,
  VariantSettingPopoverTitle,
} from "@/wab/client/components/style-controls/DefinedIndicator";
import Indicator from "@/wab/client/components/style-controls/Indicator";
import { makeTreeNodeMenu } from "@/wab/client/components/tpl-menu";
import { DragItem } from "@/wab/client/components/widgets";
import { EditableLabel } from "@/wab/client/components/widgets/EditableLabel";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { ListSpace } from "@/wab/client/components/widgets/ListStack";
import MenuButton from "@/wab/client/components/widgets/MenuButton";
import {
  BUTTON_ICON,
  COMPONENT_ICON,
  CONTENT_LAYOUT_ICON,
  EXPANDER_COLLAPSED_ICON,
  EXPANDER_EXPANDED_ICON,
  FREE_CONTAINER_ICON,
  getVisibilityIcon,
  GRID_CONTAINER_ICON,
  HEADING_ICON,
  HIDDEN_ICON,
  HORIZ_STACK_ICON,
  IMAGE_ICON,
  INPUT_ICON,
  LINK_ICON,
  PASSWORD_INPUT_ICON,
  SLOT_ICON,
  TEXT_ICON,
  TEXTAREA_ICON,
  VERT_STACK_ICON,
} from "@/wab/client/icons";
import { renderCantAddMsg } from "@/wab/client/messages/parenting-msgs";
import LockIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Lock";
import UnlockIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__Unlock";
import VerticalDashIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__VerticalDash";
import RepeatingsvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__RepeatingSvg";
import { DragInsertState, StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { TutorialEventsType } from "@/wab/client/tours/tutorials/tutorials-events";
import {
  canSetDisplayNone,
  getSlotSelectionDisplayName,
} from "@/wab/client/utils/tpl-client-utils";
import {
  swallowingClick,
  useChanged,
  useForwardedRef,
} from "@/wab/commons/components/ReactUtil";
import { AnyArena } from "@/wab/shared/Arenas";
import { assert, ensure, maybe, unexpected } from "@/wab/shared/common";
import { isCodeComponent } from "@/wab/shared/core/components";
import { tryExtractLit } from "@/wab/shared/core/exprs";
import { Selectable } from "@/wab/shared/core/selection";
import { SlotSelection } from "@/wab/shared/core/slots";
import * as Tpls from "@/wab/shared/core/tpls";
import {
  clone,
  getTplOwnerComponent,
  isCodeComponentRoot,
  isTplTagOrComponent,
  isTplVariantable,
} from "@/wab/shared/core/tpls";
import {
  bestValForTpl,
  ValComponent,
  ValNode,
  ValSlot,
} from "@/wab/shared/core/val-nodes";
import { asTpl } from "@/wab/shared/core/vals";
import { EffectiveVariantSetting } from "@/wab/shared/effective-variant-setting";
import { CanvasEnv } from "@/wab/shared/eval";
import {
  ContainerLayoutType,
  getRshContainerType,
} from "@/wab/shared/layoututils";
import {
  Expr,
  isKnownTplNode,
  isKnownTplSlot,
  TplNode,
} from "@/wab/shared/model/classes";
import {
  canAddChildrenAndWhy,
  canAddSiblingsAndWhy,
  CantAddChildMsg,
  CantAddSiblingMsg,
} from "@/wab/shared/parenting";
import {
  getPlumeElementDef,
  getPlumeSlotDef,
} from "@/wab/shared/plume/plume-registry";
import {
  getAncestorTplSlot,
  getSlotSelectionContainingTpl,
  isCodeComponentSlot,
  isPlainTextTplSlot,
} from "@/wab/shared/SlotUtils";
import { $$$ } from "@/wab/shared/TplQuery";
import {
  isBaseVariant,
  isVariantSettingEmptyExcludingDefaultIgnorableStyles,
} from "@/wab/shared/Variants";
import { TplVisibility } from "@/wab/shared/visibility-utils";
import { selectionControlsColor } from "@/wab/styles/css-variables";
import { notification, Tooltip } from "antd";
import cx from "classnames";
import $ from "jquery";
import L, { isArray } from "lodash";
import * as mobx from "mobx";
import { computed } from "mobx";
import { observer } from "mobx-react";
import { computedFn } from "mobx-utils";
import pluralize from "pluralize";
import * as React from "react";
import { FixedSizeList } from "react-window";

import { TplClip } from "@/wab/client/clipboard/local";
import { getElementCommentsStats } from "@/wab/client/components/comments/utils";
import {
  getNodeSummary,
  OutlineCtx,
  OutlineNode,
  OutlineNodeData,
  OutlineNodeKey,
} from "@/wab/client/components/sidebar-tabs/OutlineCtx";
import BoltIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__Bolt";
import SpeechBubblesvgIcon from "@/wab/client/plasmic/plasmic_kit_icons/icons/PlasmicIcon__SpeechBubbleSvg";
import { INTERACTIVE_CAP, REPEATED_CAP } from "@/wab/shared/Labels";

function RepIcon() {
  return (
    <Tooltip title={`${REPEATED_CAP} element`}>
      <Icon icon={RepeatingsvgIcon} />
    </Tooltip>
  );
}

function ActionIcon() {
  return (
    <Tooltip title={`${INTERACTIVE_CAP} element`}>
      <Icon icon={BoltIcon} />
    </Tooltip>
  );
}

function CommentIcon({
  commentCount,
  replyCount,
}: {
  commentCount: number;
  replyCount: number;
}) {
  let title = `${commentCount} ${commentCount > 1 ? "comments" : "comment"}`;
  if (replyCount > 0) {
    title += ` and ${replyCount} ${replyCount > 1 ? "replies" : "reply"}`;
  }
  return (
    <Tooltip title={title}>
      <Icon icon={SpeechBubblesvgIcon} />
    </Tooltip>
  );
}

const TplTreeNode = observer(function TplTreeNode(props: {
  id: OutlineNodeKey;
  item: TplNode | SlotSelection;
  viewCtx: ViewCtx;
  outlineCtx: OutlineCtx;
  indent: number;
  ancestorHidden: boolean;
  ancestorLocked: boolean;
  componentFrameNum: number;
  isOpen: boolean;
  visibility: TplVisibility;
  isHidden: boolean;
  setOpen: (open: boolean) => void;
  isLeaf: boolean;
  parentId: OutlineNodeKey | undefined;
  isDropParent: boolean;
}) {
  const {
    id,
    item,
    viewCtx,
    outlineCtx,
    indent,
    componentFrameNum,
    isOpen,
    isHidden,
    visibility,
    setOpen,
    isLeaf,
    parentId,
    isDropParent,
  } = props;

  const commentsCtx = useCommentsCtx();
  const component = $$$(item).owningComponent();
  const isInFrame = !!viewCtx
    .componentStackFrames()
    .find((f) => f.tplComponent.component === component);
  if (!isInFrame) {
    return null;
  }

  function isMatchingSelectable(sel: Selectable | null) {
    if (!sel) {
      return false;
    }
    if (item instanceof SlotSelection && sel instanceof ValSlot) {
      // When we call SQ().ancestors().toArray().some(isMatchingSelectable)
      // below we are using fullStack SQ to query for ancestors, so we expect to
      // only see ValSlot instead of SlotSelection for ancestors.  Thus, we
      // try to match up a ValSlot with a SlotSelection here.
      const valComponent = sel.valOwner;
      if (
        valComponent &&
        item.getTpl() === valComponent.tpl &&
        item.slotParam === sel.tpl.param
      ) {
        return true;
      }
    }
    if (sel instanceof ValNode) {
      return sel.tpl === item;
    } else {
      return (
        item instanceof SlotSelection && sel.toTplSlotSelection().equals(item)
      );
    }
  }

  const isFocused = computed(
    () => {
      const focusedTpls = viewCtx.focusedTpls();
      if (focusedTpls.some((tpl) => tpl === item)) {
        return true;
      }

      const focusedSelectables = viewCtx.focusedSelectables();
      if (focusedSelectables.some((sel) => isMatchingSelectable(sel))) {
        return true;
      }

      return false;
    },
    { name: "isFocused" }
  ).get();

  const isHovered = computed(
    () => {
      const hoveredSelectable = viewCtx.hoveredSelectable();
      return !!hoveredSelectable && isMatchingSelectable(hoveredSelectable);
    },
    { name: "isHovered" }
  ).get();

  const parentsWithSlotSelections = computed(
    () => $$$(item).parentsWithSlotSelections().toArray(),
    { name: "parentsWithSlotSelections" }
  );

  const isStrictDescendantOfFocus = computed(
    () => {
      const focusedSelectable = viewCtx.focusedSelectable();
      if (isFocused || !focusedSelectable) {
        return false;
      }

      return parentsWithSlotSelections.get().some((node) => {
        if (
          node instanceof SlotSelection &&
          focusedSelectable instanceof SlotSelection
        ) {
          return (
            node.slotParam === focusedSelectable.slotParam &&
            node.getTpl() === focusedSelectable.getTpl()
          );
        } else if (
          isKnownTplNode(node) &&
          focusedSelectable instanceof ValNode
        ) {
          return node === focusedSelectable.tpl;
        } else {
          return false;
        }
      });
    },
    { name: "isStrictDescendantOfFocus" }
  ).get();

  const effectiveVs = computed(
    () =>
      isTplTagOrComponent(item)
        ? viewCtx.variantTplMgr().effectiveVariantSetting(item)
        : undefined,
    { name: "TreeNode.effectiveVs" }
  );

  const indicatedVs = computed(
    () => {
      if (isTplVariantable(item) && viewCtx.isFocusedViewCtx()) {
        const vtm = viewCtx.variantTplMgr();
        const getRelevantVs = () => {
          if (getAncestorTplSlot(item, true)) {
            // This tpl is a default slot content; only show indicator if we are
            // targeting hte base variant
            if (isBaseVariant(vtm.getCurrentVariantCombo())) {
              return vtm.ensureBaseVariantSetting(item);
            } else {
              return undefined;
            }
          } else {
            return viewCtx.variantTplMgr().tryGetTargetVariantSetting(item);
          }
        };

        const vs = getRelevantVs();
        return !!vs && !isVariantSettingEmptyExcludingDefaultIgnorableStyles(vs)
          ? vs
          : undefined;
      }
      return undefined;
    },
    { name: "indicatedVs" }
  ).get();

  const itemAsTpl = () => {
    // If `item` is a SlotSelection, then `tpl` is the instantiated `TplComponent`
    return item instanceof SlotSelection
      ? ensure(
          item.toTplSlotSelection().tpl,
          "Slot selection in tpl tree should have a tpl"
        )
      : item;
  };

  const isOutOfContext = computed(
    () => {
      const focusedVc = viewCtx.studioCtx.focusedOrFirstViewCtx();
      if (
        focusedVc &&
        focusedVc.currentComponentCtx() &&
        focusedVc !== viewCtx
      ) {
        return true;
      }
      return viewCtx.isOutOfContext(itemAsTpl());
    },
    { name: "isOutOfContext" }
  ).get();

  const isDrilled = computed(
    () => {
      return maybe(
        viewCtx.currentComponentCtx(),
        (ctx) =>
          ctx.valComponent() ===
          tryGetValForTpl(viewCtx, item, componentFrameNum)
      );
    },
    { name: "isDrilled" }
  ).get();

  const isDrilledDescendant = computed(
    () => {
      const spotlightComponent = maybe(viewCtx.currentComponentCtx(), (ctx) =>
        ctx.component()
      );
      return (
        !!spotlightComponent &&
        $$$(itemAsTpl()).tryGetOwningComponent() === spotlightComponent
      );
    },
    { name: "isDrilledDescendant" }
  ).get();

  const hasRep = computed(
    () => {
      if (Tpls.isTplVariantable(item)) {
        const vs = effectiveVs.get();
        return !!vs && !!vs.dataRep;
      }
      return false;
    },
    { name: "hasRep" }
  ).get();

  const hasInteraction = computed(
    () => {
      if (isKnownTplNode(item)) {
        return Tpls.hasEventHandlers(item);
      }
      return false;
    },
    {
      name: "hasInteraction",
    }
  ).get();

  const getCommentsStats = () => {
    if (!isKnownTplNode(item)) {
      return {
        commentCount: 0,
        replyCount: 0,
      };
    }
    return getElementCommentsStats(commentsCtx, item);
  };

  const visibilityDataCond = effectiveVs.get()?.dataCond;
  const canvasEnv = isKnownTplNode(item)
    ? viewCtx.getCanvasEnvForTpl(item)
    : undefined;

  const isRoot = isKnownTplNode(item) && !item.parent;

  const getTextContent = computedFn(function getTextContent(n: TplNode) {
    const text = Tpls.getTplTextBlockContent(n, viewCtx);
    return text ? `"${text}"` : undefined;
  });

  const renderExpander = () => {
    if (isLeaf || isRoot) {
      return (
        <div
          className="tpltree__label__expander"
          data-state-isopen={isLeaf ? "false" : "true"}
        />
      );
    } else {
      return (
        <div
          className="tpltree__label__expander"
          onClick={swallowingClick(() => setOpen(!isOpen))}
          data-state-isopen={isOpen ? "true" : "false"}
        >
          {isOpen ? EXPANDER_EXPANDED_ICON : EXPANDER_COLLAPSED_ICON}
        </div>
      );
    }
  };

  const renderVisibilityToggle = () => {
    // Visibility toggle should take up space if showLockIcon is true,
    // so that showLockIcon always shows up at the same column
    if (item instanceof SlotSelection && isHidden) {
      return (
        <Tooltip title={"This prop is currently not visible"}>
          <div
            className={cx({
              "tpltree__label__action-icon": true,
              tpltree__label__visibility: true,
              "tpltree__label__action-icon--visible": true,
              "tpltree__label__action-icon--take-space": showLockIcon,
            })}
          >
            {HIDDEN_ICON}
          </div>
        </Tooltip>
      );
    }
    if (!Tpls.canToggleVisibility(item)) {
      // Can only toggle visibility for tags, components.  But we still want to
      // take up space here so things line up vertically.
      return (
        <div
          className={cx({
            "tpltree__label__action-icon": true,
            "tpltree__label__action-icon--take-space": showLockIcon,
          })}
        />
      );
    }
    return (
      <TplVisibilityToggle
        tpl={item}
        viewCtx={viewCtx}
        visibility={visibility}
        isHidden={isHidden}
        visibilityDataCond={visibilityDataCond}
        canvasEnv={canvasEnv}
        ancestorHidden={props.ancestorHidden}
        takeSpace={showLockIcon}
      />
    );
  };

  const renderLockToggle = () => {
    if (item instanceof SlotSelection) {
      if (props.ancestorLocked) {
        return (
          <Tooltip title={"This prop is currently locked"}>
            <div
              className={cx({
                "tpltree__label__action-icon": true,
                tpltree__label__lock: true,
                "tpltree__label__action-icon--visible": true,
              })}
            >
              <Icon icon={VerticalDashIcon} />
            </div>
          </Tooltip>
        );
      } else {
        // Can only toggle visibility for TplNodes.
        return null;
      }
    }
    return (
      <Tooltip
        title={
          item.locked || props.ancestorLocked
            ? "Unlock to enable editing from canvas"
            : "Lock to disable editing from canvas"
        }
      >
        <div
          className={cx({
            "tpltree__label__action-icon": true,
            tpltree__label__lock: true,
            "tpltree__label__action-icon--visible": showLockIcon,
          })}
          onClick={swallowingClick(() =>
            viewCtx.change(() => {
              if (item.locked === true) {
                item.locked = null;
              } else if (item.locked === false) {
                item.locked = null;
              } else if (props.ancestorLocked) {
                item.locked = false;
              } else {
                item.locked = true;
                // If focused item became locked, clear focus
                const focusedTpl = viewCtx.focusedTpl();
                const ancestors = focusedTpl
                  ? $$$(focusedTpl).ancestors().toArray()
                  : [];
                if (ancestors.includes(item)) {
                  viewCtx.setStudioFocusBySelectable(null);
                }
              }
            })
          )}
        >
          {item.locked === true ? (
            <Icon icon={LockIcon} />
          ) : item.locked === false ? (
            <Icon icon={UnlockIcon} />
          ) : props.ancestorLocked ? (
            <Icon icon={VerticalDashIcon} />
          ) : (
            <Icon icon={UnlockIcon} />
          )}
        </div>
      </Tooltip>
    );
  };

  const summarizeTpl = (node: TplNode) => {
    const label = getNodeSummary(node, effectiveVs.get()?.rsh());
    return outlineCtx.matcher.boldSnippets(label);
  };

  const IconWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <div
        className={cx({
          tpltree__label__icon: true,
          "tpltree__label__icon--tag": Tpls.isTplTag(item),
          "tpltree__label__icon--component": Tpls.isTplComponent(item),
          "tpltree__label__icon--slot": Tpls.isTplSlot(item),
        })}
      >
        {children}
      </div>
    );
  };

  const renderRep = () => {
    if (hasRep) {
      return (
        <IconWrapper>
          <RepIcon />
        </IconWrapper>
      );
    }
    return null;
  };

  const renderInteractive = () => {
    if (hasInteraction) {
      return (
        <IconWrapper>
          <ActionIcon />
        </IconWrapper>
      );
    }
    return null;
  };

  const renderCommentIcon = () => {
    const commentsStats = getCommentsStats();
    if (commentsStats.commentCount > 0) {
      return (
        <IconWrapper>
          <CommentIcon
            commentCount={commentsStats.commentCount}
            replyCount={commentsStats.replyCount}
          />
        </IconWrapper>
      );
    }
    return null;
  };

  const customLabel = computed(
    () => {
      if (Tpls.isTplCodeComponent(item) && canvasEnv) {
        const meta = viewCtx.studioCtx.getCodeComponentMeta(item.component);
        if (meta && (meta as any).treeLabel) {
          const { componentPropValues, ccContextData } =
            viewCtx.getComponentEvalContext(item);
          return (meta as any).treeLabel(componentPropValues, ccContextData);
        }
      }
      return null;
    },
    { name: "customLabel" }
  ).get();

  const renderContent = () => {
    if (item instanceof SlotSelection) {
      return (
        <TplTreeNodeLabel
          summary={outlineCtx.matcher.boldSnippets(
            getSlotSelectionDisplayName(item, viewCtx)
          )}
        />
      );
    } else if (!Tpls.isTplNodeNamable(item)) {
      return <TplTreeNodeLabel summary={summarizeTpl(item)} />;
    } else if (Tpls.isTplNamable(item)) {
      const defaultEditing = computed(
        () => viewCtx.studioCtx.renamingOnPanel() && isFocused,
        { name: "defaultEditing" }
      ).get();
      const itemName = item.name || "";

      return (
        <EditableLabel
          labelFactory={(_props) => (
            <span {..._props} className={"tpltree__nodeLabelContainer"} />
          )}
          value={itemName}
          doubleClickToEdit
          defaultEditing={defaultEditing}
          key={`${defaultEditing}`}
          onAbort={() => viewCtx.studioCtx.endRenamingOnPanel()}
          onEdit={(name) => {
            viewCtx.change(() => {
              viewCtx.getViewOps().renameTpl(name, item);
            });
            viewCtx.studioCtx.endRenamingOnPanel();
          }}
          inputBoxPlaceholder="Element name"
          allowEmptyString
        >
          <TplTreeNodeLabel
            name={outlineCtx.matcher.boldSnippets(itemName)}
            summary={Tpls.isTplTextBlock(item) ? undefined : summarizeTpl(item)}
            content={outlineCtx.matcher.boldSnippets(
              getTextContent(item) || ""
            )}
            customLabel={customLabel}
          />
        </EditableLabel>
      );
    } else {
      assert(isKnownTplSlot(item), "Expected item to be a TplSlot");
      const text =
        isPlainTextTplSlot(item) && !isCodeComponent(component)
          ? outlineCtx.matcher.boldSnippets(
              getTextContent(item.defaultContents[0]) || ""
            )
          : undefined;
      const defaultEditing = computed(
        () => viewCtx.studioCtx.renamingOnPanel() && isFocused,
        { name: "defaultEditing" }
      ).get();
      return (
        <EditableLabel
          labelFactory={(_props) => (
            <span {..._props} className={"tpltree__nodeLabelContainer"} />
          )}
          value={item.param.variable.name}
          doubleClickToEdit={!(codeComponentRoot || codeComponentSlot)}
          defaultEditing={defaultEditing}
          key={`${defaultEditing}`}
          onAbort={() => viewCtx.studioCtx.endRenamingOnPanel()}
          onEdit={(name) => {
            viewCtx.change(() => {
              viewCtx.getViewOps().tryRenameParam(name, item.param);
            });
            viewCtx.studioCtx.endRenamingOnPanel();
          }}
          inputBoxPlaceholder="Slot name"
        >
          <TplTreeNodeLabel name={summarizeTpl(item)} content={text} />
        </EditableLabel>
      );
    }
  };

  const plumeDef = isKnownTplSlot(item)
    ? getPlumeSlotDef(component, item.param)
    : isKnownTplNode(item)
    ? getPlumeElementDef(component, item)
    : undefined;

  const icon = computed(
    () => {
      const node = createNodeIcon(item, effectiveVs.get());
      if (plumeDef) {
        return <PlumyIcon def={plumeDef}>{node}</PlumyIcon>;
      } else {
        return node;
      }
    },
    { name: "icon" }
  ).get();

  const codeComponentRoot = isKnownTplNode(item) && isCodeComponentRoot(item);
  const codeComponentSlot = isKnownTplSlot(item) && isCodeComponentSlot(item);

  const showLockIcon =
    props.ancestorLocked || (isKnownTplNode(item) && !L.isNil(item.locked));

  const visibleChangeCallback = React.useCallback(
    (visible: boolean) => {
      if (visible) {
        viewCtx.tryBlurEditingText();
      }
    },
    [viewCtx]
  );

  return (
    <div
      key={id}
      className={cx({
        tpltree__label: true,
        "tpltree__label--focused": isFocused,
        "tpltree__label--out-of-context": isOutOfContext,
        "tpltree__label--hidden": isHidden || props.ancestorHidden,
        "tpltree__label--drilled": isDrilled,
        "tpltree__label--drilled-descendant": isDrilledDescendant,
        "tpltree__label--focused-descendant": isStrictDescendantOfFocus,
        "tpltree__label--hovered": isHovered && !isDropParent,
      })}
      data-test-id={`tpltree-${id}`}
      data-test-parent-id={`tpltree-${parentId}`}
      style={{
        paddingLeft: indentPadding(indent),
      }}
      onClick={async (e) => {
        e.stopPropagation();
        const freestyleState = viewCtx.studioCtx.freestyleState();
        const dragInsertState = viewCtx.studioCtx.dragInsertState();
        if (freestyleState || dragInsertState) {
          const loc = L.head(getPreferredInsertLocs(viewCtx, item));
          const state = freestyleState ?? (dragInsertState as DragInsertState);
          const extraInfo = state.spec.asyncExtraInfo
            ? await state.spec.asyncExtraInfo(viewCtx.studioCtx)
            : undefined;
          if (extraInfo === false) {
            return;
          }
          await viewCtx.studioCtx.changeUnsafe(() => {
            if (loc) {
              viewCtx
                .getViewOps()
                .tryInsertInsertableSpec(state.spec, loc, extraInfo, item);
            }
            viewCtx.studioCtx.setFreestyleState(undefined);
            viewCtx.studioCtx.setDragInsertState(undefined);
          });
          return;
        }
        viewCtx.change(() => {
          if (item instanceof SlotSelection) {
            const tplComponent = ensure(
              item.toTplSlotSelection().tpl,
              "SlotSelection in tpl-tree is expected to have a tpl"
            );
            const val = tryGetValForTpl(
              viewCtx,
              tplComponent,
              componentFrameNum
            );
            const valSlotPlaceholder = new SlotSelection({
              val: val ? (val as ValComponent) : undefined,
              tpl: !val ? tplComponent : undefined,
              slotParam: item.slotParam,
            });
            if (val) {
              viewCtx.getViewOps().tryFocusObj(valSlotPlaceholder, {
                allowLocked: true,
                exact: true,
              });
            } else {
              viewCtx.setStudioFocusBySelectable(valSlotPlaceholder);
            }
          } else {
            // Each tpl can map to multiple vals.  We try to see the "best"
            // corresponding val we can use; see tryGetValForTpl() for what
            // "best" means.
            const val = tryGetValForTpl(viewCtx, item, componentFrameNum);
            if (val) {
              viewCtx.getViewOps().tryFocusObj(val, {
                allowLocked: true,
                appendToMultiSelection: e.shiftKey,
                exact: true,
              });
            } else {
              viewCtx.setStudioFocusByTpl(item, undefined, {
                appendToMultiSelection: e.shiftKey,
              });
            }
          }
        });
        viewCtx.studioCtx.tourActionEvents.dispatch({
          type: TutorialEventsType.ElementFocused,
        });
      }}
      onContextMenu={(e) => {
        if (!isOutOfContext) {
          viewCtx.tryBlurEditingText();
          maybeShowContextMenu(e.nativeEvent, makeTreeNodeMenu(viewCtx, item));
        }
      }}
      onMouseEnter={() => {
        let val: Selectable | undefined;
        if (viewCtx.focusedSelectable()) {
          val = tryGetValForTpl(viewCtx, item, componentFrameNum);
        } else if (isKnownTplNode(item)) {
          // tryGetValForTpl requires a current selection to work.  If there is none,
          // then we fall back to just taking any val that maps to this tpl, as long as
          // it is within the current context
          const vals = viewCtx.maybeTpl2ValsInContext(item);
          if (vals.length > 0) {
            val = vals[0];
          }
        }
        if (val) {
          const obj = val;
          viewCtx.change(() =>
            viewCtx
              .getViewOps()
              .tryHoverObj(obj, { allowLocked: true, exact: true })
          );
        }
      }}
      onMouseLeave={() => {
        viewCtx.change(() =>
          viewCtx.getViewOps().tryHoverObj(undefined, { exact: true })
        );
      }}
    >
      {renderExpander()}
      <div className="tpltree__label__content">
        <div
          className={cx({
            tpltree__label__icon: true,
            "tpltree__label__icon--focused": isFocused,
            "tpltree__label__icon--component": Tpls.isTplComponent(item),
            "tpltree__label__icon--tag": Tpls.isTplTag(item),
            "tpltree__label__icon--slot": Tpls.isTplSlot(item),
            "tpltree__label__icon--prop": item instanceof SlotSelection,
          })}
        >
          {icon}
        </div>
        {renderCommentIcon()}
        {!codeComponentRoot && !codeComponentSlot && (
          <>
            {renderRep()}
            {renderInteractive()}
          </>
        )}
        {renderContent()}
      </div>
      {!codeComponentRoot && renderLockToggle()}
      {!codeComponentRoot && !codeComponentSlot && renderVisibilityToggle()}
      {!codeComponentRoot && !codeComponentSlot && (
        <MenuButton
          className={"tpltree__label__menu"}
          menu={
            isOutOfContext ? undefined : () => makeTreeNodeMenu(viewCtx, item)
          }
          onVisibleChange={visibleChangeCallback}
        />
      )}
      {
        <div
          className={"tpltree__label__indicator"}
          data-test-class="left-panel-indicator"
        >
          {indicatedVs && (
            <Indicator
              color={`var(${selectionControlsColor})`}
              popover={() => (
                <VariantSettingPopoverContent
                  site={viewCtx.site}
                  tpl={item as TplNode}
                  vs={indicatedVs}
                  viewCtx={viewCtx}
                />
              )}
              popoverTitle={() => (
                <VariantSettingPopoverTitle vs={indicatedVs} viewCtx={viewCtx}>
                  Settings for{" "}
                  {pluralize("variant", indicatedVs.variants.length)} "
                  {variantComboName(indicatedVs.variants)}"
                </VariantSettingPopoverTitle>
              )}
              placement="right"
            />
          )}
        </div>
      }
    </div>
  );
});

const DraggableTreeNode = observer(function DraggableTreeNode(props: {
  id: OutlineNodeKey;
  item: TplNode | SlotSelection;
  dndManager: TreeDndManager;
  viewCtx: ViewCtx;
  isOpen: boolean;
  isLeaf?: boolean;
  children?: React.ReactNode;
  indent: number;
  setOpen: (open: boolean) => void;
  style?: React.CSSProperties;
}) {
  const {
    id,
    item,
    dndManager,
    viewCtx,
    children,
    isOpen,
    isLeaf,
    setOpen,
    indent,
    style,
  } = props;

  const insertionMarker = dndManager.getInsertionMarker(item);
  const insertion = maybe(insertionMarker, (x) => x.insertion);
  const insertionRef = React.useRef<DragInsertion | undefined>(insertion);
  const isOpenRef = React.useRef<boolean>(isOpen);
  const isDropParent = dndManager.isDropParent(item);
  const [labelTarget, setLabelTarget] = React.useState<HTMLElement>();

  React.useEffect(() => {
    insertionRef.current = insertion;
    isOpenRef.current = isOpen;
    // If we can expand, then expand after hovering for 500ms
    if (insertion === "insert-as-child" && !isOpen && !isLeaf) {
      const timerId = setTimeout(() => {
        if (insertion === insertionRef.current && !isOpenRef.current) {
          setOpen(true);
        }
      }, 500);
      return () => clearTimeout(timerId);
    }
    return undefined;
  }, [insertion, isOpen, isLeaf, setOpen]);

  return (
    <DragItem
      onDragStart={(e) => {
        if (item instanceof SlotSelection) {
          e.mouseEvent.stopPropagation();
          e.mouseEvent.preventDefault();
          return false;
        }
        setLabelTarget(
          $(e.mouseEvent.target)
            .parents(".tpltree__draggable")
            .get(0) as HTMLElement
        );

        const dragTpls = viewCtx.focusedTpls().some((tpl) => tpl === item)
          ? Tpls.prepareFocusedTpls(viewCtx.focusedTpls())
          : [item];
        const dragClips = dragTpls.map((tpl) =>
          viewCtx.getViewOps().createTplClip(tpl, $$$(tpl).owningComponent())
        );

        return dndManager.onDragStart(e.mouseEvent, dragClips);
      }}
      onDragEnd={(e) => {
        if (!e.data.aborted) {
          dndManager.onDrop(e.mouseEvent);
        }
        dndManager.onDragEnd();
        setLabelTarget(undefined);
      }}
      dragHandle={() => <DraggedHandle key={id} labelTarget={labelTarget} />}
    >
      <div
        className="tpltree__draggable"
        style={style}
        onMouseEnter={(e) => {
          dndManager.onDragEnter(e);
        }}
        onMouseLeave={(e) => {
          if (dndManager.draggedItems.length) {
            dndManager.onDragLeave(e);
          }
        }}
        onMouseOver={(e) => {
          if (dndManager.draggedItems.length) {
            dndManager.onDragOver(e, item, viewCtx, isOpen && !isLeaf, indent);
          }
        }}
        data-test-id={`tpltree-draggable-${id}`}
      >
        {children}
        {isDropParent && (
          <div className="tpltree__drop-container">
            <div className="tpltree__drop tpltree__drop--dnd-parent" />
          </div>
        )}
        {insertion && (
          <div
            className="tpltree__drop-container"
            style={{
              paddingLeft: indentPadding(
                ensure(
                  insertionMarker,
                  "Expected insertionMarker to be not null"
                ).indent + 1
              ),
            }}
          >
            <div
              className={cx({
                tpltree__drop: true,
                "tpltree__drop--dnd-above": insertion === "insert-above",
                "tpltree__drop--dnd-below": insertion === "insert-below",
                "tpltree__drop--dnd-parent--error":
                  isCantDragInsertion(insertion) &&
                  insertion.type === "cant-insert-child",
                "tpltree__drop--dnd-above--error":
                  isCantDragInsertion(insertion) &&
                  insertion.type === "cant-insert-above",
                "tpltree__drop--dnd-below--error":
                  isCantDragInsertion(insertion) &&
                  insertion.type === "cant-insert-below",
              })}
            >
              {isCantDragInsertion(insertion) && (
                <div className="tpltree__drop__error">
                  {insertion.msg === false
                    ? ""
                    : renderCantAddMsg(insertion.msg)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DragItem>
  );
});

interface DraggedHandleProps {
  labelTarget?: HTMLElement;
}

function DraggedHandle({ labelTarget }: DraggedHandleProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (labelTarget && ref.current) {
      const label = $(".tpltree__label__content", labelTarget)[0].cloneNode(
        true
      ) as HTMLDivElement;
      label.classList.add("tpltree__dragged__label");
      ref.current.appendChild(label);
    }
    return () => {
      $(".tpltree__dragged__label").remove();
    };
  }, [labelTarget, ref]);
  return <div className="tpltree__dragged" ref={ref} />;
}

function TplTreeNodeLabel(props: {
  name?: React.ReactNode;
  customLabel?: React.ReactNode;
  summary?: React.ReactNode;
  content?: React.ReactNode;
}) {
  const { name, summary, content, customLabel } = props;
  return (
    <div
      className={cx({
        tpltree__nodeLabel: true,
        "tpltree__nodeLabel--hasName": !!name,
      })}
    >
      {name && <span className="tpltree__nodeLabel__name">{name}</span>}
      {name && customLabel && (
        <span className="tpltree__nodeLabel__customLabel">({customLabel})</span>
      )}
      {summary && (
        <span className="tpltree__nodeLabel__summary">{summary}</span>
      )}
      {!name && customLabel && (
        <span className="tpltree__nodeLabel__customLabel">({customLabel})</span>
      )}
      {content && (
        <span className="tpltree__nodeLabel__content">{content}</span>
      )}
    </div>
  );
}

export function createNodeIcon(
  node: TplNode | SlotSelection,
  vs?: EffectiveVariantSetting
) {
  if (node instanceof SlotSelection || Tpls.isTplSlot(node)) {
    return SLOT_ICON;
  } else if (Tpls.isTplComponent(node)) {
    return COMPONENT_ICON;
  } else if (Tpls.isTplImage(node)) {
    return IMAGE_ICON;
  } else if (Tpls.isTplTag(node)) {
    if (node.tag === "img") {
      return IMAGE_ICON;
    } else if (node.tag === "a") {
      return LINK_ICON;
    } else if (node.tag === "input") {
      if (vs && vs.attrs.type) {
        const type = tryExtractLit(vs.attrs.type);
        if (type === "password") {
          return PASSWORD_INPUT_ICON;
        }
      }
      return INPUT_ICON;
    } else if (node.tag === "button") {
      return BUTTON_ICON;
    } else if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tag)) {
      return HEADING_ICON;
    } else if (Tpls.isTplTextBlock(node)) {
      return TEXT_ICON;
    } else if (node.tag === "textarea") {
      return TEXTAREA_ICON;
    } else if (vs) {
      const exp = vs.rshWithTheme();
      const containerType = getRshContainerType(exp);
      if (containerType === ContainerLayoutType.free) {
        return FREE_CONTAINER_ICON;
      } else if (containerType === ContainerLayoutType.flexColumn) {
        return VERT_STACK_ICON;
      } else if (containerType === ContainerLayoutType.flexRow) {
        return HORIZ_STACK_ICON;
      } else if (containerType === ContainerLayoutType.grid) {
        return GRID_CONTAINER_ICON;
      } else if (containerType === ContainerLayoutType.contentLayout) {
        return CONTENT_LAYOUT_ICON;
      }
    }
  }
  return FREE_CONTAINER_ICON;
}

function tryGetValForTpl(
  viewCtx: ViewCtx,
  tplToSelect: TplNode | SlotSelection,
  frameNum: number
) {
  // A Tpl can map to multiple Vals (or none).  Normally we try to
  // just select the first Val.  But we can be smarter in some
  // situations.  If we already have selected a Val, and we select a
  // Tpl higher up above it (an ancestor), we can make sure to
  // select the corresponding Val on that Val ancestor path.
  //
  // TODO We also want to do the same in the opposite (downward)
  // direction---if you select a descendant, scope to the subtree of
  // the currently selected Val.
  //
  // TODO Most generally---even if we choose a Tpl that is neither
  // an ancestor nor descendant, we can still scope to the smallest
  // Val neighborhood.  E.g., with this Tpl tree:
  //
  // TODO extract this out into shared code so that this selection
  // refinement can appear wherever we are selecting by tpl
  //
  // - A
  //     - B (repeated)
  //         - C <-- currently selected
  //         - D <-- new selection
  //
  // with this Val tree:
  //
  // - A0 (tpl: A)
  //     - B0 (tpl: B)
  //         - C0 (tpl: C)
  //         - D0 (tpl: D)
  //     - B1 (tpl: B)
  //         - C0 (tpl: C) <-- currently selected
  //         - D0 (tpl: D) <-- new selection
  //
  // we want to select the second D, not the first D!
  const initialSel = viewCtx.focusedSelectable();
  if (!initialSel) {
    return undefined;
  }
  if (initialSel instanceof SlotSelection && !initialSel.val) {
    // This is a SlotSelection of a hidden TplComponent.
    return undefined;
  }
  return bestValForTpl(
    tplToSelect,
    frameNum,
    viewCtx.valState(),
    initialSel,
    viewCtx.tplUserRoot()
  );
}

type CantAddTreeSiblingMsg = CantAddSiblingMsg | false;
type CantAddTreeChildMsg = CantAddChildMsg | false;
type DragInsertion =
  | "insert-above"
  | "insert-below"
  | "insert-as-child"
  | { type: "cant-insert-above"; msg: CantAddTreeSiblingMsg }
  | { type: "cant-insert-below"; msg: CantAddTreeSiblingMsg }
  | { type: "cant-insert-child"; msg: CantAddTreeChildMsg };

function isCantDragInsertion(
  ins: DragInsertion
): ins is Exclude<
  DragInsertion,
  "insert-above" | "insert-below" | "insert-as-child"
> {
  return !L.isString(ins);
}

function getTargetSlivers(
  e: React.DragEvent | React.MouseEvent,
  acceptsChildren?: boolean
) {
  const targetRect = e.currentTarget.getBoundingClientRect();

  const sliver = targetRect.height / (acceptsChildren === true ? 4 : 2);

  const isTopSliver = () => {
    return e.clientY <= targetRect.top + sliver;
  };

  const isBottomSliver = () => {
    const bottom = targetRect.top + targetRect.height;
    return e.clientY >= bottom - sliver;
  };

  return {
    topSliver: isTopSliver(),
    bottomSliver: isBottomSliver(),
  };
}

type InsertionOutcome = {
  insertion: DragInsertion;
  item: TplNode | SlotSelection;
  marker: {
    item: TplNode | SlotSelection;
    indent: number;
    insertion: DragInsertion;
  };
};

/**
 * Helper class for managing state when drag-and-drop tpl-tree nodes
 */
export class TreeDndManager {
  private initialPos: { clientX: number; clientY: number } | undefined;
  draggedItems: TplClip[] = [];
  target:
    | {
        viewCtx: ViewCtx;
        outcome: InsertionOutcome;
      }
    | undefined = undefined;
  constructor(private studioCtx: StudioCtx) {
    mobx.makeObservable(this, {
      draggedItems: mobx.observable,
      target: mobx.observable,
      onDragStart: mobx.action,
      onDragEnd: mobx.action,
      onDragEnter: mobx.action,
      onDragLeave: mobx.action,
      onDragOver: mobx.action,
      onDrop: mobx.action,
    });
  }

  isDraggedNode = computedFn((item: TplNode | SlotSelection) => {
    if (item instanceof SlotSelection) {
      return false;
    }
    return this.draggedItems.find((draggedItem) => draggedItem.node === item);
  });

  isDropTarget = computedFn((item: TplNode | SlotSelection) => {
    if (!this.target) {
      return false;
    }
    return this.target.outcome.item === item;
  });

  getInsertionMarker = computedFn((item: TplNode | SlotSelection) => {
    if (!this.target) {
      return undefined;
    }

    return this.target.outcome.marker.item === item
      ? this.target.outcome.marker
      : undefined;
  });

  isDropParent = computedFn((item: TplNode | SlotSelection) => {
    if (!this.target) {
      return false;
    }
    if (isCantDragInsertion(this.target.outcome.insertion)) {
      return false;
    }
    const ins = this.target.outcome.insertion;
    if (ins === "insert-as-child") {
      return this.target.outcome.item === item;
    } else {
      // inserting as sibling, so check if `item` is a parent of `target.item`
      if (isKnownTplNode(this.target.outcome.item)) {
        const parent = this.target.outcome.item.parent;
        if (Tpls.isTplComponent(parent)) {
          const sel = ensure(
            getSlotSelectionContainingTpl(this.target.outcome.item),
            "Child of tplComponent is expected to have a slot selection"
          );
          return (
            item instanceof SlotSelection &&
            item.slotParam === sel.slotParam &&
            item.getTpl() === sel.getTpl()
          );
        } else if (parent) {
          if (parent === item) {
            return true;
          }
        }
      }
      return false;
    }
  });

  onDragStart(e: React.DragEvent | React.MouseEvent, items: TplClip[]) {
    if (
      items.some(
        (item) =>
          !(isTplTagOrComponent(item.node) || Tpls.isTplSlot(item.node)) ||
          Tpls.isTplTextBlock(item.node.parent)
      )
    ) {
      e.preventDefault();
      return false;
    }

    this.draggedItems = items;
    this.initialPos = {
      clientX: e.clientX,
      clientY: e.clientY,
    };
    return true;
  }

  /**
   * Called when dragging over a tree node.  cleanup() will be called when this
   * tree node is no longer being targeted.  Returns undefined if no
   * appropriate
   * insertion for `item`, or both proposed insertion as well as the timestamp
   * from when the insertion was first proposed.  Using the timestamp allows
   * you to check if the user has been hovering over the same item for some
   * time.
   */
  onDragOver(
    e: React.MouseEvent,
    item: TplNode | SlotSelection,
    viewCtx: ViewCtx,
    childrenShowing: boolean,
    indent: number
  ) {
    e.preventDefault();
    const insertion = this.getInsertion(e, item, childrenShowing, indent);
    if (insertion) {
      // Save the new target.  This is so that in onDragEnd(), we can do the
      // actual drop.
      this.target = {
        viewCtx,
        outcome: insertion,
      };
    }
  }

  onDragEnter(e: React.DragEvent | React.MouseEvent) {
    e.preventDefault();
  }

  onDragLeave(e: React.DragEvent | React.MouseEvent) {
    e.preventDefault();
  }

  onDrop(e: React.DragEvent | React.MouseEvent) {
    // We rely on onDrop, because if the user cancels the drag (by hitting ESC),
    // then onDrop is not called, though onDragEnd is.
    e.preventDefault();
    // Stop propagation, so the outline panel doesn't also handle the drop
    e.stopPropagation();

    const target = this.target;
    if (!target) {
      return;
    }
    // If there's a tentative insertion, then perform this now.
    const insertion = target.outcome.insertion;
    if (isCantDragInsertion(insertion)) {
      return;
    }

    if (this.draggedItems.length === 0) {
      return;
    }

    const targetItem = target.outcome.item;
    if (this.draggedItems.some((item) => targetItem === item.node)) {
      return;
    }

    if (this.draggedItems.some((item) => item.node.parent == null)) {
      notification.warn({ message: "The root node is not movable" });
      return;
    }

    const sameTree =
      this.draggedItems[0].component ===
      getTplOwnerComponent(asTpl(targetItem));
    const relLoc =
      insertion === "insert-above"
        ? InsertRelLoc.before
        : insertion === "insert-below"
        ? InsertRelLoc.after
        : insertion === "insert-as-child"
        ? InsertRelLoc.append
        : unexpected();
    if (relLoc === InsertRelLoc.after) {
      // Reverse items in-place to insert in the expected order.
      this.draggedItems.reverse();
    }

    target.viewCtx.change(() => {
      const insertedNodes: TplNode[] = [];
      for (const tplClip of this.draggedItems) {
        if (sameTree) {
          const hasInserted = target.viewCtx
            .getViewOps()
            .tryInsertAt(tplClip.node, undefined, relLoc, targetItem);
          if (hasInserted) {
            insertedNodes.push(tplClip.node);
          }
        } else {
          const pastedNode = target.viewCtx.getViewOps().pasteTplClip({
            clip: {
              ...tplClip,
              node:
                // Only need to clone if moving across components.  Minimize
                // changes by keeping same-component re-parenting a lightweight
                // operation.
                sameTree ? tplClip.node : clone(tplClip.node),
            },
            target: targetItem,
            loc: relLoc,
          });
          if (pastedNode) {
            if (isArray(pastedNode)) {
              insertedNodes.push(...pastedNode);
            } else {
              insertedNodes.push(pastedNode);
            }
          }
          $$$(tplClip.node).remove({ deep: true });
        }
      }
      this.studioCtx.setStudioFocusOnViewCtxContent(target.viewCtx);
      target.viewCtx.selectNewTpls(insertedNodes);

      // Call onDragEnd explicitly to clean up, since performing onDrop may
      // mean removing the element that has the onDragEnd handler attached,
      // and we may never get a chance to clean up otherwise.
      this.onDragEnd();
    });
  }

  onDragEnd() {
    this.target = undefined;
    this.draggedItems = [];
    this.initialPos = undefined;
  }

  private getDedentedInsertion(
    e: React.DragEvent | React.MouseEvent,
    item: TplNode | SlotSelection,
    indent: number
  ): InsertionOutcome | undefined {
    const THRESHOLD = 20;
    if (item instanceof SlotSelection) {
      return undefined;
    }
    if (!this.draggedItems.length) {
      return undefined;
    }
    const draggedNodes = this.draggedItems.map((dragged) => dragged.node);
    let xDelta =
      e.clientX -
      ensure(this.initialPos, "Expected initialPos to be not nullish").clientX;
    if (
      xDelta < -THRESHOLD &&
      (draggedNodes.includes(item) || getTargetSlivers(e, false).bottomSliver)
    ) {
      // The user has moved leftward, so we should try to do a "dedented" insert if possible
      const canInsertAsTargetParentSibling = (target: TplNode) => {
        const parent = target.parent;
        if (!parent) {
          return false;
        }
        if (Tpls.isTplTag(parent)) {
          return (
            L.last(parent.children) === target &&
            draggedNodes.every((dragged) =>
              canAddSiblingsAndWhy(parent, dragged)
            )
          );
        } else if (Tpls.isTplSlot(parent)) {
          return (
            L.last(parent.defaultContents) === target &&
            draggedNodes.every((dragged) =>
              canAddSiblingsAndWhy(parent, dragged)
            )
          );
        } else {
          return false;
        }
      };
      let newTarget = item;
      while (xDelta < -THRESHOLD && canInsertAsTargetParentSibling(newTarget)) {
        newTarget = ensure(
          newTarget.parent,
          "Expected newTarget to have a parent"
        );
        indent -= 1;
        xDelta += THRESHOLD;
      }
      if (newTarget === item) {
        return undefined;
      }
      return {
        item: newTarget,
        insertion: "insert-below",
        marker: {
          item,
          insertion: "insert-below",
          indent,
        },
      };
    }
    return undefined;
  }

  /**
   * Compute DragInsertion against target `item`
   */
  private getInsertion(
    e: React.DragEvent | React.MouseEvent,
    item: TplNode | SlotSelection,
    childrenShowing: boolean,
    indent: number
  ): InsertionOutcome | undefined {
    if (!this.draggedItems.length) {
      return undefined;
    }

    const dedented = this.getDedentedInsertion(e, item, indent);
    if (dedented) {
      return dedented;
    }

    const draggedNodes = this.draggedItems.map((dragged) => dragged.node);
    const { acceptsChildren, acceptsSibling } = this.getAcceptance(
      draggedNodes,
      item
    );

    const targetSlivers = getTargetSlivers(e, acceptsChildren === true);

    const isAbove = targetSlivers.topSliver;
    const isBelow = !childrenShowing && targetSlivers.bottomSliver;

    let insertion: DragInsertion | undefined;
    if (acceptsSibling === true && isAbove) {
      insertion = "insert-above";
    } else if (acceptsSibling === true && isBelow) {
      // We allow inserting below if no children are being rendered.  Otherwise,
      // if children are rendered, then the bottom sliver of this node is not
      // really the "bottom", as children will come below this.
      insertion = "insert-below";
    } else if (acceptsChildren === true) {
      insertion = "insert-as-child";
    } else if (
      !(item instanceof SlotSelection) &&
      acceptsSibling !== true &&
      (isAbove || isBelow)
    ) {
      insertion = {
        type: isAbove ? "cant-insert-above" : "cant-insert-below",
        msg: acceptsSibling,
      };
    } else if (!childrenShowing) {
      insertion = {
        type: "cant-insert-child",
        msg: acceptsChildren,
      };
    }

    if (insertion) {
      return {
        item,
        insertion,
        marker: {
          item,
          insertion,
          indent,
        },
      };
    } else {
      return undefined;
    }
  }

  private getAcceptance(
    draggedNodes: TplNode[],
    target: TplNode | SlotSelection
  ) {
    return {
      acceptsChildren:
        draggedNodes
          .map((dragged) => canAddChildrenAndWhy(target, dragged))
          .find((why) => why !== true) ?? true,
      acceptsSibling:
        draggedNodes
          .map((dragged) => canAddSiblingsAndWhy(target, dragged))
          .find((why) => why !== true) ?? true,
    };
  }
}

function indentPadding(indent: number) {
  return indent * 12;
}

interface TreeRowItemData {
  nodes: OutlineNodeData[];
  outlineCtx: OutlineCtx;
  dndManager: TreeDndManager;
}

const ArenaTreeNode = observer(function ArenaTreeNode(props: {
  index: number;
  data: TreeRowItemData;
  style?: React.CSSProperties;
}) {
  const { index, data, style } = props;
  const { nodes, outlineCtx, dndManager } = data;
  const node = nodes[index];
  const viewCtx = ensure(outlineCtx.viewCtx(), "ViewCtx missing");
  const isOpen = outlineCtx.isExpanded(node.key);
  const setOpen = React.useCallback(
    (open: boolean) => outlineCtx.setExpanded(node.key, open),
    [outlineCtx, node.key]
  );
  const isDropParent = dndManager.isDropParent(node.item);
  return (
    <DraggableTreeNode
      id={node.key}
      item={node.item}
      dndManager={dndManager}
      viewCtx={viewCtx}
      isOpen={isOpen}
      isLeaf={node.isLeaf}
      indent={node.indent}
      setOpen={setOpen}
      style={style}
    >
      <TplTreeNode
        id={node.key}
        viewCtx={viewCtx}
        outlineCtx={outlineCtx}
        isOpen={isOpen}
        visibility={node.visibility}
        isHidden={node.isHidden}
        setOpen={setOpen}
        item={node.item}
        indent={node.indent}
        ancestorHidden={node.ancestorHidden}
        componentFrameNum={node.componentFrameNum}
        isLeaf={node.isLeaf}
        ancestorLocked={node.ancestorLocked}
        parentId={node.parentKey}
        isDropParent={isDropParent}
      />
    </DraggableTreeNode>
  );
});

export type ArenaTreeRef = FixedSizeList;

export const ArenaTree = observer(
  React.forwardRef(function ArenaTree(
    props: {
      studioCtx: StudioCtx;
      arena: AnyArena | null;
      outlineCtx: OutlineCtx;
      dndManager: TreeDndManager;
    },
    outerRef: React.Ref<ArenaTreeRef>
  ) {
    const { studioCtx, arena, outlineCtx, dndManager } = props;
    const viewCtx = outlineCtx.viewCtx();

    const { ref: listRef, onRef } = useForwardedRef(outerRef);

    const { visibleNodes, getKeyIndex } = useTreeData(
      studioCtx,
      arena,
      outlineCtx,
      dndManager
    );

    const focusedKey = outlineCtx.focusedNodeKeyPath()[0];
    useRevealOnFocus({
      listRef,
      getKeyIndex,
      focusedKey,
    });

    const itemData: TreeRowItemData = React.useMemo(
      () => ({
        viewCtx,
        outlineCtx,
        dndManager,
        nodes: visibleNodes,
      }),
      [viewCtx, outlineCtx, dndManager, visibleNodes]
    );

    const itemKey = React.useCallback(
      (index: number, data: TreeRowItemData) => data.nodes[index].key,
      []
    );

    return (
      // For now, we don't know how much space to request, so we just request 5000.
      // Ideally, we'd want to know exactly how many tree nodes are shown so we can
      // just request the space we need.  Unfortunately, the way FixedSizeTree works
      // right now, there's no way to get that information cheaply without walking
      // through the tree again ourselves.  We should consider skipping FixedSizeTree
      // and just going straight to FixedSizeList instead.
      <ListSpace space={5000}>
        {({ height }) =>
          // When the outline is closed, ListSpace sets the height as 0.
          // If an element is focused while the height is 0, useRevealOnFocus
          // will scroll the FixedSizeList. When the outline is opened,
          // the scroll persists, causing FixedSizeList to only render elements
          // after the scroll offset.
          //
          // This may be a bug on FixedSizeList not adjusting scroll offset
          // automatically when the height changes.
          //
          // To prevent this, don't render the FixedSizeList if height is 0.
          height > 0 && (
            <FixedSizeList
              className="tpltree-scroller"
              width={"100%"}
              height={height}
              itemCount={visibleNodes.length}
              itemSize={32}
              overscanCount={2}
              itemData={itemData}
              ref={onRef}
              itemKey={itemKey}
            >
              {ArenaTreeNode}
            </FixedSizeList>
          )
        }
      </ListSpace>
    );
  })
);

function useTreeData(
  studioCtx: StudioCtx,
  arena: AnyArena | null,
  outlineCtx: OutlineCtx,
  dndManager: TreeDndManager
) {
  const buildVisibleNodes = React.useMemo(
    () =>
      computedFn(function _buildVisibleNodes() {
        const visibleNodes: OutlineNodeData[] = [];
        const keyToIndex: Record<OutlineNodeKey, number> = {};

        const pushVisibleNodes = (node: OutlineNode) => {
          if (!outlineCtx.isVisible(node.self.key)) {
            return;
          }
          keyToIndex[node.self.key] = visibleNodes.length;
          visibleNodes.push(node.self);

          if (outlineCtx.isExpanded(node.self.key)) {
            node.children.forEach(pushVisibleNodes);
          }
        };

        const rootNode = outlineCtx.rootTreeNode();
        if (rootNode) {
          pushVisibleNodes(rootNode);
        }
        return { visibleNodes, keyToIndex };
      }),
    [studioCtx, arena, outlineCtx, dndManager]
  );

  const { visibleNodes, keyToIndex } = buildVisibleNodes();

  const getKeyIndex = React.useCallback(
    (key: OutlineNodeKey) => {
      return keyToIndex[key];
    },
    [keyToIndex]
  );

  return {
    visibleNodes,
    getKeyIndex,
  };
}

/**
 * When a new object is focused, "reveals" it by scrolling to it
 */
function useRevealOnFocus(opts: {
  listRef: React.MutableRefObject<FixedSizeList | null>;
  focusedKey: OutlineNodeKey | undefined;
  getKeyIndex: (key: OutlineNodeKey) => number;
}) {
  const { listRef, getKeyIndex, focusedKey } = opts;

  const scrollToKey = React.useCallback(
    (key: OutlineNodeKey | undefined) => {
      if (!key) {
        return;
      }
      if (listRef.current) {
        const index = getKeyIndex(key);
        if (index >= 0) {
          // Ideally we would scroll to "center", but "center" is buggy :-/
          listRef.current.scrollToItem(index, "smart");
        }
      }
    },
    [listRef, getKeyIndex]
  );

  useChanged(focusedKey, scrollToKey);
}

const TplVisibilityToggle = observer(function TplVisibilityToggle(props: {
  tpl: TplNode;
  viewCtx: ViewCtx;
  visibility: TplVisibility;
  isHidden: boolean;
  visibilityDataCond: Expr | null | undefined;
  ancestorHidden: boolean;
  takeSpace: boolean;
  canvasEnv?: CanvasEnv;
}) {
  const {
    tpl,
    viewCtx,
    visibility,
    isHidden,
    ancestorHidden,
    takeSpace,
    visibilityDataCond,
    canvasEnv,
  } = props;
  const [menuShown, setMenuShown] = React.useState(false);
  const elt = (
    <Tooltip title={isHidden ? "Unhide" : "Hide"}>
      <div
        className={cx({
          "tpltree__label__action-icon": true,
          tpltree__label__visibility: true,
          "tpltree__label__action-icon--visible":
            isHidden || ancestorHidden || menuShown,
          "tpltree__label__action-icon--take-space": takeSpace,
        })}
        onClick={() => {
          viewCtx.change(() => {
            const newVisibility = !isHidden
              ? canSetDisplayNone(viewCtx, tpl)
                ? TplVisibility.DisplayNone
                : TplVisibility.NotRendered
              : TplVisibility.Visible;
            viewCtx.getViewOps().setTplVisibility(tpl, newVisibility);
            setMenuShown(false);
          });
        }}
      >
        {getVisibilityIcon(visibility)}
      </div>
    </Tooltip>
  );
  return elt;
});
