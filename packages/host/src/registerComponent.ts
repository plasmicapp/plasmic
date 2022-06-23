import {
  CodeComponentElement,
  CSSProperties,
  PlasmicElement,
} from "./element-types";

const root = globalThis as any;

export interface CanvasComponentProps<Data = any> {
  /**
   * This prop is only provided within the canvas of Plasmic Studio.
   * Allows the component to set data to be consumed by the props' controls.
   */
  setControlContextData?: (data: Data) => void;
}

type InferDataType<P> = P extends CanvasComponentProps<infer Data> ? Data : any;

/**
 * Config option that takes the context (e.g., props) of the component instance
 * to dynamically set its value.
 */
type ContextDependentConfig<P, R> = (
  props: P,
  /**
   * `contextData` can be `null` if the prop controls are rendering before
   * the component instance itself (it will re-render once the component
   * calls `setControlContextData`)
   */
  contextData: InferDataType<P> | null
) => R;

interface PropTypeBase<P> {
  displayName?: string;
  description?: string;
  hidden?: ContextDependentConfig<P, boolean>;
  readOnly?: boolean | ContextDependentConfig<P, boolean>;
}

type DefaultValueOrExpr<P, T> =
  | {
      defaultExpr?: undefined;
      defaultExprHint?: undefined;
      defaultValue?: T;
      defaultValueHint?: T | ContextDependentConfig<P, T | undefined>;
    }
  | {
      defaultValue?: undefined;
      defaultValueHint?: undefined;
      defaultExpr?: string;
      defaultExprHint?: string;
    };

type StringTypeBase<P> = PropTypeBase<P> & DefaultValueOrExpr<P, string>;

export type StringType<P> =
  | "string"
  | ((
      | {
          type: "string";
          control?: "default" | "large";
        }
      | {
          type: "code";
          lang: "css" | "html" | "javascript" | "json";
        }
      | {
          type: "cardPicker";
          modalTitle?: string | ContextDependentConfig<P, string>;
          cards:
            | {
                value: string;
                imgUrl: string;
                footer?: React.ReactNode;
              }[]
            | ContextDependentConfig<
                P,
                {
                  value: string;
                  imgUrl: string;
                  footer?: React.ReactNode;
                }[]
              >;
          showInput?: boolean | ContextDependentConfig<P, boolean>;
          onSearch?: ContextDependentConfig<
            P,
            ((value: string) => void) | undefined
          >;
        }
      | {
          type: "code";
          lang: "graphql";
          endpoint: string | ContextDependentConfig<P, string>;
          method?: string | ContextDependentConfig<P, string>;
          headers?: object | ContextDependentConfig<P, object>;
          variables?: object | ContextDependentConfig<P, object>;
        }
    ) &
      StringTypeBase<P>);

export type BooleanType<P> =
  | "boolean"
  | ({
      type: "boolean";
    } & DefaultValueOrExpr<P, boolean> &
      PropTypeBase<P>);

type NumberTypeBase<P> = PropTypeBase<P> &
  DefaultValueOrExpr<P, number> & {
    type: "number";
  };

export type NumberType<P> =
  | "number"
  | ((
      | {
          control?: "default";
          min?: number | ContextDependentConfig<P, number>;
          max?: number | ContextDependentConfig<P, number>;
        }
      | {
          control: "slider";
          min: number | ContextDependentConfig<P, number>;
          max: number | ContextDependentConfig<P, number>;
          step?: number | ContextDependentConfig<P, number>;
        }
    ) &
      NumberTypeBase<P>);

/**
 * Expects defaultValue to be a JSON-compatible value
 */
export type JSONLikeType<P> =
  | "object"
  | ({
      type: "object";
    } & DefaultValueOrExpr<P, any> &
      PropTypeBase<P>)
  | ({
      type: "array";
    } & DefaultValueOrExpr<P, any[]> &
      PropTypeBase<P>)
  | ({
      type: "dataSource";
      dataSource: "airtable" | "cms";
    } & PropTypeBase<P>)
  | ({
      type: "dataSelector";
      data:
        | Record<string, any>
        | ContextDependentConfig<P, Record<string, any>>;
    } & DefaultValueOrExpr<P, Record<string, any>> &
      PropTypeBase<P>);

interface ChoiceTypeBase<P> extends PropTypeBase<P> {
  type: "choice";
  options:
    | string[]
    | {
        label: string;
        value: string | number | boolean;
      }[]
    | ContextDependentConfig<
        P,
        | string[]
        | {
            label: string;
            value: string | number | boolean;
          }[]
      >;
  allowSearch?: boolean;
  filterOption?: boolean;
  onSearch?: ContextDependentConfig<P, ((value: string) => void) | undefined>;
}

export type ChoiceType<P> = (
  | ({
      multiSelect?: false;
    } & DefaultValueOrExpr<P, string | number | boolean>)
  | ({
      multiSelect: true;
    } & DefaultValueOrExpr<P, (string | number | boolean)[]>)
) &
  ChoiceTypeBase<P>;

export interface ModalProps {
  show?: boolean;
  children?: React.ReactNode;
  onClose: () => void;
  style?: CSSProperties;
}

interface CustomControlProps<P> {
  componentProps: P;
  /**
   * `contextData` can be `null` if the prop controls are rendering before
   * the component instance itself (it will re-render once the component
   * calls `setControlContextData`)
   */
  contextData: InferDataType<P> | null;
  value: any;
  /**
   * Sets the value to be passed to the prop. Expects a JSON-compatible value.
   */
  updateValue: (newVal: any) => void;
  /**
   * Full screen modal component
   */
  FullscreenModal: React.ComponentType<ModalProps>;
  /**
   * Modal component for the side pane
   */
  SideModal: React.ComponentType<ModalProps>;
}
export type CustomControl<P> = React.ComponentType<CustomControlProps<P>>;

/**
 * Expects defaultValue to be a JSON-compatible value
 */
export type CustomType<P> =
  | CustomControl<P>
  | ({
      type: "custom";
      control: CustomControl<P>;
    } & PropTypeBase<P> &
      DefaultValueOrExpr<P, any>);

type SlotType<P> =
  | "slot"
  | ({
      type: "slot";
      /**
       * The unique names of all code components that can be placed in the slot
       */
      allowedComponents?: string[];
      /**
       * Whether the "empty slot" placeholder should be hidden in the canvas.
       */
      hidePlaceholder?: boolean;
      /**
       * Whether the slot is repeated, i.e., is rendered multiple times using
       * repeatedElement().
       */
      isRepeated?: boolean;
    } & Omit<
      DefaultValueOrExpr<P, PlasmicElement | PlasmicElement[]>,
      "defaultValueHint" | "defaultExpr" | "defaultExprHint"
    >);

type ImageUrlType<P> =
  | "imageUrl"
  | ({
      type: "imageUrl";
    } & DefaultValueOrExpr<P, string> &
      PropTypeBase<P>);

export type PrimitiveType<P = any> = Extract<
  StringType<P> | BooleanType<P> | NumberType<P> | JSONLikeType<P>,
  String
>;

type ControlTypeBase =
  | {
      editOnly?: false;
    }
  | {
      editOnly: true;
      /**
       * The prop where the values should be mapped to
       */
      uncontrolledProp?: string;
    };

export type SupportControlled<T> =
  | Extract<T, String | CustomControl<any>>
  | (Exclude<T, String | CustomControl<any>> & ControlTypeBase);

export type PropType<P> =
  | SupportControlled<
      | StringType<P>
      | BooleanType<P>
      | NumberType<P>
      | JSONLikeType<P>
      | ChoiceType<P>
      | ImageUrlType<P>
      | CustomType<P>
    >
  | SlotType<P>;

type RestrictPropType<T, P> = T extends string
  ? SupportControlled<
      | StringType<P>
      | ChoiceType<P>
      | JSONLikeType<P>
      | ImageUrlType<P>
      | CustomType<P>
    >
  : T extends boolean
  ? SupportControlled<BooleanType<P> | JSONLikeType<P> | CustomType<P>>
  : T extends number
  ? SupportControlled<NumberType<P> | JSONLikeType<P> | CustomType<P>>
  : PropType<P>;

export interface ActionProps<P> {
  componentProps: P;
  /**
   * `contextData` can be `null` if the prop controls are rendering before
   * the component instance itself (it will re-render once the component
   * calls `setControlContextData`)
   */
  contextData: InferDataType<P> | null;
  studioOps: {
    showModal: (
      modalProps: Omit<ModalProps, "onClose"> & { onClose?: () => void }
    ) => void;
    refreshQueryData: () => void;
    appendToSlot: (element: PlasmicElement, slotName: string) => void;
    removeFromSlotAt: (pos: number, slotName: string) => void;
  };
}

export type Action<P> =
  | {
      type: "button-action";
      label: string;
      onClick: (props: ActionProps<P>) => void;
    }
  | {
      type: "custom-action";
      comp: React.ComponentType<ActionProps<P>>;
    };

type DistributedKeyOf<T> = T extends any ? keyof T : never;

interface ComponentTemplate<P>
  extends Omit<CodeComponentElement<P>, "type" | "name"> {
  /**
   * A preview picture for the template.
   */
  previewImg?: string;
}

export interface ComponentTemplates<P> {
  [name: string]: ComponentTemplate<P>;
}

export interface ComponentMeta<P> {
  /**
   * Any unique string name used to identify that component. Each component
   * should be registered with a different `meta.name`, even if they have the
   * same name in the code.
   */
  name: string;
  /**
   * The name to be displayed for the component in Studio. Optional: if not
   * specified, `meta.name` is used.
   */
  displayName?: string;
  /**
   * The description of the component to be shown in Studio.
   */
  description?: string;
  /**
   * The javascript name to be used when generating code. Optional: if not
   * provided, `meta.name` is used.
   */
  importName?: string;
  /**
   * An object describing the component properties to be used in Studio.
   * For each `prop`, there should be an entry `meta.props[prop]` describing
   * its type.
   */
  props: { [prop in DistributedKeyOf<P>]?: RestrictPropType<P[prop], P> } & {
    [prop: string]: PropType<P>;
  };
  /**
   * An array describing the component actions to be used in Studio.
   */
  actions?: Action<P>[];
  /**
   * The path to be used when importing the component in the generated code.
   * It can be the name of the package that contains the component, or the path
   * to the file in the project (relative to the root directory).
   */
  importPath: string;
  /**
   *  Whether the component is the default export from that path. Optional: if
   * not specified, it's considered `false`.
   */
  isDefaultExport?: boolean;
  /**
   * The prop that expects the CSS classes with styles to be applied to the
   * component. Optional: if not specified, Plasmic will expect it to be
   * `className`. Notice that if the component does not accept CSS classes, the
   * component will not be able to receive styles from the Studio.
   */
  classNameProp?: string;
  /**
   * The prop that receives and forwards a React `ref`. Plasmic only uses `ref`
   * to interact with components, so it's not used in the generated code.
   * Optional: If not provided, the usual `ref` is used.
   */
  refProp?: string;
  /**
   * Default styles to start with when instantiating the component in Plasmic.
   */
  defaultStyles?: CSSProperties;
  /**
   * Component templates to start with on Plasmic.
   */
  templates?: ComponentTemplates<P>;
  /**
   * Registered name of parent component, used for grouping related components.
   */
  parentComponentName?: string;
  /**
   * Whether the component can be used as an attachment to an element.
   */
  isAttachment?: boolean;
  /**
   * Whether the component provides data to its slots using DataProvider.
   */
  providesData?: boolean;
}

export interface ComponentRegistration {
  component: React.ComponentType<any>;
  meta: ComponentMeta<any>;
}

declare global {
  interface Window {
    __PlasmicComponentRegistry: ComponentRegistration[];
  }
}

if (root.__PlasmicComponentRegistry == null) {
  root.__PlasmicComponentRegistry = [];
}

export default function registerComponent<T extends React.ComponentType<any>>(
  component: T,
  meta: ComponentMeta<React.ComponentProps<T>>
) {
  root.__PlasmicComponentRegistry.push({ component, meta });
}
