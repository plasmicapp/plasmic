import { ArenaFrame, Component, Site, Variant } from "@/wab/classes";
import {
  arrayEqIgnoreOrder,
  butLast,
  ensure,
  ensureArray,
  isObjectEmpty,
  objsEq,
  partitions,
  replaceAll,
  replaceObj,
  tuple,
  xExtend,
  xOmit,
} from "@/wab/common";
import { DEVFLAGS } from "@/wab/devflags";
import {
  componentToAllVariants,
  siteToAllGlobalVariants,
} from "@/wab/shared/cached-selectors";
import { toVarName } from "@/wab/shared/codegen/util";
import {
  ensureValidCombo,
  getOrderedScreenVariants,
  getPartitionedScreenVariants,
  isBaseVariant,
  isComponentStyleVariant,
  isGlobalVariant,
  isPrivateStyleVariant,
  isScreenVariant,
  isStandaloneVariantGroup,
} from "@/wab/shared/Variants";
import { getStateVarName } from "@/wab/states";
import { $State } from "@plasmicapp/react-web";
import L from "lodash";

export type VariantPinState =
  | "selected-pinned"
  | "selected-unpinned"
  | "pinned-true"
  | "pinned-false"
  | "evaluated-true"
  | "evaluated-false";

export function isActiveVariantPinState(vstate: VariantPinState | undefined) {
  return !!vstate && (vstate.includes("selected") || vstate.includes("true"));
}

export interface PinState {
  targetVariants: Variant[];
  pinnedVariants: Map<Variant, boolean>;
}

export class PinStateManager {
  constructor(
    private site: Site,
    private component: Component,
    private evalState: Map<Variant, boolean>
  ) {}

  getComponentVariantGroups() {
    return this.component.variantGroups;
  }

  /**
   * Returns selected variants.  Base is never returned
   * unless it is the only selected variant.
   */
  selectedVariants(state: PinState) {
    return ensureValidCombo(this.component, state.targetVariants);
  }

  setSelectedVariants(state: PinState, variants: Variant[]): PinState {
    if (arrayEqIgnoreOrder(state.targetVariants, variants)) {
      return state;
    }
    for (const v of variants) {
      if (!state.targetVariants.includes(v)) {
        state = this.maybeDeactivatePeerVariants(state, v);
      }
      // If this variant had been explicitly pinned false, remove that pin
      if (this.getVariantState(state, v) === "pinned-false") {
        state = this.setVariantPin(state, v, true);
      }
    }

    const [privates, locals, globals] = partitions(variants, [
      isPrivateStyleVariant,
      (v) => !isGlobalVariant(v),
    ]);

    // For now, we only allow targeting one component style variant at a time.
    // Since user can specify multiple selectors per style variant, there's not
    // much value in allowing targeting a combo of component style variants.
    // Better to start strict than not!  We pick the last one, as that would
    // be the most-recently-added.
    const styleVariant = L.last(locals.filter(isComponentStyleVariant));

    // We also only allow targeting a single screen variant at a time.
    const screenVariant = L.last(globals.filter(isScreenVariant));
    return {
      ...state,
      targetVariants: ensureValidCombo(this.component, [
        // Only one private variant can be selected at a time; we pick the last,
        // which would be the most-recently-added.
        ...(privates.length > 1
          ? [
              ensure(
                L.last(privates),
                "Already checked that privates.length > 1"
              ),
            ]
          : privates),
        ...locals.filter(
          (v) => !isBaseVariant(v) && !isComponentStyleVariant(v)
        ),
        ...(styleVariant ? [styleVariant] : []),
        ...globals.filter((v) => !isScreenVariant(v)),
        ...(screenVariant ? [screenVariant] : []),
      ]),
    };
  }

  addSelectedVariants(state: PinState, variants: Variant[]) {
    for (const v of variants) {
      state = this.maybeDeactivatePeerVariants(state, v);
    }
    return this.setSelectedVariants(
      state,
      L.uniq([...state.targetVariants, ...variants])
    );
  }

  removeSelectedVariants(state: PinState, variants: Variant[]) {
    return this.setSelectedVariants(
      state,
      state.targetVariants.filter((v) => !variants.includes(v))
    );
  }

  activateVariant(state: PinState, variant: Variant) {
    if (this.isActive(state, variant)) {
      return state;
    }

    state = this.maybeDeactivatePeerVariants(state, variant);
    return this.setVariantPin(state, variant, true);
  }

  togglePin(state: PinState, variant: Variant, on?: boolean) {
    on = on ?? !this.isActive(state, variant);
    if (on) {
      return this.activateVariant(state, variant);
    } else {
      return this.deactivateVariant(state, variant);
    }
  }

  deactivateVariant(state: PinState, variant: Variant): PinState {
    if (!this.isActive(state, variant)) {
      return state;
    }

    // First, try unselecting
    if (this.isSelected(state, variant)) {
      state = this.removeSelectedVariants(state, [variant]);
    }

    if (this.isActive(state, variant)) {
      // If still active, then this variant must be pinned to true or
      // evaluated to true.  Set the pin accordingly.
      state = this.setVariantPin(state, variant, false);
    }

    return state;
  }

  isActive(state: PinState, variant: Variant) {
    const vstate = this.getVariantState(state, variant);
    return vstate && (vstate.includes("selected") || vstate.includes("true"));
  }

  isSelected(state: PinState, variant: Variant) {
    return state.targetVariants.includes(variant);
  }

  getVariantState(
    state: PinState,
    variant: Variant
  ): VariantPinState | undefined {
    const pinned = state.pinnedVariants.get(variant);
    const selected = state.targetVariants.includes(variant);
    const evaluated = this.evalState.get(variant);
    if (selected) {
      return pinned === true ? "selected-pinned" : "selected-unpinned";
    } else if (pinned === true) {
      return "pinned-true";
    } else if (pinned === false) {
      return "pinned-false";
    } else if (evaluated === true) {
      return "evaluated-true";
    } else if (evaluated === false) {
      return "evaluated-false";
    } else {
      return undefined;
    }
  }

  activeNonBaseVariants(state: PinState) {
    return [
      ...componentToAllVariants(this.component),
      ...siteToAllGlobalVariants(this.site),
    ].filter((v) => this.isActive(state, v) && !isBaseVariant(v));
  }

  toggleTargetingOfActiveVariants(state: PinState, on?: boolean): PinState {
    const activeVariants = this.activeNonBaseVariants(state);
    if (activeVariants.length === 0) {
      return state;
    }
    return this.toggleTargeting(state, activeVariants, on);
  }

  toggleTargeting(state: PinState, variants: Variant[], on?: boolean) {
    on =
      on ??
      variants
        .filter((v) => !isBaseVariant(v))
        .every((v) => !this.isSelected(state, v));
    if (on) {
      state = this.addSelectedVariants(state, variants);
    } else {
      // If currently targeting variants, untarget them, but keep them activated
      state = this.removeSelectedVariants(state, variants);
      variants.forEach((v) => {
        state = this.activateVariant(state, v);
      });
    }
    return state;
  }

  updateScreenVariants(state: PinState, newWidth: number) {
    const [activeVariants, inactiveVariants] = getPartitionedScreenVariants(
      this.site,
      newWidth
    );
    activeVariants.forEach(
      (variant) => (state = this.activateVariant(state, variant))
    );
    inactiveVariants.forEach(
      (variant) => (state = this.deactivateVariant(state, variant))
    );
    return state;
  }

  private maybeDeactivatePeerVariants(state: PinState, variant: Variant) {
    if (variant.parent && !variant.parent.multi) {
      variant.parent.variants.forEach((v) => {
        if (v !== variant) {
          state = this.deactivateVariant(state, v);
        }
      });
    }
    return state;
  }

  private setVariantPin(
    state: PinState,
    variant: Variant,
    makeActive: boolean
  ): PinState {
    const pinned = state.pinnedVariants.get(variant);
    const evaluated = this.evalState.get(variant);

    const setPin = (pin: boolean | undefined): PinState => {
      if (pin === undefined) {
        return {
          ...state,
          pinnedVariants: xOmit(state.pinnedVariants, variant),
        };
      } else {
        return {
          ...state,
          pinnedVariants: xExtend(
            new Map<Variant, boolean>(),
            state.pinnedVariants,
            new Map<Variant, boolean>([[variant, pin]])
          ),
        };
      }
    };

    if (makeActive) {
      if (pinned === false && evaluated) {
        // Currently evaluated to true but pinned to false; just remove pin
        return setPin(undefined);
      } else {
        // Otherwise, pinning to true is the only way to activate
        return setPin(true);
      }
    } else {
      if (pinned === true && !evaluated) {
        // Currently evaluated to false but pinned to true; just remove pin
        return setPin(undefined);
      } else if (pinned === undefined && evaluated) {
        // Currently no pin but evaluated to true; must explicitly pin to false
        return setPin(false);
      }
      // else, either this variant is already pinned to false, or there's
      // already no pin, and it's not evaluated to true, so nothing to do.
      return state;
    }
  }
}

export function extractPinStateFromFrame(
  site: Site,
  frame: ArenaFrame
): PinState {
  const pinnedVariants = new Map<Variant, boolean>();

  if (!isObjectEmpty(frame.pinnedGlobalVariants)) {
    const globalVariantMap = L.keyBy(
      siteToAllGlobalVariants(site),
      (v) => v.uuid
    );
    for (const [key, pin] of Object.entries(frame.pinnedGlobalVariants)) {
      pinnedVariants.set(
        ensure(
          globalVariantMap[key],
          "Pinned global variant must be in globalVariantMap"
        ),
        pin
      );
    }
  }

  if (!isObjectEmpty(frame.pinnedVariants)) {
    const componentVariantMap = L.keyBy(
      componentToAllVariants(frame.container.component),
      (v) => v.uuid
    );
    for (const [key, pin] of Object.entries(frame.pinnedVariants)) {
      pinnedVariants.set(
        ensure(
          componentVariantMap[key],
          "Pinned variant must be in componentVariantMap"
        ),
        pin
      );
    }
  }

  return {
    targetVariants: [...frame.targetVariants, ...frame.targetGlobalVariants],
    pinnedVariants,
  };
}

export abstract class PinManager {
  constructor(protected pinMachine: PinStateManager) {
    this.pinMachine = pinMachine;
  }

  protected abstract applyPinState(state: PinState): void;
  protected abstract get curState(): PinState;

  protected setPinState(state: PinState) {
    if (this.curState === state) {
      return;
    }

    this.applyPinState(state);
  }

  getPinState() {
    return this.curState;
  }

  selectedVariants() {
    return this.pinMachine.selectedVariants(this.curState);
  }

  setSelectedVariants(variants: Variant[]) {
    this.setPinState(
      this.pinMachine.setSelectedVariants(this.curState, variants)
    );
  }

  addSelectedVariants(variants: Variant[]) {
    this.setPinState(
      this.pinMachine.addSelectedVariants(this.curState, variants)
    );
  }

  removeSelectedVariants(variants: Variant[]) {
    this.setPinState(
      this.pinMachine.removeSelectedVariants(this.curState, variants)
    );
  }

  getVariantState(variant: Variant): VariantPinState | undefined {
    return this.pinMachine.getVariantState(this.curState, variant);
  }

  isSelected(variant: Variant) {
    return this.pinMachine.isSelected(this.curState, variant);
  }

  isActive(variant: Variant) {
    return this.pinMachine.isActive(this.curState, variant);
  }

  activateVariant(variant: Variant) {
    this.setPinState(this.pinMachine.activateVariant(this.curState, variant));
  }

  deactivateVariant(variant: Variant) {
    this.setPinState(this.pinMachine.deactivateVariant(this.curState, variant));
  }

  togglePin(variant: Variant, on?: boolean) {
    this.setPinState(this.pinMachine.togglePin(this.curState, variant, on));
    return this.isActive(variant);
  }

  activeNonBaseVariants() {
    return this.pinMachine.activeNonBaseVariants(this.curState);
  }

  toggleTargetingOfActiveVariants(on?: boolean) {
    this.setPinState(
      this.pinMachine.toggleTargetingOfActiveVariants(this.curState, on)
    );
  }

  toggleTargeting(variants: Variant[], on?: boolean) {
    this.setPinState(
      this.pinMachine.toggleTargeting(this.curState, variants, on)
    );
  }

  clearAll() {
    this.setPinState({
      targetVariants: [],
      pinnedVariants: new Map(),
    });
  }

  clearAllButScreen() {
    const cur = this.getPinState();
    this.setPinState({
      targetVariants: cur.targetVariants.filter((v) => isScreenVariant(v)),
      pinnedVariants: new Map(
        Array.from(cur.pinnedVariants.entries()).filter(([variant, _pin]) =>
          isScreenVariant(variant)
        )
      ),
    });
  }

  setVariantsFrom$State($state: $State) {
    const setVariant = (v: Variant, shouldBeActive: boolean) => {
      if (!shouldBeActive) {
        // De-activate and de-select variant.
        this.deactivateVariant(v);
        this.removeSelectedVariants([v]);
        return;
      }

      if (this.isActive(v) || this.isSelected(v)) {
        // Variant is already active or selected; nothing to do.
        return;
      }

      // Variant is not active and should be. Select it.
      this.activateVariant(v);
    };

    const groups = this.pinMachine.getComponentVariantGroups();
    for (const vg of groups) {
      if (!vg.linkedState) {
        continue;
      }

      const val = $state[getStateVarName(vg.linkedState)];
      if (isStandaloneVariantGroup(vg)) {
        const variant = vg.variants[0];
        setVariant(variant, !!val);
      } else {
        const vars = ensureArray(val);
        const [activate, deactivate] = partitions(vg.variants, [
          (v) => vars.includes(toVarName(v.name)),
        ]);
        activate.forEach((v) => setVariant(v, true));
        deactivate.forEach((v) => setVariant(v, false));
      }
    }
  }
}

/**
 * A PinManager that works directly with an ArenaFrame instance
 */
export class FramePinManager extends PinManager {
  constructor(private site: Site, private frame: ArenaFrame) {
    super(new PinStateManager(site, frame.container.component, new Map()));
  }

  protected get curState() {
    return extractPinStateFromFrame(this.site, this.frame);
  }

  applyPinState(state: PinState) {
    applyPinStateToFrame(state, this.frame);
  }
}

export function applyPinStateToFrame(state: PinState, frame: ArenaFrame) {
  const [globals, locals] = partitions(
    state.targetVariants.filter((v) => !isPrivateStyleVariant(v)),
    [isGlobalVariant]
  );
  if (!arrayEqIgnoreOrder(globals, frame.targetGlobalVariants)) {
    replaceAll(frame.targetGlobalVariants, globals);
  }

  if (!arrayEqIgnoreOrder(locals, frame.targetVariants)) {
    replaceAll(frame.targetVariants, locals);
  }

  const globalPins = Object.fromEntries(
    [...state.pinnedVariants.entries()]
      .filter(([variant, _pin]) => isGlobalVariant(variant))
      .map(([variant, pin]) => tuple(variant.uuid, pin))
  );
  if (!objsEq(globalPins, frame.pinnedGlobalVariants)) {
    replaceObj(frame.pinnedGlobalVariants, globalPins);
  }

  const localPins = Object.fromEntries(
    [...state.pinnedVariants.entries()]
      .filter(([variant, _pin]) => !isGlobalVariant(variant))
      .map(([variant, pin]) => tuple(variant.uuid, pin))
  );
  if (!objsEq(localPins, frame.pinnedVariants)) {
    replaceObj(frame.pinnedVariants, localPins);
  }
}

/**
 * Filters the list of activeVariants, removing "irrelevant" screen variants.
 * A screen variant is irrelevant if none of the variants in its group is
 * currently being targeted, and the component doesn't currently use any
 * variant in its group.
 */
export function withoutIrrelevantScreenVariants({
  activeVariants,
  site,
}: {
  isPageArena?: boolean;
  site: Site;
  component: Component;
  activeVariants: Variant[];
  targetedVariants: Variant[];
}) {
  const screenVariantGroup = site.activeScreenVariantGroup;
  if (screenVariantGroup && DEVFLAGS.simplifiedScreenVariants) {
    const ordered = getOrderedScreenVariants(site, screenVariantGroup).filter(
      (v) => activeVariants.includes(v)
    );
    const drop = new Set(butLast(ordered));
    return activeVariants.filter((v) => !drop.has(v));
  }
  return activeVariants;
  // Not sure why this was necessary before, but it seems
  // to work just fine without.
  // Fixes: https://app.shortcut.com/plasmic/story/22530/screen-variants-returning-to-base-variant
  // if (isPageComponent(component) && !isPageArena) {
  //   // Screen variants are always relevant to page components
  //   return activeVariants;
  // }

  // if (!activeVariants.some((v) => isScreenVariant(v))) {
  //   return activeVariants;
  // }

  // // We include variants from groups that are being targeted or already
  // // being used in the component
  // const usedScreenGroups = new Set(usedScreenVariantGroups(site, component));
  // for (const variant of targetedVariants) {
  //   if (isScreenVariant(variant)) {
  //     usedScreenGroups.add(ensure(variant.parent));
  //   }
  // }

  // return activeVariants.filter(
  //   (v) => !isScreenVariant(v) || usedScreenGroups.has(ensure(v.parent))
  // );
}
