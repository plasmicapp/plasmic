import {
  makeClientPinManager,
  makeCurrentVariantEvalState,
  makeEmptyPinState,
} from "@/wab/client/components/variants/ClientPinManager";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import {
  ensureCustomFrameForActivatedVariants,
  isComponentArena,
  isPageArena,
  resizeFrameForScreenVariant,
} from "@/wab/shared/Arenas";
import { assert, ensure } from "@/wab/shared/common";
import {
  ensureManagedFrameForVariantInComponentArena,
  getCellKeyForFrame,
  getComponentArenaBaseFrame,
  isCustomComponentFrame,
} from "@/wab/shared/component-arenas";
import { DEVFLAGS } from "@/wab/shared/devflags";
import {
  ArenaFrame,
  ArenaFrameCell,
  isKnownVariant,
  Site,
  Variant,
} from "@/wab/shared/model/classes";
import {
  ensureManagedRowForVariantInPageArena,
  getFrameColumnIndex,
} from "@/wab/shared/page-arenas";
import {
  applyPinStateToFrame,
  FramePinManager,
  PinManager,
  PinState,
  PinStateManager,
  VariantPinState,
} from "@/wab/shared/PinManager";
import {
  getBaseVariant,
  isBaseVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isStyleOrCodeComponentVariant,
  VariantCombo,
} from "@/wab/shared/Variants";
import { $State } from "@plasmicapp/react-web";
import { isArray } from "lodash";

export interface VariantsController {
  onClearVariants: () => void;
  onAddedVariant: (variant: Variant) => void;
  onClickVariant: (variant: Variant) => void;
  onTargetVariant: (variant: Variant, add: boolean) => void;
  onToggleVariant: (variant: Variant) => void;
  onClickCombo: (combo: VariantCombo) => void;
  onActivateCombo: (combo: VariantCombo) => void;
  onToggleTargetingOfActiveVariants: () => void;
  getPinState: (variant: Variant) => VariantPinState | undefined;
  getActiveNonBaseVariants(): Variant[];
  getTargetedVariants(): Variant[];
  isActive: (variant: Variant) => boolean | undefined;
  isTargeted: (variant: Variant) => boolean;
  canChangeActiveVariants: () => boolean;
  canToggleTargeting: (variant: Variant) => boolean;
  setVariantsFrom$State: ($state: $State) => void;
}

export function makeVariantsController(
  studioCtx: StudioCtx,
  viewCtx?: ViewCtx
): VariantsController | undefined {
  if (studioCtx.focusedMode) {
    // In focus mode, there's guaranteed to be only one visible ViewCtx, so always use that.
    const vc = viewCtx || studioCtx.focusedOrFirstViewCtx();
    if (vc) {
      return new CustomVariantsController(vc);
    } else {
      return undefined;
    }
  }

  const vc = viewCtx || studioCtx.focusedViewCtx();
  if (
    isComponentArena(studioCtx.currentArena) &&
    (!vc || vc.componentStackFrames().length === 1)
  ) {
    return new ComponentArenaVariantsController(studioCtx);
  } else if (
    isPageArena(studioCtx.currentArena) &&
    (!vc || vc.componentStackFrames().length === 1)
  ) {
    return new PageArenaVariantsController(studioCtx);
  } else if (vc) {
    return new CustomVariantsController(vc);
  } else {
    return undefined;
  }
}

export class CustomVariantsController implements VariantsController {
  constructor(private viewCtx: ViewCtx) {}

  canChangeActiveVariants() {
    return true;
  }

  canToggleTargeting(_variant: Variant) {
    return true;
  }

  getPinState(variant: Variant) {
    return this.pinManager.getVariantState(variant);
  }

  getActiveNonBaseVariants() {
    return this.pinManager.activeNonBaseVariants();
  }

  getTargetedVariants() {
    return this.pinManager.selectedVariants();
  }

  isActive(variant: Variant) {
    return this.pinManager.isActive(variant);
  }

  isTargeted(variant: Variant) {
    return this.pinManager.isSelected(variant);
  }

  onClearVariants() {
    const clearedScreenVariants = this.getActiveNonBaseVariants().some((v) =>
      isScreenVariant(v)
    );
    this.pinManager.clearAll();
    if (DEVFLAGS.simplifiedScreenVariants && clearedScreenVariants) {
      // If we're removing screen variants, reset to base (desktop) screen size.
      this.maybeResizeFrame(undefined);
    }
  }

  onAddedVariant(variant: Variant) {
    handleAddedVariant(this.pinManager, variant);
    this.maybeResizeFrame(variant);
  }

  onClickVariant(variant: Variant) {
    if (isPrivateStyleVariant(variant)) {
      this.pinManager.addSelectedVariants([variant]);
    } else {
      this.pinManager.setSelectedVariants([variant]);
      this.maybeResizeFrame(variant);
    }
  }

  onTargetVariant(variant: Variant, add: boolean) {
    this.pinManager.toggleTargeting([variant], add);
    if (add) {
      this.maybeResizeFrame(variant);
    }
  }

  onToggleVariant(variant: Variant) {
    const pinManager = this.pinManager;
    // If we're removing a screen variant, remove all screen variants / return to base.
    if (
      DEVFLAGS.simplifiedScreenVariants &&
      isScreenVariant(variant) &&
      this.isActive(variant)
    ) {
      for (const sibling of variant.parent?.variants ?? []) {
        pinManager.deactivateVariant(sibling);
      }
      this.maybeResizeFrame(undefined);
    } else {
      const active = pinManager.togglePin(variant);
      if (active) {
        this.maybeResizeFrame(variant);
      }
    }
  }

  onClickCombo(combo: VariantCombo) {
    const pinManager = this.pinManager;
    pinManager.clearAll();
    this.pinManager.setSelectedVariants(combo);
  }

  onActivateCombo(combo: VariantCombo) {
    const pinManager = this.pinManager;
    pinManager.clearAll();
    for (const variant of combo) {
      pinManager.activateVariant(variant);
    }
  }

  onToggleTargetingOfActiveVariants() {
    this.pinManager.toggleTargetingOfActiveVariants();
  }

  private maybeResizeFrame(variant: Variant | undefined) {
    maybeResizeFrame(this.viewCtx.site, this.viewCtx.arenaFrame(), variant);
  }

  private get pinManager() {
    return makeClientPinManager(this.viewCtx);
  }

  setVariantsFrom$State($state: $State) {
    this.pinManager.setVariantsFrom$State($state);
  }
}

export class ComponentArenaVariantsController implements VariantsController {
  constructor(private studioCtx: StudioCtx) {
    const focusedVc = studioCtx.focusedViewCtx();
    assert(
      !focusedVc || focusedVc.componentStackFrames().length === 1,
      "Expected to have no focused viewCtx or a focused viewCtx with one component stack frame"
    );
  }

  canChangeActiveVariants() {
    return false;
  }

  canToggleTargeting(variant: Variant) {
    if (isPrivateStyleVariant(variant)) {
      return true;
    }
    const curFrame = this.currentFrame;
    if (curFrame) {
      if (isScreenVariant(variant)) {
        const cellKey = getCellKeyForFrame(this.currentArena, curFrame);
        return cellKeyIncludesVariant(cellKey, variant);
      } else {
        return (
          ensure(
            this.pinManager,
            "Pin manager is expected to be not null"
          ).isActive(variant) ?? false
        );
      }
    }

    return false;
  }

  getPinState(variant: Variant) {
    return this.pinManager?.getVariantState(variant);
  }

  getActiveNonBaseVariants() {
    return this.pinManager?.activeNonBaseVariants() ?? [];
  }

  getTargetedVariants() {
    return this.pinManager?.selectedVariants() ?? [];
  }

  isActive(variant: Variant) {
    return this.pinManager?.isActive(variant);
  }

  isTargeted(variant: Variant) {
    return this.pinManager?.isSelected(variant) ?? false;
  }

  onClearVariants() {
    const baseFrame = getComponentArenaBaseFrame(this.currentArena);
    this.switchToFrame(baseFrame);
  }

  onAddedVariant(variant: Variant) {
    if (isPrivateStyleVariant(variant)) {
      this.pinManager?.addSelectedVariants([variant]);
    } else {
      this.switchToManagedFrame(variant);
    }
  }

  onClickVariant(variant: Variant) {
    const curFrame = this.currentFrame;
    const curVc = curFrame
      ? this.studioCtx.tryGetViewCtxForFrame(curFrame)
      : undefined;
    if (isPrivateStyleVariant(variant)) {
      if (curVc) {
        makeClientPinManager(curVc).addSelectedVariants([variant]);
      }
    } else if (curFrame) {
      const pinManager = ensure(
        this.pinManager,
        "Pin manager is expected to be not null"
      );
      const cellKey = getCellKeyForFrame(this.currentArena, curFrame);
      if (cellKeyIncludesVariant(cellKey, variant)) {
        pinManager.toggleTargeting([variant]);
      } else {
        this.switchToManagedFrame(variant);
      }
      this.maybeResizeFrame(curFrame, variant);
    } else {
      this.switchToManagedFrame(variant);
    }
  }

  onTargetVariant(variant: Variant, add: boolean) {
    assert(
      this.canToggleTargeting(variant),
      "Cannot toggle targeting for variant"
    );
    ensure(
      this.pinManager,
      "Pin manager is expected to be not null"
    ).toggleTargeting([variant], add);
  }

  onToggleVariant(variant: Variant) {
    assert(isPrivateStyleVariant(variant), "Expected private style variant");
    ensure(this.pinManager, "Pin manager is expected to be not null").togglePin(
      variant
    );
  }

  onClickCombo(combo: VariantCombo) {
    this.applyAndSwitch((state, machine) => {
      return machine.setSelectedVariants(makeEmptyPinState(), combo);
    });
  }

  onActivateCombo(combo: VariantCombo) {
    this.applyAndSwitch((state, machine) => {
      state = makeEmptyPinState();
      for (const variant of combo) {
        state = machine.activateVariant(state, variant);
      }
      return state;
    });
  }

  onToggleTargetingOfActiveVariants() {
    const pinManager = ensure(
      this.pinManager,
      "Pin manager is expected to be not null"
    );
    const toggleables = ensure(
      this.pinManager,
      "Pin manager is expected to be not null"
    )
      .activeNonBaseVariants()
      .filter((v) => this.canToggleTargeting(v));
    pinManager.toggleTargeting(toggleables);
  }

  private maybeResizeFrame(frame: ArenaFrame, variant: Variant) {
    if (isCustomComponentFrame(this.currentArena, frame)) {
      maybeResizeFrame(this.site, frame, variant);
    }
  }

  private applyAndSwitch(
    fn: (state: PinState, machine: PinStateManager) => PinState
  ) {
    const curFrame = ensure(this.currentFrame, "Current frame should be set");
    const curVc = this.studioCtx.tryGetViewCtxForFrame(curFrame);
    const machine = new PinStateManager(
      this.studioCtx.site,
      this.currentArena.component,
      curVc ? makeCurrentVariantEvalState(curVc) : new Map()
    );
    let state = ensure(
      this.pinManager,
      "Expected pin manager to be not null"
    ).getPinState();
    state = fn(state, machine);
    const activeVariants = machine.activeNonBaseVariants(state);
    const newFrame =
      activeVariants.length === 0
        ? getComponentArenaBaseFrame(this.currentArena)
        : activeVariants.length === 1
        ? ensureManagedFrameForVariantInComponentArena(
            this.studioCtx.site,
            this.currentArena,
            activeVariants[0]
          )
        : ensureCustomFrameForActivatedVariants(
            this.studioCtx.site,
            this.currentArena,
            new Set(activeVariants)
          );
    applyPinStateToFrame(state, newFrame);
    this.switchToFrame(newFrame);
    return newFrame;
  }

  private get site() {
    return this.studioCtx.site;
  }

  private get currentFrame() {
    return this.studioCtx.focusedContentFrame();
  }

  private get currentArena() {
    const arena = this.studioCtx.currentArena;
    assert(
      isComponentArena(arena),
      "Exepcted current arena to be a component arena"
    );
    return arena;
  }

  private get pinManager() {
    const frame = this.currentFrame;
    if (!frame) {
      return undefined;
    }

    const vc = this.studioCtx.tryGetViewCtxForFrame(frame);
    if (vc) {
      return makeClientPinManager(vc);
    } else {
      return new FramePinManager(this.studioCtx.site, frame);
    }
  }

  private switchToManagedFrame(variant: Variant) {
    const newFrame = ensureManagedFrameForVariantInComponentArena(
      this.studioCtx.site,
      this.currentArena,
      variant
    );
    this.switchToFrame(newFrame);
    return newFrame;
  }

  private switchToFrame(newFrame: ArenaFrame) {
    switchToFrame(this.studioCtx, this.currentFrame, newFrame);
  }

  setVariantsFrom$State($state: $State) {
    this.pinManager?.setVariantsFrom$State($state);
  }
}

export class PageArenaVariantsController implements VariantsController {
  constructor(private studioCtx: StudioCtx) {
    const focusedVc = studioCtx.focusedViewCtx();
    assert(
      !focusedVc || focusedVc.componentStackFrames().length === 1,
      "Expected to have no focused viewCtx or a focused viewCtx with one component stack frame"
    );
  }

  canChangeActiveVariants() {
    return false;
  }

  canToggleTargeting(variant: Variant) {
    if (isPrivateStyleVariant(variant)) {
      return true;
    }
    return this.pinManager?.isActive(variant) ?? false;
  }

  getActiveNonBaseVariants() {
    return this.pinManager?.activeNonBaseVariants() ?? [];
  }

  getTargetedVariants() {
    return this.pinManager?.selectedVariants() ?? [];
  }

  getPinState(variant: Variant) {
    return this.pinManager?.getVariantState(variant);
  }
  isActive(variant: Variant) {
    return this.pinManager?.isActive(variant);
  }
  isTargeted(variant: Variant) {
    return this.pinManager?.isSelected(variant) ?? false;
  }

  onClearVariants() {
    this.switchToVariant(getBaseVariant(this.currentArena.component));
  }

  onAddedVariant(variant: Variant) {
    if (isPrivateStyleVariant(variant)) {
      this.pinManager?.addSelectedVariants([variant]);
    } else {
      this.switchToVariant(variant);
    }
  }

  onClickVariant(variant: Variant) {
    if (isPrivateStyleVariant(variant)) {
      this.pinManager?.addSelectedVariants([variant]);
    } else if (this.pinManager?.isActive(variant)) {
      this.pinManager.toggleTargeting([variant], true);
    } else if (isScreenVariant(variant) && this.currentFrame) {
      resizeFrameForScreenVariant(this.site, this.currentFrame, variant);
    } else {
      this.switchToVariant(variant);
    }
  }

  onTargetVariant(variant: Variant, add: boolean) {
    assert(
      this.canToggleTargeting(variant),
      "Cannot toggle targeting for variant"
    );
    ensure(
      this.pinManager,
      "Pin manager is expected to be not null"
    ).toggleTargeting([variant], add);
  }

  onToggleVariant(variant: Variant) {
    assert(isPrivateStyleVariant(variant), "Expected private style variant");
    ensure(this.pinManager, "Pin manager is expected to be not null").togglePin(
      variant
    );
  }

  onClickCombo(combo: VariantCombo) {
    this.applyAndSwitch((state, machine) => {
      return machine.setSelectedVariants(makeEmptyPinState(), combo);
    });
  }

  onActivateCombo(combo: VariantCombo) {
    this.applyAndSwitch((state, machine) => {
      state = makeEmptyPinState();
      for (const variant of combo) {
        state = machine.activateVariant(state, variant);
      }
      return state;
    });
  }

  onToggleTargetingOfActiveVariants() {
    this.pinManager?.toggleTargetingOfActiveVariants();
  }

  private get site() {
    return this.studioCtx.site;
  }

  private get currentFrame() {
    return this.studioCtx.focusedContentFrame();
  }

  private get currentColIndex() {
    const frame = this.currentFrame;
    if (!frame) {
      return 0;
    }

    return Math.max(0, getFrameColumnIndex(this.currentArena, frame));
  }

  private get currentArena() {
    const arena = this.studioCtx.currentArena;
    assert(isPageArena(arena), "Current arena should be a page arena");
    return arena;
  }

  private get pinManager() {
    const frame = this.currentFrame;
    if (!frame) {
      return undefined;
    }

    const vc = this.studioCtx.tryGetViewCtxForFrame(frame);
    if (vc) {
      return makeClientPinManager(vc);
    } else {
      return new FramePinManager(this.studioCtx.site, frame);
    }
  }

  private applyAndSwitch(
    fn: (state: PinState, machine: PinStateManager) => PinState
  ) {
    const curFrame = ensure(this.currentFrame, "Current frame should be set");
    const curVc = this.studioCtx.tryGetViewCtxForFrame(curFrame);
    const machine = new PinStateManager(
      this.studioCtx.site,
      this.currentArena.component,
      curVc ? makeCurrentVariantEvalState(curVc) : new Map()
    );
    let state = ensure(
      this.pinManager,
      "Expected pin manager to be not null"
    ).getPinState();
    state = fn(state, machine);
    const activeVariants = machine.activeNonBaseVariants(state);
    const newFrame =
      activeVariants.length === 0
        ? getComponentArenaBaseFrame(this.currentArena)
        : ensureCustomFrameForActivatedVariants(
            this.studioCtx.site,
            this.currentArena,
            new Set(activeVariants)
          );
    applyPinStateToFrame(state, newFrame);
    this.switchToFrame(newFrame);
    return newFrame;
  }

  private switchToVariant(variant: Variant) {
    if (isScreenVariant(variant)) {
      return;
    }

    const row = ensure(
      ensureManagedRowForVariantInPageArena(
        this.site,
        this.currentArena,
        variant
      ),
      "Row should exist in page arena"
    );

    // When switching to base, if we only one row, the base means a single frame.
    // If we have more variants, it's ok to just jump to the first row (base row)
    // on the same col index
    const frame =
      isBaseVariant(variant) && this.currentArena.matrix.rows.length === 1
        ? row.cols[0].frame
        : ensure(
            row.cols[this.currentColIndex].frame,
            "Frame for current column should exist"
          );

    this.switchToFrame(frame);
  }

  private switchToFrame(newFrame: ArenaFrame) {
    switchToFrame(this.studioCtx, this.currentFrame, newFrame);
  }

  setVariantsFrom$State($state: $State) {
    this.pinManager?.setVariantsFrom$State($state);
  }
}

function switchToFrame(
  studioCtx: StudioCtx,
  fromFrame: ArenaFrame | undefined,
  toFrame: ArenaFrame | undefined
) {
  if (fromFrame === toFrame) {
    return;
  }

  const fromVc = studioCtx.tryGetViewCtxForFrame(fromFrame);
  const toVc = studioCtx.tryGetViewCtxForFrame(toFrame);

  if (toVc && fromVc) {
    const curTpl = fromVc.focusedTpl();
    if (curTpl) {
      toVc.setStudioFocusByTpl(curTpl);
    } else {
      studioCtx.setStudioFocusOnFrame({ frame: toFrame });
    }
  } else {
    studioCtx.setStudioFocusOnFrame({ frame: toFrame });
  }

  if (toFrame) {
    studioCtx.setStudioFocusOnFrame({
      frame: toFrame,
      autoZoom: true,
    });
  }
}

function handleAddedVariant(pinManager: PinManager, variant: Variant) {
  const selectedVariants = pinManager.selectedVariants();
  if (isPrivateStyleVariant(variant)) {
    pinManager.addSelectedVariants([variant]);
  } else if (selectedVariants.length <= 1) {
    // If only one variant is currently selected, assume we are replacing
    // the target combo
    pinManager.setSelectedVariants([variant]);
  } else if (isStyleOrCodeComponentVariant(variant)) {
    // Else if this is a registered variant, then we assume the user wants to
    // combine with existing combo
    pinManager.addSelectedVariants([variant]);
  } else if (selectedVariants.some((v) => v.parent === variant.parent)) {
    // Else, if there already exists some variant in the same group as this
    // variant, deselect it first, even if this is a multi-group
    pinManager.setSelectedVariants([
      ...selectedVariants.filter((v) => v.parent !== variant.parent),
      variant,
    ]);
  } else {
    // Finally, add the new variant to the current combo
    pinManager.addSelectedVariants([variant]);
  }
}

function maybeResizeFrame(
  site: Site,
  frame: ArenaFrame,
  variant: Variant | undefined
) {
  if (variant === undefined || isScreenVariant(variant)) {
    resizeFrameForScreenVariant(site, frame, variant);
  }
}

function cellKeyIncludesVariant(
  cellKey: ArenaFrameCell["cellKey"],
  variant: Variant
) {
  if (isArray(cellKey) && cellKey.includes(variant)) {
    return true;
  } else if (isKnownVariant(cellKey) && cellKey === variant) {
    return true;
  }
  return false;
}
