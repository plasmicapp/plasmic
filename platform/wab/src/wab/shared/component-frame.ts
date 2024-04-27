import {
  ArenaFrame,
  Site,
  TplComponent,
  Variant,
  VariantGroup,
} from "@/wab/classes";
import {
  arrayEqIgnoreOrder,
  filterMapKeys,
  mapsEq,
  maybe,
  mergeMaps,
  partitionMap,
  partitions,
  replaceAll,
  replaceObj,
  tuple,
  withoutNils,
} from "@/wab/common";
import { allComponentVariants } from "@/wab/components";
import { ensureValidCombo, isPrivateStyleVariant } from "@/wab/shared/Variants";
import { allGlobalVariants } from "@/wab/sites";
import L from "lodash";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { computed, observable } from "mobx";

/**
 * A class that tracks the targeted variants as well as
 * visibility pins for each variant in mobx observables.
 */
export abstract class VariantFrame {
  abstract getTargetVariants(): Variant[];
  abstract getPinnedVariants(): Map<Variant, boolean>;
  protected abstract _setTargetVariants(variants: Variant[]): void;
  protected abstract _setPinnedVariants(pins: Map<Variant, boolean>): void;

  setTargetVariants(variants: Variant[]) {
    if (!arrayEqIgnoreOrder(variants, this.getTargetVariants())) {
      this._setTargetVariants(variants);
    }
  }

  setPinnedVariants(pins: Map<Variant, boolean>) {
    if (!mapsEq(pins, this.getPinnedVariants())) {
      this._setPinnedVariants(pins);
    }
  }

  /**
   * Remove references to all variants that are not in the
   * argument list.
   */
  keepOnlyVariants(variants: Variant[]) {
    this.setTargetVariants(
      this.getTargetVariants().filter((v) => variants.includes(v))
    );
    this.setPinnedVariants(
      filterMapKeys(this.getPinnedVariants(), (v) => variants.includes(v))
    );
  }

  /**
   * Keeps reference to at most one of the variants from group
   * (arbitrarily selected)
   */
  keepOnlyOneOfVariants(group: VariantGroup) {
    const curTargets = this.getTargetVariants();
    const curPins = this.getPinnedVariants();

    const variants = group.variants;
    const first = variants.find(
      (v) => curTargets.includes(v) || curPins.has(v)
    );
    if (first) {
      const variantsToRemove = variants.filter((v) => v !== first);
      this.setTargetVariants(
        curTargets.filter((v) => !variantsToRemove.includes(v))
      );
      this.setPinnedVariants(
        filterMapKeys(curPins, (v) => !variantsToRemove.includes(v))
      );
    }
  }

  equals(other: VariantFrame) {
    return (
      mapsEq(this.getPinnedVariants(), other.getPinnedVariants()) &&
      arrayEqIgnoreOrder(this.getTargetVariants(), other.getTargetVariants())
    );
  }

  getPlainPins() {
    return makePlainPins(this.getPinnedVariants());
  }
}

function makePlainPins(pins: Map<Variant, boolean>) {
  return Object.fromEntries(
    [...pins.entries()].map(([v, p]) => tuple(v.uuid, p))
  );
}

/**
 * A VariantFrame that is backed by an ArenaFrame; will persist all pins
 * and target updates to ArenaFrame.targetGlobalVariants and
 * ArenaFrame.pinnedGlobalVariants.
 */
export class GlobalVariantFrame extends VariantFrame {
  constructor(public site: Site, private frame: ArenaFrame) {
    super();
  }

  getTargetVariants(): Variant[] {
    return [...this.frame.targetGlobalVariants];
  }

  getPinnedVariants(): Map<Variant, boolean> {
    return new Map(
      withoutNils(
        Object.entries(this.frame.pinnedGlobalVariants).map(([v, p]) =>
          maybe(this.getVariant(v), (variant) => tuple(variant, p))
        )
      )
    );
  }

  protected _setTargetVariants(variants: Variant[]): void {
    replaceAll(this.frame.targetGlobalVariants, variants);
  }

  protected _setPinnedVariants(pins: Map<Variant, boolean>): void {
    replaceObj(this.frame.pinnedGlobalVariants, makePlainPins(pins));
  }

  private getVariant(id: string): Variant | undefined {
    return this.allGlobalVariantsMap.get()[id];
  }

  private allGlobalVariantsMap = computed(() => {
    return L.keyBy(
      allGlobalVariants(this.site, { includeDeps: "direct" }),
      (v) => v.uuid
    );
  });

  clone() {
    return new GlobalVariantFrame(this.site, this.frame);
  }
}

/**
 * An abstract VariantFrame for a specific TplComponent
 */
export abstract class ComponentVariantFrame extends VariantFrame {
  abstract get tplComponent(): TplComponent;
  abstract clone(): ComponentVariantFrame;

  get component() {
    return this.tplComponent.component;
  }

  /**
   * Removes all references to private variants
   */
  clearPrivateVariants() {
    this.setTargetVariants(
      this.getTargetVariants().filter((v) => !isPrivateStyleVariant(v))
    );
    this.setPinnedVariants(
      filterMapKeys(this.getPinnedVariants(), (v) => !isPrivateStyleVariant(v))
    );
  }

  /**
   * Returns true if there's any reference to a private variant
   */
  hasPrivateVariants() {
    return (
      this.getTargetVariants().some((v) => isPrivateStyleVariant(v)) ||
      [...this.getPinnedVariants().keys()].some((v) => isPrivateStyleVariant(v))
    );
  }
}

/**
 * A "transient" VariantFrame for a specific TplComponent.  It is "transient",
 * in that it only lives on the client and is not backed by the data model --
 * that is, the targets / pins are not persisted in some ArenaFrame.  These frames
 * are used in spotlight mode, where you are drilling into a component.
 */
export class TransientComponentVariantFrame extends ComponentVariantFrame {
  private _targetVariants = observable.array<Variant>();
  private _pinnedVariants = observable.map<Variant, boolean>();

  constructor(public tplComponent: TplComponent) {
    super();
  }

  getTargetVariants(): Variant[] {
    return ensureValidCombo(this.component, this._targetVariants);
  }

  getPinnedVariants(): Map<Variant, boolean> {
    return this._pinnedVariants;
  }

  protected _setTargetVariants(variants: Variant[]): void {
    this._targetVariants.replace(variants);
  }

  protected _setPinnedVariants(pins: Map<Variant, boolean>): void {
    this._pinnedVariants.replace(pins);
  }

  clone() {
    const frame = new TransientComponentVariantFrame(this.tplComponent);
    frame._targetVariants.replace([...this._targetVariants]);
    frame._pinnedVariants.replace(this._pinnedVariants);
    return frame;
  }
}

/**
 * A ComponentVariantFrame that's backed by ArenaFrame; will write all updates to
 * the backing ArenaFrame.targetVariants and ArenaFrame.pinnedVariants,
 * _except_ for references to private style variants, which are transient and
 * should not be persisted.
 */
export class RootComponentVariantFrame extends ComponentVariantFrame {
  private _privateTargetVariants = observable.array<Variant>();
  private _privatePinnedVariants = observable.map<Variant, boolean>();
  constructor(private frame: ArenaFrame) {
    super();
  }

  get tplComponent() {
    return this.frame.container;
  }

  get component() {
    return this.frame.container.component;
  }

  getTargetVariants(): Variant[] {
    return [...this.frame.targetVariants, ...this._privateTargetVariants];
  }
  getPinnedVariants(): Map<Variant, boolean> {
    return mergeMaps(
      new Map(
        withoutNils(
          Object.entries(this.frame.pinnedVariants).map(([v, p]) =>
            maybe(this.getVariant(v), (variant) => tuple(variant, p))
          )
        )
      ),
      this._privatePinnedVariants
    );
  }
  protected _setTargetVariants(variants: Variant[]): void {
    const [privates, nonprivates] = partitions(variants, [
      isPrivateStyleVariant,
    ]);
    this._privateTargetVariants.replace(privates);
    replaceAll(this.frame.targetVariants, nonprivates);
  }
  protected _setPinnedVariants(pins: Map<Variant, boolean>): void {
    const [privates, nonprivates] = partitionMap(pins, [isPrivateStyleVariant]);
    this._privatePinnedVariants.replace(privates);
    replaceObj(this.frame.pinnedVariants, makePlainPins(nonprivates));
  }

  private allComponentVariants = computed(() =>
    L.keyBy(
      allComponentVariants(this.frame.container.component, {
        includeSuperVariants: true,
      }),
      (v) => v.uuid
    )
  );
  private getVariant(id: string): Variant | undefined {
    return this.allComponentVariants.get()[id];
  }

  clone() {
    const frame = new RootComponentVariantFrame(this.frame);
    // The new cloned frame right now has all the variants activated in
    // this.frame also activated.  But we don't store private style
    // variant states in this.frame, so we manually clone this
    // transient state here.
    frame._privatePinnedVariants.replace(this._privatePinnedVariants);
    frame._privateTargetVariants.replace(this._privateTargetVariants);
    return frame;
  }
}
