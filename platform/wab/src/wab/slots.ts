import type { Param, TplComponent } from "@/wab/classes";
import { assert, ensure } from "@/wab/common";
import { ValComponent, ValNode } from "@/wab/val-nodes";

/**
 * This represents selecting a slot from the perspective of outside the
 * component, at a usage call site.  This is not for selecting ValSlots
 * when drilled into the owning component.
 *
 * Either tpl or val is set; never both.
 */
export class SlotSelection {
  readonly val?: ValComponent;
  readonly tpl?: TplComponent;
  readonly slotParam: Param;

  constructor(opts: {
    val?: ValComponent;
    tpl?: TplComponent;
    slotParam: Param;
  }) {
    this.val = opts.val;
    this.tpl = opts.tpl;
    this.slotParam = opts.slotParam;
  }

  valToTpl(): SlotSelection {
    return new SlotSelection({
      tpl: ensure(this.val, () => `Not in a val slot selection`).tpl,
      val: undefined,
      slotParam: this.slotParam,
    });
  }

  withVal(val: ValComponent): SlotSelection {
    assert(
      !this.tpl || val.tpl === this.tpl,
      () =>
        `Provided ValComponent for different tpl (${val.tpl.uuid} instead of ${this.tpl?.uuid})`
    );
    return new SlotSelection({
      tpl: undefined,
      val,
      slotParam: this.slotParam,
    });
  }

  toTplSlotSelection(): SlotSelection {
    if (this.val != null) {
      return this.valToTpl();
    } else {
      return this;
    }
  }
  tryGetContent(): ValNode[] | undefined {
    return ensure(
      this.val,
      () => `Can only get contents of a val SlotSelection`
    ).slotArgs.get(this.slotParam);
  }
  getTpl(): TplComponent {
    return ensure(this.toTplSlotSelection().tpl, () => `Expected tpl to exist`);
  }

  equals(sel: any) {
    return (
      sel instanceof SlotSelection &&
      this.val === sel.val &&
      this.tpl === sel.tpl &&
      this.slotParam === sel.slotParam
    );
  }
}

// Should keep in sync with `slotSelectionKeyFromRenderingCtx`
export function makeSlotSelectionKey(ss: SlotSelection) {
  return ss.val ? `${ss.val.key}~${ss.slotParam.uuid}` : "";
}

export function makeSlotSelectionFullKey(ss: SlotSelection) {
  return ss.val ? `${ss.val.fullKey}~${ss.slotParam.uuid}` : "";
}
