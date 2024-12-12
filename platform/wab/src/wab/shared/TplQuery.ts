import * as common from "@/wab/shared/common";
import {
  assert,
  check,
  clampedAt,
  ensure,
  ensureArray,
  filterMapNils,
  insert,
  InvalidCodePathError,
  maybe,
  only,
  remove,
  removeWhere,
  replace,
  replaceAll,
  replaceMultiple,
  switchType,
  tryRemove,
} from "@/wab/shared/common";
import {
  allStyleOrCodeComponentVariants,
  isCodeComponent,
  removeComponentParam,
} from "@/wab/shared/core/components";
import { SlotSelection } from "@/wab/shared/core/slots";
import {
  ensureCorrectImplicitStates,
  removeImplicitStatesAfterRemovingTplNode,
} from "@/wab/shared/core/states";
import {
  ancestorsUp,
  ancestorsUpWithSlotSelections,
  clone,
  detectComponentCycle,
  flattenTpls,
  getOwnerSite,
  getParentTplOrSlotSelection,
  getTplOwnerComponent,
  isTplComponent,
  isTplSlot,
  isTplTag,
  isTplTextBlock,
  isTplVariantable,
  mkTplTagX,
  removeMarkersToTpl,
  summarizeSlotParam,
  summarizeTpl,
  tplChildren,
  tplChildrenOnly,
  trackComponentRoot,
  tryGetOwnerSite,
  tryGetTplOwnerComponent,
} from "@/wab/shared/core/tpls";
import {
  Arg,
  Component,
  ensureKnownRenderExpr,
  ensureKnownTplComponent,
  ensureKnownTplNode,
  ensureKnownTplTag,
  Expr,
  isKnownRawText,
  isKnownRenderExpr,
  isKnownTplComponent,
  isKnownTplNode,
  isKnownTplTag,
  Param,
  RenderExpr,
  TplComponent,
  TplNode,
  TplSlot,
  TplTag,
} from "@/wab/shared/model/classes";
import {
  getSlotArgs,
  getTplSlotDescendants,
  getTplSlotForParam,
  isSlot,
} from "@/wab/shared/SlotUtils";
import { TplMgr } from "@/wab/shared/TplMgr";
import {
  ComponentCycleUserError,
  NestedTplSlotsError,
} from "@/wab/shared/UserError";
import { tryGetBaseVariantSetting } from "@/wab/shared/Variants";
import { notification } from "antd";
import L from "lodash";

type TplNodeOrSlot = TplNode | SlotSelection;
export type TplQueryInput = TplQuery | TplNodeOrSlot | TplNodeOrSlot[];

type UpdateSlotArgSpec = {
  newChildren: TplNode[];
  updateArg: () => void;
};

/**
 * TODO warning: support for SlotSelections is very limited.  E.g., parent()
 * on a SlotSelection doesn't give you the owning TplNode or anything.
 */
export class TplQuery {
  readonly nodes: (TplNode | SlotSelection)[];

  constructor(input: TplQueryInput) {
    this.nodes = switchType(input)
      .when(TplNode, (x) => [x])
      .when(SlotSelection, (x) => [x])
      .when(Array, (x: TplNodeOrSlot[]) => L.uniq(x))
      .when(TplQuery, (x: TplQuery) => x.nodes)
      .result();
  }

  private getTplComponent() {
    return ensureKnownTplComponent(this.one());
  }

  private getTplTag() {
    return ensureKnownTplTag(this.one());
  }

  getArgContainingTpl(tpl: TplNode) {
    const arg = this.tryGetArgContainingTpl(tpl);
    if (arg) {
      return arg;
    }
    throw new InvalidCodePathError();
  }

  tryGetArgContainingTpl(tpl: TplNode) {
    for (const arg of getSlotArgs(this.getTplComponent())) {
      if (isKnownRenderExpr(arg.expr) && arg.expr.tpl.includes(tpl)) {
        return arg;
      }
    }
    return undefined;
  }

  /**
   * Given a node with some parent, find the slot in the parent that node
   * belongs to, and update it with the mutator function.
   *
   * Has nothing to do with this.nodes.
   *
   * Note that if a slot arg is emptied, that arg is removed!
   */
  private static _updateParentSlotContaining(
    child: TplNode,
    newChildren: TplNode[],
    mutate: (children: TplNode[]) => void,
    opts: { deepRemove: boolean }
  ) {
    return switchType(child.parent)
      .when(null, () => {
        const owningComponent = getTplOwnerComponent(child);
        const content = [child];
        TplQuery.checkComponentCycles(owningComponent, newChildren);
        for (const newChild of newChildren) {
          newChild.parent = null;
        }
        mutate(content);
        owningComponent.tplTree = only(content);
        trackComponentRoot(owningComponent);
      })
      .when([TplTag, TplSlot], (parent) => {
        TplQuery._updateChildren(parent, newChildren, mutate, opts);
      })
      .when(TplComponent, (parent: /*TWZ*/ TplComponent) => {
        const arg = $$$(parent).getArgContainingTpl(child);
        TplQuery._updateSlot(
          parent,
          arg.param.variable.name,
          newChildren,
          mutate,
          opts
        );
      })
      .result();
  }

  /**
   * Updates the children of the given node.
   */
  private static _updateChildren(
    parent: TplNode | SlotSelection,
    newChildren: TplNode[],
    func: (children: TplNode[]) => void,
    opts: { deepRemove: boolean }
  ) {
    const updateSlot = (tpl, slotName) =>
      TplQuery._updateSlot(tpl, slotName, newChildren, func, opts);
    return switchType(parent)
      .when(SlotSelection, (p) => {
        updateSlot(p.toTplSlotSelection().tpl, p.slotParam.variable.name);
      })
      .when(TplTag, (p: /*TWZ*/ TplTag) => {
        TplQuery._updateChildArray(p, p.children, newChildren, func, opts);
      })
      .when(TplComponent, (p) => {
        updateSlot(p, "children");
      })
      .when(TplSlot, (p) => {
        TplQuery._updateChildArray(
          p,
          p.defaultContents,
          newChildren,
          func,
          opts
        );
      })

      .result();
  }

  /**
   * This clears parent pointers of removed children and connects
   * parent pointers of new children.
   */
  private static _updateSlot(
    parent: TplComponent,
    slotName: string,
    newChildren: TplNode[],
    func: (children: TplNode[]) => void,
    opts: { deepRemove: boolean }
  ) {
    return $$$(parent).updateSlotArg(
      slotName,
      (arg) => {
        // We cannot reuse the args.expr.tpl in the new RenderExpr; otherwise,
        // any addition to args.expr.tpl will be treated as a "move" model
        // operation, rather than a "new" model operation.
        // TODO: think of a better approach to detect "new" model operation.
        arg.expr = new RenderExpr({
          tpl: isKnownRenderExpr(arg.expr) ? arg.expr.tpl.slice(0) : [],
        });
        const expr = ensureKnownRenderExpr(arg.expr);
        return { newChildren, updateArg: () => func(expr.tpl) };
      },
      opts
    );
  }

  private static _updateChildArray(
    parent: TplNode,
    children: TplNode[],
    newChildren: TplNode[],
    func: (children: TplNode[]) => void,
    opts: { deepRemove: boolean }
  ) {
    this._updateChildArrayDynamic(
      parent,
      () => children,
      newChildren,
      () => func(children),
      opts
    );
  }

  /**
   * Performs cleanup / logistics for updating the children of
   * a parent TplNode
   * @param parent the parent
   * @param getChildren the array of current children
   * @param newChildren children that are to be newly added to the array
   *   by func(). This is passed in separately, so we can ensure some
   *   invariants before actually adopting these children.
   * @param func mutation function that actually updates the children
   *   with new children
   * @param opts.skipCycleCheck skips cycle checks for newChildren
   * @param opts.removeDeep for removed tpls, will DEEPLY remove references
   *   to them; see _cleanup().
   */
  private static _updateChildArrayDynamic(
    parent: TplNode,
    getChildren: () => TplNode[],
    newChildren: TplNode[],
    func: () => void,
    opts: {
      skipCycleCheck?: boolean;
      deepRemove: boolean;
    }
  ) {
    const destOwningComponent = $$$(parent).tryGetOwningComponent();
    if (destOwningComponent && !opts.skipCycleCheck) {
      TplQuery.checkComponentCycles(destOwningComponent, newChildren);
    }
    if (
      ancestorsUp(parent).some(isTplSlot) &&
      newChildren.flatMap(flattenTpls).some(isTplSlot)
    ) {
      throw new NestedTplSlotsError();
    }
    const origChildren = getChildren().slice();
    func();
    const children = getChildren();
    const removedChildren = L.difference(origChildren, children);
    const actualNewChildren = L.difference(children, origChildren);
    check(L.xor(actualNewChildren, newChildren).length === 0);

    for (const child of removedChildren) {
      // Detach removed child from its current parent
      TplQuery._cleanup(child, { deep: opts.deepRemove });
    }
    for (const child of children) {
      child.parent = parent;
    }
    for (const child of actualNewChildren) {
      for (const node of flattenTpls(child)) {
        if (isKnownTplComponent(node) || isKnownTplTag(node)) {
          const owner = $$$(node).tryGetOwningComponent();
          if (owner) {
            const site = tryGetOwnerSite(owner);
            if (site) {
              ensureCorrectImplicitStates(site, owner, node);
            }
          }
        }
      }
    }
  }

  private static checkComponentCycles(
    destOwningComponent: Component,
    newChildren: TplNode[]
  ) {
    if (detectComponentCycle(destOwningComponent, newChildren)) {
      throw new ComponentCycleUserError();
    }
  }

  add(nodes: TplQueryInput) {
    return $$$(this.nodes.concat($$$(nodes).toArray()));
  }

  /**
   * Cleans up node upon detachment from the `parent`.
   *
   * @param opts.deep if true, detaches the node from the COMPONENT.
   *   else just detaches it from its parent.  Deep should be true
   *   if a node is being deleted, and false if it is being moved
   *   elsewhere in the component.
   */
  private static _cleanup(node: TplNode, opts: { deep: boolean }) {
    const { deep } = opts;

    const component = $$$(node).tryGetOwningComponent();
    if (deep && component) {
      // if no component, then it has already been detached
      TplQuery._detachFromComponent(component, node);
    }

    // Detach from current parent. It is important to actually detach from
    // parent to avoid being referenced from multiple parents at a time,
    // even temporarily.
    TplQuery._detachFromParent(node);
  }

  /**
   * Performs the strict limited action of detaching `node` from its parent;
   * that is, removes it from its parent's children array.
   * This differs from _updateParentSlotContaining(), which deals with more
   * general operations and may also remove deeper references. It also does
   * not enforce any invariants except the above detachment.
   */
  private static _detachFromParent(node: TplNode) {
    if (node.parent) {
      switchType(node.parent)
        .when(TplTag, (parent) => {
          common.tryRemove(parent.children, node);
        })
        .when(TplSlot, (parent) => {
          common.tryRemove(parent.defaultContents, node);
        })
        .when(TplComponent, (parent) => {
          const arg = $$$(parent).tryGetArgContainingTpl(node);
          if (arg && isKnownRenderExpr(arg.expr)) {
            common.tryRemove(arg.expr.tpl, node);
          }
        })
        .result();
    }
    node.parent = null;
  }

  private static _detachFromComponent(component: Component, node: TplNode) {
    const site = getOwnerSite(component);

    if (isTplVariantable(node)) {
      // Remove private variants referencing this node
      const privateVariants = allStyleOrCodeComponentVariants(component).filter(
        (v) =>
          v.forTpl &&
          $$$(v.forTpl).ancestors().toArrayOfTplNodes().includes(node)
      );
      if (privateVariants.length) {
        const tplMgr = new TplMgr({ site });
        privateVariants.forEach((v) => tplMgr.tryRemoveVariant(v, component));
      }
    }

    // Remove implicit states from this subtree
    flattenTpls(node).forEach((subNode) =>
      removeImplicitStatesAfterRemovingTplNode(site, component, subNode)
    );

    // Remove all tplSlots in the subtree of node.
    const tplSlots = getTplSlotDescendants(node);
    if (tplSlots.length > 0) {
      for (const tplSlot of tplSlots) {
        removeComponentParam(site, component, tplSlot.param);
      }
    }

    // If this is a sub-child of a rich text block, then remove
    // references to it from its parent rich text block
    if (isTplTextBlock(node.parent)) {
      for (const vs of node.parent.vsettings) {
        if (isKnownRawText(vs.text)) {
          removeMarkersToTpl(vs.text, node);
        }
      }
    }
  }

  /**
   * @param deep if true, then will also remove any associated data
   *   that reference the tpl, like implicit states, private variants,
   *   etc. You should specify deep:true if you are deleting a tpl
   *   node; deep:false if you are just detaching it from its parent
   *   and moving it to another parent within the same component.
   * @param strict throws an error if node is not detached
   */
  _remove({ strict, deep }: { strict: boolean; deep: boolean }) {
    for (const node_ of [...this.nodes]) {
      const node = ensureKnownTplNode(node_);
      common
        .switchType(node.parent)
        .when(null, () => {
          assert(!strict, () => "must have a valid parent");
        })
        .when(TplNode, () => {
          return TplQuery._updateParentSlotContaining(
            node,
            [],
            (contents) => {
              if (strict) {
                remove(contents, node);
              } else {
                tryRemove(contents, node);
              }
            },
            { deepRemove: deep }
          );
        })
        .result();
    }
    return this;
  }

  // Removes an element, or silently no-ops if it wasn't attached to something.
  // @param deep whether remove the element deeply.   For TplSlot, removing
  // deeply will remove the underlying params; removing shallowly won't.
  tryRemove({ deep }: { deep: boolean }) {
    return this._remove({ strict: false, deep });
  }

  // Removes an element, or throws an error if it wasn't attached to something.
  // @param deep whether remove the element deeply. For TplSlot, removing
  // deeply will remove the underlying params; removing shallowly won't.
  remove({ deep }: { deep: boolean }) {
    return this._remove({ strict: true, deep });
  }

  detach() {
    return this.remove({ deep: false });
  }

  // Removes an element, but reattaches its children to its parent.
  ungroup() {
    for (const node_ of [...this.nodes]) {
      const node = ensureKnownTplNode(node_);
      const $node = $$$(node);

      const $ungroupedItems = $node.childrenOnly();
      // We detach the children of `node` to avoid having them
      // marked as deleted when we remove `node` from the model.
      $ungroupedItems.detach();
      const ungroupedItems = $ungroupedItems.toArrayOfTplNodes();

      TplQuery._updateParentSlotContaining(
        node,
        ungroupedItems,
        (contents) => replaceMultiple(contents, node, ungroupedItems),
        { deepRemove: false }
      );
    }
  }

  // Insert the given node as a sibling of current node at the given offset
  // (relative to current node). For example, offset 0 means insert right before
  // this node. Offset 1 means insert right after this node.
  beforeAfter(toInsert: TplNode, offset: /*TWZ*/ number) {
    assert(this.nodes.length <= 1, () => "More than 1 node");
    $$$(toInsert).tryRemove({ deep: false });
    for (const node_ of [...this.nodes.slice(0, 1)]) {
      const node = ensureKnownTplNode(node_);
      TplQuery._updateParentSlotContaining(
        node,
        [toInsert],
        (contents) => {
          const index = L.indexOf(contents, node);
          return insert(contents, index + offset, toInsert);
        },
        { deepRemove: false }
      );
    }
    return this;
  }

  // Insert the given node right after this node.
  after(toInsert: TplNode) {
    return this.beforeAfter(toInsert, 1);
  }

  // Insert the given node right before this node.
  before(toInsert: TplNode) {
    return this.beforeAfter(toInsert, 0);
  }

  // -1 means append
  private doInsertAt(toInsert: TplNode, index: number) {
    assert(this.nodes.length <= 1, () => "More than 1 node");
    $$$(toInsert).tryRemove({ deep: false });

    const node = this.nodes[0];
    TplQuery._updateChildren(
      node,
      [toInsert],
      (children) => {
        if (index === -1) {
          children.push(toInsert);
        } else {
          insert(children, index, toInsert);
        }
      },
      { deepRemove: false }
    );
    return this;
  }

  insertAt(x: TplNode, index: number) {
    assert(index >= 0, () => `Can only insert at positive location`);
    this.doInsertAt(x, index);
  }

  append(x: TplNode) {
    return this.doInsertAt(x, -1);
  }

  prepend(x: TplNode) {
    return this.doInsertAt(x, 0);
  }

  clone() {
    return $$$(this.nodes.map((node) => clone(ensureKnownTplNode(node))));
  }

  clear() {
    common.check(
      this.nodes.every(
        (node) => isKnownTplTag(node) || isKnownTplComponent(node)
      )
    );
    for (const node of [...this.nodes]) {
      for (const child of $$$(node).children().toArray()) {
        $$$(child).remove({ deep: true });
      }
    }
    return this;
  }

  /**
   * Returns direct child nodes, including ALL slots for TplComponents.
   *
   * See `childrenOnly()` to get only the "children" slot for TplComponents.
   */
  children() {
    return this.childrenInternal(false);
  }

  /**
   * Returns direct child nodes, including the "children" slot for TplComponents.
   *
   * See `children()` to get ALL slots for TplComponents.
   */
  childrenOnly() {
    return this.childrenInternal(true);
  }

  private childrenInternal(childrenOnly: boolean) {
    return $$$(
      this.nodes.flatMap((node) =>
        switchType(node)
          .when(
            SlotSelection,
            (ss) =>
              maybe(
                $$$(
                  ensure(ss.tpl, () => `Expected a tpl-backed SlotSelection`)
                ).getSlotArg(ss.slotParam.variable.name),
                (arg) => ensureKnownRenderExpr(arg.expr).tpl
              ) || []
          )
          .when(TplNode, (n) => {
            if (childrenOnly) {
              return tplChildrenOnly(n);
            } else {
              return tplChildren(n);
            }
          })
          .result()
      )
    );
  }

  /**
   * Returns content that can actually be laid out, ignoring the "empty" wrappers
   * like TplSlot.  When an "empty" wrapper like TplSlot is
   * passed in, their contents are returned instead.
   */
  layoutContent(): TplQuery {
    return $$$(
      L.flatten(
        [...this.nodes].map((node) => {
          const result = switchType(node)
            .when(TplTag, (n) => [n])
            .when(TplComponent, (n) => [n])
            .when(TplSlot, (n) =>
              $$$(n.defaultContents).layoutContent().toArrayOfTplNodes()
            )
            .elseUnsafe(() => []);
          return result;
        })
      )
    );
  }

  /**
   * Returns nearest ancestor that is neither TplSlot nor TplGroup
   * (i.e.) things rendered to empty).
   *
   * If throughSlot is true, then layout parent will be
   *
   */
  layoutParent(
    opts: { includeSelf?: boolean; throughSlot?: boolean } = {}
  ): TplQuery {
    const self = this.one();
    if (opts.includeSelf) {
      if (self instanceof SlotSelection || isTplTag(self)) {
        // If includeSelf, then immediately return for these two cases
        return $$$(self);
      }
    } else {
      assert(
        !(self instanceof SlotSelection),
        () => "No parent exists for SlotSelection"
      );
    }

    // From here on out we will never return self, only some ancestor
    let node: TplNode | undefined | null = self;
    while (node) {
      const parent = node.parent;
      if (isTplTag(parent)) {
        return $$$(parent);
      } else if (isTplComponent(parent)) {
        const arg = $$$(parent).getArgContainingTpl(node);
        if (opts.throughSlot && !isCodeComponent(parent.component)) {
          // If opts.throughSlot, then we locate the TplSlot corresponding
          // to this Plasmic component, and return _its_ layout parent
          // instead
          const slot = getTplSlotForParam(parent.component, arg.param);
          if (slot) {
            return $$$(slot).layoutParent(opts);
          }
        }
        const slotSelection = new SlotSelection({
          tpl: parent,
          slotParam: arg.param,
        });
        return $$$(slotSelection);
      } else {
        node = node.parent;
      }
    }
    return $$$([]);
  }

  filter(pred) {
    return $$$([...this.nodes].filter((n) => pred(n)).map((n) => n));
  }

  first() {
    return $$$(ensure(L.head(this.nodes), () => `Expected at least one node`));
  }

  last() {
    return $$$(ensure(L.last(this.nodes), () => `Expected at least one node`));
  }

  slice(start, end?) {
    return $$$(this.nodes.slice(start, end));
  }

  parent() {
    return $$$(filterMapNils(this.nodes, (n) => ensureKnownTplNode(n).parent));
  }

  parentOrSlotSelection() {
    return $$$(
      filterMapNils(this.nodes, (n) => getParentTplOrSlotSelection(n))
    );
  }

  toArray() {
    return this.nodes.slice();
  }

  one() {
    return only(this.nodes);
  }

  maybeOne() {
    return common.asOne(this.nodes);
  }

  maybeOneTpl() {
    const one = common.asOne(this.nodes);
    return one && isKnownTplNode(one) ? one : undefined;
  }

  get(i: /*TWZ*/ number) {
    if (i != null) {
      return this.nodes[i];
    } else {
      return this.toArray();
    }
  }

  replaceChildren(newChildren: TplNode | TplNode[]) {
    const newChildrenArr = ensureArray(newChildren);
    $$$(newChildrenArr).tryRemove({ deep: true });
    const self = only(this.nodes);
    return TplQuery._updateChildren(
      self,
      newChildrenArr,
      (children) => {
        children.splice(0, children.length, ...newChildrenArr);
      },
      { deepRemove: true }
    );
  }

  replaceWith(replacement: TplNode) {
    assert(this.nodes.length <= 1, () => "only works for single selected node");
    const node = ensureKnownTplNode(only(this.nodes));
    TplQuery._updateParentSlotContaining(
      node,
      [replacement],
      (children) => replace(children, node, replacement),
      { deepRemove: true }
    );
    return this;
  }

  replaceWithMultiple(replacements: TplNode[]) {
    assert(this.nodes.length <= 1, () => "only works for single selected node");
    const node = ensureKnownTplNode(only(this.nodes));
    TplQuery._updateParentSlotContaining(
      node,
      replacements,
      (children) => replaceMultiple(children, node, replacements),
      { deepRemove: true }
    );
    return this;
  }

  _wrap(
    wrapper: TplTag | TplComponent | SlotSelection,
    wrappeds: TplNode[],
    replaceOne: boolean
  ) {
    const tplWrapper =
      wrapper instanceof SlotSelection
        ? ensure(
            wrapper.toTplSlotSelection().tpl,
            () => `Expected tpl-backed SlotSelection`
          )
        : wrapper;
    common.check(this.nodes.length === 1);
    common.check(wrappeds.length > 0);
    common.check($$$(tplWrapper).children().isEmpty());
    $$$(tplWrapper).tryRemove({ deep: true });
    const wrapped = wrappeds[0];

    // Swap parent of wrapped to point to tplWrapper instead
    TplQuery._updateParentSlotContaining(
      wrapped,
      [tplWrapper],
      (contents) =>
        replaceOne
          ? replace(contents, wrapped, tplWrapper)
          : replaceAll(contents, [tplWrapper]),
      { deepRemove: false }
    );
    TplQuery._updateChildren(
      wrapper,
      wrappeds,
      (children) => {
        replaceAll(children, wrappeds);
      },
      { deepRemove: true }
    );
    return this;
  }

  length() {
    return this.nodes.length;
  }

  isEmpty() {
    return this.length() === 0;
  }

  toArrayOfTplNodes() {
    return this.nodes.map((x) => ensureKnownTplNode(x));
  }

  wrap(wrapper: TplTag | TplComponent | SlotSelection) {
    return this._wrap(wrapper, this.toArrayOfTplNodes(), true);
  }

  wrapInner(wrapper: TplTag | TplComponent) {
    return this._wrap(wrapper, this.children().toArrayOfTplNodes(), false);
  }

  /** Returns ancestors bottom-up. Includes current node. */
  ancestors(): TplQuery {
    return $$$(this.toArrayOfTplNodes().flatMap((tpl) => ancestorsUp(tpl)));
  }

  /** Return strict ancestors bottom-up. Does not include current node. */
  parents(): TplQuery {
    return $$$(
      this.toArrayOfTplNodes().flatMap((tpl) => ancestorsUp(tpl, true))
    );
  }

  /**
   * Returns ancestors bottom-up, including SlotSelections if it is an arg of a TplComponent
   */
  ancestorsWithSlotSelections(): TplQuery {
    return $$$(
      this.toArray().flatMap((node) => ancestorsUpWithSlotSelections(node))
    );
  }

  parentsWithSlotSelections(): TplQuery {
    return $$$(
      this.toArray().flatMap((node) =>
        ancestorsUpWithSlotSelections(node).slice(1)
      )
    );
  }

  root(): TplQuery {
    const ancestors = this.ancestors().nodes;
    return $$$(ancestors[ancestors.length - 1]);
  }

  owningComponent(): Component {
    return ensure(
      this.tryGetOwningComponent(),
      () =>
        `Could not find owning component for ${this.nodes
          .map((x) =>
            x instanceof SlotSelection
              ? summarizeSlotParam(x.slotParam)
              : summarizeTpl(x)
          )
          .join(", ")}`
    );
  }

  tryGetOwningComponent(): Component | undefined {
    const node = this.one();
    const tpl = node instanceof SlotSelection ? node.getTpl() : node;
    return tryGetTplOwnerComponent(tpl);
  }

  closest(x: /*TWZ*/ TplQuery) {
    const needle = $$$(x).get(0);
    return $$$(
      [...this.add(this.parents()).toArray()].filter((n) => n === needle)
    );
  }

  find(x: TplNode) {
    const $$$x = $$$(x);
    if ($$$x.closest(this).isEmpty()) {
      return $$$([]);
    } else {
      return $$$x;
    }
  }

  private isSlot(argName: string) {
    return this.isSlotParam(this.param(argName));
  }

  private isSlotParam(param: Param) {
    return isSlot(param);
  }

  getSlotArg(argName: /*TWZ*/ string) {
    return this.getSlotArgForParam(this.param(argName));
  }

  getSlotArgForParam(param: Param) {
    check(this.isSlotParam(param));
    return getSlotArgs(this.getTplComponent()).find(
      (arg) => arg.param === param
    );
  }

  readBaseArgs() {
    const vs = tryGetBaseVariantSetting(this.getTplComponent());
    return vs ? vs.args : [];
  }

  getBaseArgs() {
    const vs = ensure(
      tryGetBaseVariantSetting(this.getTplComponent()),
      () => `Expected base variant settings to exist`
    );
    return vs.args;
  }

  readBaseAttrs() {
    const vs = tryGetBaseVariantSetting(this.getTplTag());
    return vs ? vs.attrs : {};
  }

  getBaseAttrs() {
    const vs = ensure(
      tryGetBaseVariantSetting(this.getTplTag()),
      () => `Expected base variant settings to exist`
    );
    return vs.attrs;
  }

  getAllAttrs() {
    return L.flatten(
      this.getTplTag().vsettings.map((vs) => Object.entries(vs.attrs))
    );
  }

  delSlotArg(argName) {
    check(this.isSlot(argName));
    return check(this.tryDelSlotArg(argName));
  }

  setSlotArg(argName, expr: Expr) {
    return this.setSlotArgForParam(this.param(argName), expr);
  }

  setSlotArgForParam(
    param: Param,
    expr: Expr,
    opts?: { skipCycleCheck?: boolean }
  ) {
    check(this.isSlotParam(param));
    return this.updateSlotArgForParam(
      param,
      (arg) => {
        return {
          newChildren: isKnownRenderExpr(expr) ? expr.tpl : [],
          updateArg: () => {
            arg.expr = expr;
          },
        };
      },
      {
        // Any existing content of the arg should be deeply removed
        deepRemove: true,
        skipCycleCheck: opts?.skipCycleCheck,
      }
    );
  }

  updateSlotArg(
    argName: string,
    func: (arg: Arg) => UpdateSlotArgSpec,
    opts: { deepRemove: boolean }
  ) {
    return this.updateSlotArgForParam(this.param(argName), func, opts);
  }

  updateSlotArgForParam(
    param: Param,
    func: (arg: Arg) => UpdateSlotArgSpec,
    opts: { deepRemove: boolean; skipCycleCheck?: boolean }
  ) {
    check(this.isSlotParam(param));
    const maybeArg = this.getSlotArgForParam(param);
    const arg =
      maybeArg != null ? maybeArg : new Arg({ param, expr: null as any });
    const spec: UpdateSlotArgSpec = func(arg);
    TplQuery._updateChildArrayDynamic(
      this.getTplComponent(),
      () => (isKnownRenderExpr(arg.expr) ? arg.expr.tpl : []),
      spec.newChildren,
      () => {
        spec.updateArg();
        if (!maybeArg) {
          this.getBaseArgs().push(arg);
        }
      },
      opts
    );
    return this;
  }

  tryDelSlotArg(argName) {
    check(this.isSlot(argName));
    return removeWhere(
      this.getBaseArgs(),
      (arg) => arg.param.variable.name === argName
    );
  }

  param(paramName) {
    return ensure(
      this.getTplComponent().component.params.find(
        (p) => p.variable.name === paramName
      ),
      () => `Expected param ${paramName} to exist`
    );
  }

  slot(slotName) {
    return $$$(
      new SlotSelection({
        tpl: this.getTplComponent(),
        slotParam: this.param(slotName),
      })
    );
  }

  siblings() {
    const node = this.maybeOneTpl();
    if (!node) {
      return this;
    } else if (!node.parent) {
      return this;
    } else if (isTplComponent(node.parent)) {
      // Return siblings from the same slot arg
      const arg = $$$(node.parent).getArgContainingTpl(node);
      return $$$((arg.expr as RenderExpr).tpl);
    } else {
      return this.parent().children();
    }
  }

  next() {
    return this.getSibling(1, false);
  }

  prev() {
    return this.getSibling(-1, false);
  }

  oneTpl() {
    return ensureKnownTplNode(this.one());
  }

  private getSibling(offset: number, clamp: boolean) {
    const node = this.oneTpl();
    const siblings = this.siblings().toArrayOfTplNodes();
    const index = siblings.indexOf(node);
    return $$$(
      clamp
        ? clampedAt(siblings, index + offset)
        : siblings[index + offset] || []
    );
  }

  /**
   * Tolerates offsets larger than avail sibling count, in which clamps to the
   * ends.  Doesn't move anything if the item is already in the desired
   * position.
   */
  private moveBy(offset: number) {
    const node = this.oneTpl();
    const target = this.getSibling(offset, true);
    if (isTplTextBlock(node.parent)) {
      notification.error({
        message: "Cannot move element inside text block.",
      });
      return this;
    }
    if (target.one() === node) {
      // We're already in the desired position.
      return this;
    }
    if (offset > 0) {
      target.after(node);
    } else {
      target.before(node);
    }
    return this;
  }

  moveForward() {
    return this.moveBy(1);
  }

  moveBackward() {
    return this.moveBy(-1);
  }

  moveEnd() {
    this.moveBy(99999);
  }

  moveStart() {
    this.moveBy(-99999);
  }

  getAsTagOrWrap(): TplTag {
    const self = this.oneTpl();
    if (isKnownTplTag(self)) {
      return self;
    }
    const wrapper = mkTplTagX("div");
    $$$(self).wrap(wrapper);
    return wrapper;
  }
}

export const $$$ = (x: TplQueryInput) => new TplQuery(x);
