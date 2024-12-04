import type { SubDeps } from "@/wab/client/components/canvas/subdeps";
import type { ViewCtx } from "@/wab/client/studio-ctx/view-ctx";
import { isSlot } from "@/wab/shared/SlotUtils";
import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import { toVarName } from "@/wab/shared/codegen/util";
import { isTplNamable } from "@/wab/shared/core/tpls";
import { ValComponent } from "@/wab/shared/core/val-nodes";
import {
  Component,
  Param,
  Site,
  TplComponent,
  TplNode,
  Type,
  Variant,
} from "@/wab/shared/model/classes";
import { ButtonPlugin } from "@/wab/shared/plume/button";
import { CheckboxPlugin } from "@/wab/shared/plume/checkbox";
import { MenuPlugin } from "@/wab/shared/plume/menu";
import { MenuButtonPlugin } from "@/wab/shared/plume/menu-button";
import { MenuGroupPlugin } from "@/wab/shared/plume/menu-group";
import { MenuItemPlugin } from "@/wab/shared/plume/menu-item";
import { SelectPlugin } from "@/wab/shared/plume/select";
import { SelectOptionPlugin } from "@/wab/shared/plume/select-option";
import { SelectOptionGroupPlugin } from "@/wab/shared/plume/select-option-group";
import { SwitchPlugin } from "@/wab/shared/plume/switch";
import { TextInputPlugin } from "@/wab/shared/plume/text-input";
import { TriggeredOverlayPlugin } from "@/wab/shared/plume/triggered-overlay";
import { Action, CodeComponentMeta } from "@plasmicapp/host";
import React from "react";

export interface PlumeCanvasPlugin {
  genCanvasWrapperComponent(
    sub: SubDeps,
    impl: React.FunctionComponent<any>,
    canvasObserver: <T>(fn: () => T) => T,
    getVariantsAndArgsMeta: () => {
      internalVariantProps: string[];
      internalArgProps: string[];
    },
    component: Component,
    viewCtx: ViewCtx,
    createCanvasComponent: (comp: Component) => React.ComponentType<any>
  ): React.ComponentType<any>;
}

export interface PlumeCodegenPlugin {
  genHook: (ctx: SerializerBaseContext) => string;
  genDefaultExternalProps: (
    ctx: SerializerBaseContext,
    opts?: { typeName?: string }
  ) => string;
  genSkeleton: (ctx: SerializerBaseContext) => string;
  genSkeletonImports: (ctx: SerializerBaseContext) => {
    imports: string;
    refName?: string;
  };
  genSerializedSkeletonFields: (ctx: SerializerBaseContext) => string;
  genOnChangeEventToValue?: string;

  /**
   * Twiddle props to pass into an instantiation of the Plume component
   */
  twiddleGenInstanceProps?: (
    tpl: TplComponent,
    serializedProps: Record<string, string>
  ) => void;
  tagToAttachEventHandlers?: string;
}

export interface PlumeVariantDef {
  group: string;
  variant: string;
  info: string;
  required?: boolean;
}

export interface PlumeElementDef {
  name: string;
  info: string;
  required?: boolean;
}

export interface PlumeSlotDef {
  name: string;
  info: string;
  required?: boolean;
}

export interface PlumeCompMeta {
  name: string;
  description: string;
  variantDefs: PlumeVariantDef[];
  slotDefs: PlumeSlotDef[];
  elementDefs: PlumeElementDef[];
}

export type PlumeCodeComponentMeta = Omit<
  CodeComponentMeta<any>,
  "name" | "importPath"
>;

export interface PlumeEditorPlugin {
  /**
   * Returns true if a TplComponent of `component` should show the prop editor
   * control for `prop`
   */
  shouldShowInstanceProp?: (tpl: TplComponent | null, prop: Param) => boolean;

  /**
   * If the prop editor for this ValComponent's prop should be a dropdown, then
   * returns the enum values.  Return null if should not be a dropdown.
   */
  getInstancePropEditorEnumValues?: (
    valComp: ValComponent,
    prop: string,
    viewCtx: ViewCtx
  ) => string[] | null;

  /**
   * Called when a Plume component instance is created
   */
  onAttached?: (tpl: TplComponent, viewCtx?: ViewCtx) => void;

  /**
   * Called when a Plume component instance is updated
   */
  onUpdated?: (tpl: TplComponent) => void;

  /**
   * Returns type constraints for the argument slot param
   */
  getSlotType?: (component: Component, param: Param) => Type | undefined;

  /**
   * Returns CodeComponentMeta for this Plume component
   */
  codeComponentMeta?: (component: Component) => PlumeCodeComponentMeta;

  actions?: (component: Component) => Action<any>[];

  /**
   * Default props to inject when displayed as the root component of
   * an artboard or live frame
   */
  getArtboardRootDefaultProps?: (
    component: Component
  ) => Record<string, any> | undefined;

  /**
   * Called when a Plume component of this type was just created
   */
  onComponentCreated?: (
    site: Site,
    plumeSite: Site,
    component: Component
  ) => void;

  /**
   * Called when a Plume component of this type is inserted as a tpl component
   */
  onComponentInserted?: (
    component: Component,
    tplComponent: TplComponent
  ) => void;
  getEventHandlers?: () => string[];

  componentMeta: PlumeCompMeta;
}

export interface PlumeDocsExampleInstance {
  plumeType?: string;
  props: Record<string, string>;
}

export interface PlumeDocsExample {
  title: string;
  info?: string;
  code: string;
  instances?: Record<string, PlumeDocsExampleInstance>;
}

export interface PlumeDocsProp {
  name: string;
  info: string;
  type: string | ((site: Site) => string);
}

export interface PlumeDocsPlugin {
  /**
   * List of Plume types for which components need to be imported by docs
   * editor and liveframe.
   */
  deps?: string[];

  /**
   * Mapping from Plume type (e.g. select-option) to exported subcomponent
   * name in the supercomponent (e.g. Option).
   */
  subs?: Record<string, string>;

  /**
   * Description used in Docs Portal.
   */
  docsInfo?: string;

  /**
   * Code examples to demonstrate component functionalities.
   */
  examples?: PlumeDocsExample[];

  /**
   * Base props expected by the component.
   */
  codeProps?: PlumeDocsProp[];

  /**
   * Props that should not be listed in docs "Custom Props" list.
   */
  reservedProps?: string[];

  /**
   * Text for the footer of the component page in Docs Portal.
   */
  footer?: string;
}

export interface PlumePlugin
  extends PlumeCanvasPlugin,
    PlumeCodegenPlugin,
    PlumeEditorPlugin,
    PlumeDocsPlugin {}

const PLUME_REGISTRY = {
  button: ButtonPlugin,
  checkbox: CheckboxPlugin,
  select: SelectPlugin,
  "select-option": SelectOptionPlugin,
  "select-option-group": SelectOptionGroupPlugin,
  menu: MenuPlugin,
  "menu-item": MenuItemPlugin,
  "menu-group": MenuGroupPlugin,
  "menu-button": MenuButtonPlugin,
  switch: SwitchPlugin,
  "text-input": TextInputPlugin,
  "triggered-overlay": TriggeredOverlayPlugin,
} as const;

export type PlumeType = keyof typeof PLUME_REGISTRY;

export function getPlumeCanvasPlugin(component: Component) {
  return getPlumePlugin(component) as PlumeCanvasPlugin | undefined;
}

export function getPlumeCodegenPlugin(component: Component) {
  return getPlumePlugin(component) as PlumeCodegenPlugin | undefined;
}

export function getPlumeEditorPlugin(component: Component) {
  return getPlumePlugin(component) as PlumeEditorPlugin | undefined;
}

export function getPlumeDocsPlugin(component: Component) {
  return getPlumePlugin(component) as PlumeDocsPlugin | undefined;
}

export function getPlumeEditorPluginByType(plumeType: string) {
  return getPlumePluginByType(plumeType) as PlumeEditorPlugin | undefined;
}

function getPlumePlugin(component: Component) {
  if (component.plumeInfo) {
    return getPlumePluginByType(component.plumeInfo.type);
  }
  return undefined;
}

function getPlumePluginByType(type: string) {
  return PLUME_REGISTRY[type] as PlumePlugin | undefined;
}

export function getPlumeVariantDef(component: Component, variant: Variant) {
  if (!variant.parent) {
    return undefined;
  }
  const plugin = getPlumePlugin(component);
  if (!plugin) {
    return undefined;
  }
  const groupName = toVarName(variant.parent.param.variable.name);
  return plugin.componentMeta.variantDefs.find(
    (d) => d.group === groupName && d.variant === toVarName(variant.name)
  );
}

export function getPlumeElementDef(component: Component, node: TplNode) {
  if (!isTplNamable(node)) {
    return undefined;
  }

  const nodeName = node.name
    ? toVarName(node.name)
    : component.tplTree === node
    ? "root"
    : undefined;
  if (!nodeName) {
    return undefined;
  }

  const plugin = getPlumePlugin(component);
  if (!plugin) {
    return undefined;
  }
  return plugin.componentMeta.elementDefs.find((d) => d.name === nodeName);
}

export function getPlumeSlotDef(component: Component, param: Param) {
  if (!isSlot(param)) {
    return undefined;
  }
  const plugin = getPlumePlugin(component);
  if (!plugin) {
    return undefined;
  }
  return plugin.componentMeta.slotDefs.find(
    (d) => d.name === toVarName(param.variable.name)
  );
}
