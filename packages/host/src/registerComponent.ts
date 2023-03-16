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
export type ContextDependentConfig<P, R> = (
  props: P,
  /**
   * `contextData` can be `null` if the prop controls are rendering before
   * the component instance itself (it will re-render once the component
   * calls `setControlContextData`)
   */
  contextData: InferDataType<P> | null
) => R;

export interface PropTypeBase<P> {
  displayName?: string;
  description?: string;
  helpText?: string;
  /**
   * If the user has chosen to use a dynamic expression for this prop, provide
   * a hint as to the expected values that the expression should evaluate to.
   * This hint will be displayed alongside the code editor.  You may use
   * markdown in the text here.
   */
  exprHint?: string;
  hidden?: ContextDependentConfig<P, boolean>;
  readOnly?: boolean | ContextDependentConfig<P, boolean>;
  advanced?: boolean;
  disableDynamicValue?: boolean;
}

export type DefaultValueOrExpr<P, T> =
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
          type: "richText";
        }
      | {
          type: "color";
          /**
           * If specified, and the user picks a color token in the Studio, then
           * the value passed in as prop is a css variable reference, like
           * `var(--TOKEN_ID)`, instead of the resolved hex value of the token.
           * You should take care in using this in the proper css context --
           * the css token is only defined if you are rendering under some
           * Plasmic component in the DOM tree, which is usually the case,
           * unless you are using a React portal.
           */
          keepCssVar?: boolean;
        }
      | {
          type: "class";
          /**
           * Additional css selectors that can change how this style should look.
           * Some examples:
           *
           * * `:hover` -- on hover
           * * `[data-something="blah"] -- when the element with this class has
           *   an html attribute "data-something=blah"
           * * :component[data-something="blah"] :self -- when the root of the
           *   component has an html attribute "data-something=blah". Note that
           *   the non-standard `:component` selector is used to select the
           *   component root, and the non-standard `:self` selector is used
           *   to select the element that this class is attached to.
           */
          selectors?: {
            /**
             * A css selector, like `:hover` or `[data-something="blah"]`.
             */
            selector: string;
            /**
             * An optional human-friendly label for the selector, so the studio user
             * knows what this selector means.
             */
            label?: string;
          }[];
          /**
           * If specified, then only shows these style sections for styling this class
           */
          styleSections?: StyleSection[];
        }
      | {
          type: "themeResetClass";
          /**
           * Normally, theme reset class will only target Plasmic-generated tags
           * with the default tag styles. If you also want to target non-Plasmic-generated
           * tags (say, rendered by your code components, or fetched as an HTML blob
           * from somewhere), then specify `true` here.
           */
          targetAllTags?: boolean;
        }
      | {
          type: "cardPicker";
          modalTitle?:
            | React.ReactNode
            | ContextDependentConfig<P, React.ReactNode>;
          options:
            | {
                value: string;
                label?: string;
                imgUrl: string;
                footer?: React.ReactNode;
              }[]
            | ContextDependentConfig<
                P,
                {
                  value: string;
                  label?: string;
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
    ) &
      StringTypeBase<P>);

export type BooleanType<P> =
  | "boolean"
  | ({
      type: "boolean";
    } & DefaultValueOrExpr<P, boolean> &
      PropTypeBase<P>);

type GraphQLValue = {
  query: string;
  variables?: Record<string, any>;
};

export type GraphQLType<P> = {
  type: "code";
  lang: "graphql";
  endpoint: string | ContextDependentConfig<P, string>;
  method?: string | ContextDependentConfig<P, string>;
  headers?: object | ContextDependentConfig<P, object>;
} & DefaultValueOrExpr<P, GraphQLValue> &
  PropTypeBase<P>;

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
      fields?: {
        [p: string]: PropType<P>;
      };
      /**
       * Optional function that generates a name for this item in the array
       */
      nameFunc?: (item: any) => string | undefined;
    } & DefaultValueOrExpr<P, any> &
      PropTypeBase<P>)
  | ({
      type: "array";
      itemType?: {
        type: "object";
        fields: {
          [p: string]: PropType<P>;
        };
        /**
         * Optional function that generates a name for this item in the array
         */
        nameFunc?: (item: any) => string | undefined;
      };
    } & DefaultValueOrExpr<P, any[]> &
      PropTypeBase<P>)
  | ({
      type: "dataSource";
      dataSource: "airtable" | "cms";
    } & PropTypeBase<P>);

type DataPickerValueType = string | number | (string | number)[];

export type DataPickerType<P> =
  | ({
      type: "dataSelector";
      data:
        | Record<string, any>
        | ContextDependentConfig<P, Record<string, any>>;
      alwaysShowValuePathAsLabel?: boolean;
    } & DefaultValueOrExpr<P, DataPickerValueType> &
      PropTypeBase<P>)
  | ({
      type: "exprEditor";
      data:
        | Record<string, any>
        | ContextDependentConfig<P, Record<string, any>>;
    } & DefaultValueOrExpr<P, DataPickerValueType> &
      PropTypeBase<P>);

export type EventHandlerType<P> = {
  type: "eventHandler";
  argTypes: { name: string; type: PropType<any> }[];
} & DefaultValueOrExpr<P, (...args: any) => any> &
  PropTypeBase<P>;

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
  | ({
      multiSelect: ContextDependentConfig<P, boolean>;
    } & DefaultValueOrExpr<
      P,
      string | number | boolean | (string | number | boolean)[]
    >)
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

  /**
   * The document that the component will be rendered into; instead of using
   * `document` directly (for, say, `document.querySelector()` etc.), you
   * should use this instead.
   */
  studioDocument: typeof document;
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

      /**
       * If slot is a render prop (accepts a function that takes in some
       * arguments and returns some JSX), then specify the names of the
       * arguments expected by the render prop function.
       */
      renderPropParams?: string[];
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
      | GraphQLType<P>
      | DataPickerType<P>
      | EventHandlerType<P>
    >
  | SlotType<P>;

type RestrictPropType<T, P> = T extends string
  ? SupportControlled<
      | StringType<P>
      | ChoiceType<P>
      | JSONLikeType<P>
      | ImageUrlType<P>
      | CustomType<P>
      | DataPickerType<P>
    >
  : T extends boolean
  ? SupportControlled<
      BooleanType<P> | JSONLikeType<P> | CustomType<P> | DataPickerType<P>
    >
  : T extends number
  ? SupportControlled<
      NumberType<P> | JSONLikeType<P> | CustomType<P> | DataPickerType<P>
    >
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
    updateProps: (newValues: any) => void;
  };
  /**
   * The document that the component will be rendered into; instead of using
   * `document` directly (for, say, `document.querySelector()` etc.), you
   * should use this instead.
   */
  studioDocument: typeof document;
}

export type Action<P> =
  | {
      type: "button-action";
      label: string;
      onClick: (props: ActionProps<P>) => void;
    }
  | {
      type: "custom-action";
      control: React.ComponentType<ActionProps<P>>;
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

export type StateSpec = {
  onChangeProp: string;
} & (
  | {
      type: "readonly";
      variableType: "text";
      initVal?: string;
    }
  | {
      type: "readonly";
      variableType: "number";
      initVal?: number;
    }
  | {
      type: "readonly";
      variableType: "boolean";
      initVal?: boolean;
    }
  | {
      type: "readonly";
      variableType: "array";
      initVal?: any[];
    }
  | {
      type: "readonly";
      variableType: "object";
      initVal?: object;
    }
  | {
      type: "writable";
      variableType: "text" | "number" | "boolean" | "array" | "object";
      valueProp: string;
    }
);

export interface StateHelpers<P, T> {
  initFunc?: ($props: P) => T;
  onChangeArgsToValue?: (...args: any) => T;
}

export type ComponentHelpers<P> = {
  states: Record<string, StateHelpers<P, any>>;
};

export type ExternalComponentHelpers<P> = {
  helpers: ComponentHelpers<P>;
  importPath: string;
} & (
  | {
      importName: string;
    }
  | {
      isDefaultExport: true;
    }
);

export type StyleSection =
  | "visibility"
  | "typography"
  | "sizing"
  | "spacing"
  | "background"
  | "transform"
  | "transitions"
  | "layout"
  | "overflow"
  | "border"
  | "shadows"
  | "effects";

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
   * An object describing the component states to be used in Studio.
   */
  states?: Record<string, StateSpec>;
  /**
   * An object describing the components helpers to be used in Studio.
   *   1. states helpers: Each state can receive an "initFunc" prop to initialize
   *      the implicit state in Studio, and an "onChangeArgsToValue" prop to
   *      transform the event handler arguments into a value
   */
  componentHelpers?: ExternalComponentHelpers<P>;
  /**
   * An array describing the component actions to be used in Studio.
   */
  actions?: Action<P>[];
  /**
   * Whether style sections should be shown in Studio. For styles to work, the
   * component must accept a `className` prop. If unset, defaults to all styles.
   * Set to `false` if this component cannot be styled (for example, if it doesn't
   * render any DOM elements).
   */
  styleSections?: StyleSection[] | boolean;
  /**
   * Whether the element can be repeated in Studio. If unset, defaults to true.
   */
  isRepeatable?: boolean;
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

  /**
   * If specified, then Figma components with the specified names will be mapped
   * to this component when you paste Figma content into Plasmic
   */
  figmaMappings?: {
    figmaComponentName: string;
  }[];

  /**
   * If true, when an instance of this component is added, the element
   * will always be named by the name of this component.
   */
  alwaysAutoName?: boolean;

  unstable__refActions?: Record<string, RefActionRegistration<P>>;
}

export interface FunctionParam<P> {
  name: string;
  displayName?: string;
  type: PropType<P>;
}

export interface RefActionRegistration<P> {
  displayName?: string;
  description?: string;
  parameters: FunctionParam<P>[];
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
  // Check for duplicates
  if (
    root.__PlasmicComponentRegistry.some(
      (r: ComponentRegistration) =>
        r.component === component && r.meta.name === meta.name
    )
  ) {
    return;
  }
  root.__PlasmicComponentRegistry.push({ component, meta });
}
