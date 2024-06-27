import { Component, TplComponent } from "@/wab/shared/model/classes";
import { ValComponent } from "@/wab/shared/core/val-nodes";

export class ComponentCtx {
  private _component: Component;
  private _tplComponent: TplComponent;
  private _valComponent: ValComponent;
  constructor(args: { valComponent: ValComponent }) {
    this._valComponent = args.valComponent;
    this._tplComponent = args.valComponent.tpl;
    this._component = this._tplComponent.component;
  }
  component() {
    return this._component;
  }
  tplComponent() {
    return this._tplComponent;
  }
  valComponent() {
    return this._valComponent;
  }

  /**
   * Just compare .component, since we do not support recursive components yet.
   */
  eq(other: ComponentCtx) {
    return this._component === other._component;
  }
}
