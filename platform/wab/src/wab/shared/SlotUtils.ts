import {
  Arg,
  Component,
  isKnownRenderExpr,
  isKnownTplComponent,
  isKnownTplSlot,
  isKnownVirtualRenderExpr,
  Param,
  RenderExpr,
  SlotParam,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
  Var,
  Variant,
  VirtualRenderExpr,
} from "@/wab/classes";
import { assert, ensureArray, maybe } from "@/wab/common";
import { allSuccess } from "@/wab/commons/failable-utils";
import { DeepReadonly } from "@/wab/commons/types";
import {
  getComponentDisplayName,
  isCodeComponent,
  isCodeComponentTpl,
  isPlasmicComponent,
} from "@/wab/components";
import { flattenComponent } from "@/wab/shared/cached-selectors";
import { elementSchemaToTpl } from "@/wab/shared/code-components/code-components";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  isRenderableType,
  isRenderFuncType,
} from "@/wab/shared/core/model-util";
import { typographyCssProps } from "@/wab/shared/core/style-props";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import { TplMgr } from "@/wab/shared/TplMgr";
import { $$$ } from "@/wab/shared/TplQuery";
import { tryGetBaseVariantSetting, VariantCombo } from "@/wab/shared/Variants";
import { SlotSelection } from "@/wab/slots";
import { createExpandedRuleSetMerger, THEMABLE_TAGS } from "@/wab/styles";
import {
  ancestorsUpWithSlotSelections,
  flattenTpls,
  getTplOwnerComponent,
  hasNoEventHandlers,
  hasNoExistingStyles,
  hasNoRichTextStyles,
  isCodeComponentRoot,
  isTplComponent,
  isTplIcon,
  isTplInput,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
  isTplVariantable,
  TplCodeComponent,
  TplTagCodeGenType,
  TplTextTag,
  tryGetOwnerSite,
} from "@/wab/tpls";
import L from "lodash";

export function getSlotParams(component: Component) {
  return component.params.filter((p): p is SlotParam => isSlot(p));
}

export function isSlot(param: DeepReadonly<Param>): param is SlotParam {
  return isRenderableType(param.type) || isRenderFuncParam(param);
}

export function isRenderFuncParam(param: DeepReadonly<Param>) {
  return isRenderFuncType(param.type);
}

export function isSlotVar(component: Component, variable: Var) {
  return getSlotParams(component).some((slot) => slot.variable === variable);
}

export function getSlotArgs(comp: TplComponent) {
  const slotParams = getSlotParams(comp.component);
  const vs = tryGetBaseVariantSetting(comp);
  if (!vs) {
    return [];
  }
  return vs.args.filter((arg) => (slotParams as Param[]).includes(arg.param));
}

export function getSlotArg(comp: TplComponent, param: Param) {
  const vs = tryGetBaseVariantSetting(comp);
  if (!vs) {
    return undefined;
  }
  return vs.args.find((arg) => arg.param === param);
}

export function getSlotArgContent(tpl: TplComponent, name: string) {
  const arg = getSlotArgs(tpl).find((a) => a.param.variable.name === name);
  if (arg && isKnownRenderExpr(arg.expr)) {
    return arg.expr.tpl;
  }
  return undefined;
}

export const getTplSlots = maybeComputedFn(function getTplSlots(
  component: Component
) {
  const slotParams = new Set(getSlotParams(component));
  if (slotParams.size === 0) {
    return [];
  }
  return flattenComponent(component).filter(isTplSlot) as TplSlot[];
});

export const getTplSlot = maybeComputedFn(function getTplSlot(
  component: Component,
  variable: Var
): TplSlot | undefined {
  return getTplSlots(component).filter((s) => s.param.variable === variable)[0];
});

export const getTplSlotByName = maybeComputedFn(function getTplSlotByName(
  component: Component,
  name: string
): TplSlot | undefined {
  return getTplSlots(component).filter(
    (s) => toVarName(s.param.variable.name) === name
  )[0];
});

export function getTplSlotDescendants(node: TplNode) {
  return flattenTpls(node).filter(isTplSlot);
}

/**
 * Returns true if the content of the slot param should be wrapped in DataCtxReader
 */
export const shouldWrapSlotContentInDataCtxReader = maybeComputedFn(
  function shouldWrapSlotContentInDataCtxReader_(
    component: Component,
    slotParam: Param
  ): boolean {
    if (
      isCodeComponent(component) &&
      component.codeComponentMeta.providesData
    ) {
      // A code component with `providesData: true` should always have its
      // content wrapped
      return true;
    }

    if (!isSlot(slotParam)) {
      return false;
    }

    // A slot param for a Plasmic component should be wrapped if the corresponding
    // TplSlot is an arg to some other TplComponent, and _that_ arg should be wrapped.
    // For example, we have a ProductBox code component that provides data, and a
    // MyProductBox component that uses a ProductBox, but has a TplSlot linked to
    // `children` prop that is in the children of `ProductBox`. That means when you
    // use `MyProductBox`, you need to also wrap the content you pass to
    // `MyProductBox.children`, so that the slot content won't get rendered until
    // ProductBox has had a chance to provide the data.
    const tplSlot = getTplSlot(component, slotParam.variable);
    if (!tplSlot) {
      return false;
    }
    let ancestorSlotArg = getAncestorSlotArg(tplSlot);
    while (ancestorSlotArg) {
      if (
        shouldWrapSlotContentInDataCtxReader(
          ancestorSlotArg.tplComponent.component,
          ancestorSlotArg.arg.param
        )
      ) {
        return true;
      }
      ancestorSlotArg = getAncestorSlotArg(ancestorSlotArg.tplComponent);
    }
    return false;
  }
);

/**
 * Returns true if the argument node is a TplSlot with typography styling
 * attached
 */
export function isStyledTplSlot(node: TplNode): node is TplSlot {
  return (
    isTplSlot(node) &&
    node.vsettings.some((vs) => {
      const expr = createExpandedRuleSetMerger(vs.rs, node);
      return typographyCssProps.some((p) => expr.has(p));
    })
  );
}

/**
 * Returns true if this is a TplSlot that is likely intended for
 * text-like content, by checking that default contents are all either
 * text or icons.
 */
export function isLikelyTextTplSlot(node: TplNode): node is TplSlot {
  return (
    isTplSlot(node) &&
    node.defaultContents.length > 0 &&
    node.defaultContents.every((n) => isTplTextBlock(n) || isTplIcon(n))
  );
}

/**
 * Returns true if this is a TplSlot with a single unstyled text block
 */
export function isPlainTextTplSlot(node: TplNode): node is TplSlot {
  return (
    isTplSlot(node) &&
    node.defaultContents.length === 1 &&
    isTplPlainText(node.defaultContents[0])
  );
}

export function effectiveCodegenType(node: TplTag) {
  return node.codeGenType || TplTagCodeGenType.Auto;
}

/**
 * Returns true if `node` is a text node with no styles, and no rich
 * text spans either
 */
export function isTplPlainText(node: TplNode): node is TplTextTag {
  // only div tag can be plain text.
  if (!isTplTextBlock(node, "div")) {
    return false;
  }
  return (
    node.codeGenType === TplTagCodeGenType.NoTag ||
    (effectiveCodegenType(node) === TplTagCodeGenType.Auto &&
      hasNoExistingStyles(node, { includeValuesThatEqualInitial: true }) &&
      hasNoRichTextStyles(node) &&
      hasNoEventHandlers(node))
  );
}

/**
 * Returns true if `node` is a plain text node that is an arg to a TplComponent
 */
export function isPlainTextArgNode(node: TplNode): node is TplTextTag {
  if (isTplComponent(node.parent)) {
    const arg = $$$(node.parent).getArgContainingTpl(node);
    return isPlainTextArg(arg);
  }
  return false;
}

function isPlainTextArg(arg: Arg) {
  return (
    !!arg &&
    isKnownRenderExpr(arg.expr) &&
    arg.expr.tpl.length === 1 &&
    isTplPlainText(arg.expr.tpl[0])
  );
}

export function isTextBlockArg(arg: Arg | undefined) {
  return (
    !!arg &&
    isKnownRenderExpr(arg.expr) &&
    arg.expr.tpl.length === 1 &&
    isTplTextBlock(arg.expr.tpl[0])
  );
}

export function getSingleTextBlockFromArg(arg: Arg | undefined) {
  if (
    arg &&
    isKnownRenderExpr(arg.expr) &&
    arg.expr.tpl.length === 1 &&
    isTplTextBlock(arg.expr.tpl[0])
  ) {
    return arg.expr.tpl[0];
  }
  return undefined;
}

export function getSingleTplComponentFromArg(arg: Arg | undefined) {
  if (
    arg &&
    isKnownRenderExpr(arg.expr) &&
    arg.expr.tpl.length === 1 &&
    isTplComponent(arg.expr.tpl[0])
  ) {
    return arg.expr.tpl[0];
  }
  return undefined;
}

export function isTextArgNodeOfSlot(node: TplNode): node is TplTextTag {
  if (!isTplTextBlock(node)) {
    return false;
  }
  if (isTplComponent(node.parent)) {
    const arg = $$$(node.parent).getArgContainingTpl(node);
    if (arg && isKnownRenderExpr(arg.expr)) {
      return true;
    }
  }
  return false;
}

export function isCodeComponentSlot(tpl: TplNode) {
  return isTplSlot(tpl) && !!tpl.parent && isCodeComponentRoot(tpl.parent);
}

export function getContainingArgSlot(node: TplNode) {
  if (isTplComponent(node.parent)) {
    const arg = $$$(node.parent).getArgContainingTpl(node);
    if (arg) {
      const component = node.parent.component;
      const slot = getTplSlot(node.parent.component, arg.param.variable);
      if (slot) {
        return { component, arg, slot };
      }
    }
  }
  return undefined;
}

export function getSlotSelectionContainingTpl(tpl: TplNode) {
  const parent = tpl.parent;
  if (!parent || !isTplComponent(parent)) {
    return undefined;
  }
  const arg = $$$(parent).getArgContainingTpl(tpl);
  return new SlotSelection({
    tpl: parent,
    slotParam: arg.param,
  });
}

export function getParentOrSlotSelection(tpl: TplNode) {
  if (isTplComponent(tpl.parent)) {
    return getSlotSelectionContainingTpl(tpl);
  }
  return tpl.parent;
}

export function isTypographyNode(tpl: TplNode): tpl is TplNode {
  if (
    isTplTextBlock(tpl) ||
    isTplSlot(tpl) ||
    isTplInput(tpl) ||
    isCodeComponentTpl(tpl) ||
    isTplIcon(tpl)
  ) {
    return true;
  } else if (isTplTag(tpl)) {
    return THEMABLE_TAGS.includes(tpl.tag);
  } else {
    return false;
  }
}

export function isDescendantOfVirtualRenderExpr(node: TplNode) {
  const res = getAncestorSlotArg(node);
  return res ? isKnownVirtualRenderExpr(res.arg.expr) : false;
}

export function isDefaultSlotArg(arg?: Arg) {
  return !arg || arg.expr === null || isKnownVirtualRenderExpr(arg.expr);
}

/**
 * Returns ancestor TplSlot of argument tpl.  A TplSlot is returned
 * if the `tpl` is a descendent of a TplSlot (and so part of its
 * default content).
 *
 * @param crossTplComponent controls whether you want to cross
 *   TplComponent boundary.  For example, you may have a TplSlot
 *   with a TplComponent with a text tpl arg.  This text tpl is part
 *   of the TplSlot's defaultContents, and it is also an arg to
 *   a TplComponent.  If crossTplComponent is true, then the TplSlot
 *   is returned; else undefined is returned.  You should set
 *   crossTplComponent to true if you just care about finding the
 *   ancestor TplSlot, but to false if you are trying to find the
 *   immediate styling ancestor -- a TplSlot can provide styles,
 *   but styles get reset at Component boundaries, so an ancestor
 *   TplSlot cannot style a tpl node that is an arg to a
 *   TplComponent.
 */
export function getAncestorTplSlot(tpl: TplNode, crossTplComponent: boolean) {
  return L.takeWhile(
    $$$(tpl).parents().toArrayOfTplNodes(),
    (x) => crossTplComponent || !isTplComponent(x)
  ).find(isTplSlot);
}

export function getAncestorSlotArg(node: TplNode) {
  // First, walk the parent until we get to an arg to some TplComponent
  while (node.parent && !isTplComponent(node.parent)) {
    node = node.parent;
  }

  // no parent means we were never an arg to a TplComponent
  if (!node.parent) {
    return undefined;
  }

  const arg = $$$(node.parent).getArgContainingTpl(node);
  return {
    tplComponent: node.parent,
    arg,
  };
}

export function getTplSlotForParam(component: Component, param: Param) {
  assert(
    isSlot(param) && getTplOwnerComponent(param.tplSlot) === component,
    () =>
      `Expected param ${
        param.variable.name
      } of component ${getComponentDisplayName(component)} to be a slot`
  );
  return param.tplSlot;
}

/**
 * Finds the stack of parent args {TplComponent, Arg} for the argument `tpl`, if
 * it is a child of an Arg.  Else returns empty list.
 */
export function findParentArgs(tpl: TplNode) {
  const args: { tplComponent: TplComponent; arg: Arg }[] = [];
  while (tpl.parent) {
    if (isKnownTplComponent(tpl.parent)) {
      const arg = $$$(tpl.parent).getArgContainingTpl(tpl);
      args.push({
        tplComponent: tpl.parent,
        arg,
      });
    }

    tpl = tpl.parent;
  }
  return args;
}

/**
 * Finds the parent TplSlot for the argument `tpl`, if it is a
 * child of the defaultContents.  Else returns undefined.
 * @param tpl
 */
export function findParentSlot(tpl: TplNode) {
  while (tpl.parent) {
    tpl = tpl.parent;
    if (isKnownTplSlot(tpl)) {
      return tpl;
    }
  }

  // We've walked to the root of a Component, so we know this tpl
  // not a slot default content node
  return undefined;
}

export function fillVirtualSlotContents(
  tplMgr: TplMgr,
  tpl: TplComponent,
  slots?: TplSlot[],
  renameDefaultContents: boolean = true
) {
  if (!tplMgr.findComponentContainingTpl(tpl)) {
    // must be a TplComponent for a ArenaFrame - nothing to fix since we don't
    // overrides default contents in such TplComponents.
    return;
  }
  const owningComponent = $$$(tpl).owningComponent();
  slots = slots || getTplSlots(tpl.component);
  const baseVariant = getBaseVariantForClonedDefaultContents(tplMgr, tpl);
  for (const slot of slots) {
    const arg = $$$(tpl).getSlotArgForParam(slot.param);
    if (isDefaultSlotArg(arg)) {
      const newDefaultContents = cloneSlotDefaultContents(slot, [baseVariant]);
      $$$(tpl).updateSlotArgForParam(
        slot.param,
        (arg_) => {
          if (newDefaultContents) {
            return {
              newChildren: newDefaultContents,
              updateArg: () => {
                arg_.expr = new VirtualRenderExpr({
                  tpl: newDefaultContents as TplNode[],
                });
              },
            };
          } else {
            return { newChildren: [], updateArg: () => {} };
          }
        },
        // We skip cycle check when filling virtual slots.  This is because updating a
        // virtual slots can be very expensive because there many be a lot of instances,
        // and because the checks will always pass because if it was valid to set an
        // something as default content, it will also be valid to use it as an arg.
        {
          skipCycleCheck: true,
          deepRemove: true,
        }
      );
      if (renameDefaultContents) {
        // We make sure the new default contents have the proper, unique names.
        for (const content of newDefaultContents) {
          tplMgr.ensureSubtreeCorrectlyNamed(owningComponent, content);
        }
      }
    }
  }
}

export function fillCodeComponentDefaultSlotContent(
  tpl: TplCodeComponent,
  prop: string,
  baseVariant: Variant
) {
  const component = tpl.component;
  const ownerSite = tryGetOwnerSite(tpl.component);
  if (ownerSite) {
    const defaultContent =
      component.codeComponentMeta.defaultSlotContents[prop];
    if (defaultContent) {
      const contents = ensureArray(defaultContent);
      const tplContentsResults = allSuccess(
        ...contents.map((elt) =>
          elementSchemaToTpl(ownerSite, component, elt, {
            codeComponentsOnly: false,
            baseVariant: baseVariant,
          })
        )
      );

      if (tplContentsResults.result.isError) {
        console.log(
          `Error filling default slot contents for code component: `,
          tplContentsResults.result.error
        );
      } else {
        const tpls = tplContentsResults.result.value.map((x) => x.tpl);
        $$$(tpl).setSlotArg(
          prop,
          new RenderExpr({
            tpl: tpls,
          })
        );
      }
    }
  }
}

export function revertToDefaultSlotContents(
  tplMgr: TplMgr,
  tpl: TplComponent,
  argVar: Var
) {
  if (!tplMgr.findComponentContainingTpl(tpl)) {
    // must be a TplComponent for a ArenaFrame - nothing to fix since we don't
    // overrides default contents in such TplComponents.
    return;
  }
  // First, properly detach the current content
  const curArg = $$$(tpl).getSlotArg(argVar.name);
  if (curArg && isKnownRenderExpr(curArg.expr) && curArg.expr.tpl.length > 0) {
    $$$(curArg.expr.tpl).remove({ deep: true });
  }

  const baseVariant = getBaseVariantForClonedDefaultContents(tplMgr, tpl);
  if (isCodeComponent(tpl.component)) {
    if (argVar.name in tpl.component.codeComponentMeta.defaultSlotContents) {
      fillCodeComponentDefaultSlotContent(
        tpl as TplCodeComponent,
        argVar.name,
        baseVariant
      );
    } else {
      $$$(tpl).tryDelSlotArg(argVar.name);
    }
  } else {
    const slot = getTplSlot(tpl.component, argVar);
    if (slot) {
      if (slot.defaultContents.length === 0) {
        $$$(tpl).tryDelSlotArg(slot.param.variable.name);
      } else {
        const defaultContents = cloneSlotDefaultContents(slot, [baseVariant]);
        $$$(tpl).setSlotArgForParam(
          slot.param,
          new VirtualRenderExpr({
            tpl: defaultContents,
          }),
          {
            // We don't need to check cycle, as we are just using cloned default
            // content as the new arg, and whatever is valid as default content
            // should also be valid as arg.
            skipCycleCheck: true,
          }
        );
      }
    }
  }
}

function getBaseVariantForClonedDefaultContents(
  tplMgr: TplMgr,
  tpl: TplComponent
) {
  const owner = $$$(tpl).owningComponent();
  return tplMgr.ensureBaseVariant(owner);
}

/**
 * Clone the slot defaultContents, and for each node, swapping out its
 * base variant (which belongs to the Component that owns the slot) to the argument
 * contextVariant (which belongs to the Component that owns the slot content;
 * usually the frame root.).  Only the base variant settings are kept.
 */
export function cloneSlotDefaultContents(
  slot: TplSlot,
  contextVariantCombo: VariantCombo
) {
  if (slot.defaultContents.length === 0) {
    return [];
  }

  const contents = $$$(slot.defaultContents).clone().toArrayOfTplNodes();
  for (const content of contents) {
    for (const node of flattenTpls(content)) {
      if (isTplVariantable(node)) {
        const baseVs = tryGetBaseVariantSetting(node);
        if (baseVs) {
          baseVs.variants = contextVariantCombo;
          node.vsettings = [baseVs];
        } else {
          node.vsettings = [];
        }
      }
    }
  }
  return contents;
}

// If current selection is either a TplComponent containing a main content slot, or a parent element, then we "nudge" the insertion *into* the main content slot.
// This is useful when you have some PageLayout component, with a main content slot (typical with the pageWrapper Site setting).
// It's otherwise easy to accidentally insert as a sibling of the wrapper rather than *inside* the children slot.
//
// We consider a component slot to be a main content slot if:
//
// - It is directly marked as a main content slot (code components only)
// - It is a TplSlot inside of another main content slot.
//
// Returns a SlotSelection with tpl
export function tryGetMainContentSlotTarget(attemptedTarget: TplNode) {
  function isMainContentSlot(c: Component, p: Param) {
    return (
      p.isMainContentSlot ||
      (isPlasmicComponent(c) &&
        maybe(getTplSlot(c, p.variable), (tplSlot) =>
          ancestorsUpWithSlotSelections(tplSlot).some(
            (sel) =>
              sel instanceof SlotSelection &&
              sel.tpl &&
              isMainContentSlot(sel.tpl.component, sel.slotParam)
          )
        ))
    );
  }

  // Find any main content slot.
  function findMainContentSlot(tpl: TplNode) {
    if (isTplComponent(tpl)) {
      const slotParam = tpl.component.params.find((p) =>
        isMainContentSlot(tpl.component, p)
      );
      if (slotParam) {
        return new SlotSelection({
          tpl,
          slotParam,
        });
      }
    }
    return undefined;
  }

  if (!attemptedTarget) {
    return undefined;
  } else if (isTplTag(attemptedTarget)) {
    // Find any child with any main content slot.
    return attemptedTarget.children.map(findMainContentSlot).find((x) => x);
  } else {
    return findMainContentSlot(attemptedTarget);
  }
}
