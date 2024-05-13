import { CSSProperties, PlasmicElement } from "./element-types";
import { StyleSection } from "./registerComponent";

export interface CanvasComponentProps<Data = any> {
  /**
   * This prop is only provided within the canvas of Plasmic Studio.
   * Allows the component to set data to be consumed by the props' controls.
   */
  setControlContextData?: (data: Data) => void;
}

export type ControlExtras = {
  path: (string | number)[];
  item?: any;
};

export type InferDataType<P> = P extends CanvasComponentProps<infer Data>
  ? Data
  : any;

/**
 * Context that we pass back to control functions.
 */
export type ControlContext<P> = [
  /**
   * props
   */
  P,
  /**
   * `contextData` can be `null` if the prop controls are rendering before
   * the component instance itself (it will re-render once the component
   * calls `setControlContextData`)
   */
  InferDataType<P> | null,
  /**
   * Extra information for the control to use
   */
  ControlExtras
];

/**
 * Config option that takes the context (e.g., props) of the component instance
 * to dynamically set its value.
 */
export type ContextDependentConfig<P, R> = (...args: ControlContext<P>) => R;

export interface PropTypeBase<P> {
  displayName?: string;
  description?: string;
  helpText?: string;
  required?: boolean;
  /**
   * If the user has chosen to use a dynamic expression for this prop, provide
   * a hint as to the expected values that the expression should evaluate to.
   * This hint will be displayed alongside the code editor.  You may use
   * markdown in the text here.
   */
  exprHint?: string;
  /**
   * Function for whether this prop should be hidden in the right panel,
   * given the current props for this component
   */
  hidden?: ContextDependentConfig<P, boolean>;
  readOnly?: boolean | ContextDependentConfig<P, boolean>;
  /**
   * If true, will hide the prop in a collapsed section; good for props that
   * should not usually be used.
   */
  advanced?: boolean;
  /**
   * If true, does not allow the user to use a dynamic expression for this prop
   */
  disableDynamicValue?: boolean;
  /**
   * If set to true, the component will be remounted when the prop value is updated.
   * (This behavior only applies to canvas)
   */
  forceRemount?: boolean;
  /**
   * If true, the prop can't be overriden in different variants.
   */
  invariantable?: boolean;
}

export interface Defaultable<P, T> {
  /**
   * Default value to set for this prop when the component is instantiated
   */
  defaultValue?: T;

  /**
   * If no prop is given, the component uses a default; specify what
   * that default is so the Plasmic user can see it in the studio UI
   */
  defaultValueHint?: T | ContextDependentConfig<P, T | undefined>;

  /**
   * Use a dynamic value expression as the default instead
   */
  defaultExpr?: string;
  defaultExprHint?: string;

  /**
   * This function validates whether the prop value is valid.
   * If the value is invalid, it returns an error message. Otherwise, it returns true.
   */
  validator?: (
    value: T,
    ...args: ControlContext<P>
  ) => (string | true) | Promise<string | true>;
}

export interface Controllable {
  /**
   * If true, this is a prop that should only be used inside Plasmic
   * Studio for rendering artboards; will not be actually used in
   * generated code.
   */
  editOnly?: boolean;
  /**
   * If specified, the value used for this prop will instead be
   * mapped to the uncontrolledProp when generating code. This is
   * useful if, for example, in the artboard, you want to use `value`
   * prop to control the component, but in generated code, you want to
   * map it to `defaultValue`.
   */
  uncontrolledProp?: string;
}

export interface PropTypeBaseDefault<P, T>
  extends PropTypeBase<P>,
    Defaultable<P, T>,
    Controllable {}

export interface PlainStringType<P> extends PropTypeBaseDefault<P, string> {
  type: "string";
  control?: "default" | "large";
  isLocalizable?: boolean;
}

export interface CodeStringType<P> extends PropTypeBaseDefault<P, string> {
  type: "code";
  lang: "css" | "html" | "javascript" | "json";
}

export interface RichTextType<P> extends PropTypeBaseDefault<P, string> {
  type: "richText";
}

export interface HrefType<P> extends PropTypeBaseDefault<P, string> {
  type: "href";
}

export interface ColorType<P> extends PropTypeBaseDefault<P, string> {
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
  /**
   * Prevent tokens from being selected.
   */
  disableTokens?: boolean;
}

export interface DateStringType<P> extends PropTypeBaseDefault<P, string> {
  type: "dateString";
}
export interface DateRangeStringsType<P>
  extends PropTypeBaseDefault<P, [string, string]> {
  type: "dateRangeStrings";
}

export interface ClassType<P> extends PropTypeBase<P> {
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
    /**
     * Initial styles to be applied for this selector
     */
    defaultStyles?: CSSProperties;
  }[];
  /**
   * If specified, then only shows these style sections for styling this class
   */
  styleSections?: StyleSection[];
  /**
   * Initial styles to be applied for this class
   */
  defaultStyles?: CSSProperties;
}

export interface ThemeResetClassType<P> extends PropTypeBase<P> {
  type: "themeResetClass";
  /**
   * Normally, theme reset class will only target Plasmic-generated tags
   * with the default tag styles. If you also want to target non-Plasmic-generated
   * tags (say, rendered by your code components, or fetched as an HTML blob
   * from somewhere), then specify `true` here.
   */
  targetAllTags?: boolean;
}

export interface CardPickerType<P> extends PropTypeBaseDefault<P, string> {
  type: "cardPicker";
  modalTitle?: React.ReactNode | ContextDependentConfig<P, React.ReactNode>;
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
  onSearch?: ContextDependentConfig<P, ((value: string) => void) | undefined>;
}

export type RichStringType<P> =
  | PlainStringType<P>
  | CodeStringType<P>
  | RichTextType<P>
  | ColorType<P>
  | ClassType<P>
  | ThemeResetClassType<P>
  | CardPickerType<P>
  | HrefType<P>;

export type StringType<P> = "string" | "href" | RichStringType<P>;

export interface RichBooleanType<P> extends PropTypeBaseDefault<P, boolean> {
  type: "boolean";
}

export type BooleanType<P> = "boolean" | RichBooleanType<P>;

export type GraphQLValue = {
  query: string;
  variables?: Record<string, any>;
};

export interface GraphQLType<P> extends PropTypeBaseDefault<P, GraphQLValue> {
  type: "code";
  lang: "graphql";
  endpoint: string | ContextDependentConfig<P, string>;
  method?: string | ContextDependentConfig<P, string>;
  headers?: object | ContextDependentConfig<P, object>;
}

export interface NumberTypeBase<P> extends PropTypeBaseDefault<P, number> {
  type: "number";
  min?: number | ContextDependentConfig<P, number>;
  max?: number | ContextDependentConfig<P, number>;
}

export interface PlainNumberType<P> extends NumberTypeBase<P> {
  control?: "default";
}

export interface SliderNumberType<P> extends NumberTypeBase<P> {
  control: "slider";
  step?: number | ContextDependentConfig<P, number>;
}

export type RichNumberType<P> = PlainNumberType<P> | SliderNumberType<P>;
export type NumberType<P> = "number" | RichNumberType<P>;

export interface ObjectType<P>
  extends PropTypeBaseDefault<P, Record<string, any>> {
  type: "object";
  fields?: Record<string, PropType<P>>;
  nameFunc?: (item: any, ...args: ControlContext<P>) => string | undefined;
}

export interface ArrayType<P> extends PropTypeBaseDefault<P, any[]> {
  type: "array";
  itemType?: ObjectType<P>;
  /**
   * Optional function that determines whether the user can delete a given item.
   */
  unstable__canDelete?: (item: any, ...args: ControlContext<P>) => boolean;
  /**
   * Specify how to let Plasmic know how to update its own internal representation of the data when the value has
   * changed, or when issuing a minimalValue or shownValue that is different.
   *
   * Important to specify this if you are expecting any nested expression values in this data type!
   */
  unstable__keyFunc?: (item: any) => any;
  /**
   * Specify what would be the tentative new value that is set if the user makes any changes.
   *
   * Useful for field mappings.
   *
   * For instance, consider a Table where we have a `fields` prop:
   *
   * - Initially, the value is undefined. But if the user makes any changes, we would want to save an array of at
   *   least three items (corresponding to, say, three columns inferred from a schema).
   *
   * - Let's say there are 5 columns in the value. The data schema changes, removing a column and adding two new
   *   ones. Now we would want a different minimal value, containing 6 items.
   */
  unstable__minimalValue?: ContextDependentConfig<P, any>;
}

export type JSONLikeType<P> = "object" | ObjectType<P> | ArrayType<P>;

export interface DataSourceType<P> extends PropTypeBase<P> {
  type: "dataSource";
  dataSource: "airtable" | "cms";
}

export type DataPickerValueType = string | number | (string | number)[];
export interface RichDataPickerType<P>
  extends PropTypeBaseDefault<P, DataPickerValueType> {
  type: "dataSelector";
  data?: Record<string, any> | ContextDependentConfig<P, Record<string, any>>;
  alwaysShowValuePathAsLabel?: boolean;
  isolateEnv?: boolean;
}
export type DataPickerType<P> = "dataPicker" | RichDataPickerType<P>;

export interface RichExprEditorType<P>
  extends PropTypeBaseDefault<P, DataPickerValueType> {
  type: "exprEditor";
  data?: Record<string, any> | ContextDependentConfig<P, Record<string, any>>;
  isolateEnv?: boolean;
}
export type ExprEditorType<P> = "exprEditor" | RichExprEditorType<P>;

export interface FormValidationRulesType<P>
  extends PropTypeBaseDefault<P, any> {
  type: "formValidationRules";
}

export interface EventHandlerType<P> extends PropTypeBase<P> {
  type: "eventHandler";
  argTypes: { name: string; type: ArgType<any> }[];
}

export interface ChoiceTypeBase<P, T> extends PropTypeBaseDefault<P, T> {
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

export interface SingleChoiceType<P>
  extends ChoiceTypeBase<P, string | number | boolean> {
  multiSelect?: false;
}

export interface MultiChoiceType<P>
  extends ChoiceTypeBase<P, (string | number | boolean)[]> {
  multiSelect: true;
}

export interface CustomChoiceType<P>
  extends ChoiceTypeBase<
    P,
    string | number | boolean | (string | number | boolean)[]
  > {
  multiSelect: ContextDependentConfig<P, boolean>;
}

export type ChoiceType<P> =
  | SingleChoiceType<P>
  | MultiChoiceType<P>
  | CustomChoiceType<P>;

export interface RichSlotType<P> {
  type: "slot";
  description?: string;

  /**
   * The unique names of all code components that can be placed in the slot
   */
  allowedComponents?: string[];
  /**
   * Wheter Plasmic Components with a root component included in the
   * "allowedComponents" list are valid or not.
   * Only used if the "allowedComponents" list is set.
   */
  allowRootWrapper?: boolean;
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
   * A nicer, human-readable display name for your slot prop
   */
  displayName?: string;

  /**
   * Function for whether this slot should be hidden from the left tree,
   * given the current props for this component
   */
  hidden?: ContextDependentConfig<P, boolean>;

  /**
   * If slot is a render prop (accepts a function that takes in some
   * arguments and returns some JSX), then specify the names of the
   * arguments expected by the render prop function.
   */
  renderPropParams?: string[];

  /**
   * When inserting top-level "page sections", should this slot be the default target?
   */
  unstable__isMainContentSlot?: boolean;

  defaultValue?: PlasmicElement | PlasmicElement[];

  /**
   * When true, when you click for the first time in this slot and the component was not selected, the component itself
   * is selected, making it easier to select the component instead of slot contents. So for
   * instance, setting this on a Button slot ensures that clicking on the Button’s text will still select the Button and not
   * the text element in its slot. Clicking again will deep-select the slot content. Similar in this regard to trapsFocus on components.
   *
   * Furthermore, the component further shows the props of whatever is in the slot on
   *  the parent component for the user's convenience. Handy for various “wrapper" components, form fields, and so on.
   */
  mergeWithParent?: boolean | ContextDependentConfig<P, boolean>;

  /**
   * A function that returns true to hide the merged props conditionally.
   */
  hiddenMergedProps?: ContextDependentConfig<P, boolean>;
}

export type SlotType<P> = "slot" | RichSlotType<P>;

export interface RichImageUrlType<P> extends PropTypeBaseDefault<P, string> {
  type: "imageUrl";
}

export type ImageUrlType<P> = "imageUrl" | RichImageUrlType<P>;

export interface ModalProps {
  show?: boolean;
  children?: React.ReactNode;
  onClose: () => void;
  style?: CSSProperties;
}
export interface CustomControlProps<P> {
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

export interface RichCustomType<P> extends PropTypeBaseDefault<P, any> {
  type: "custom";
  control: CustomControl<P>;
}

export type CustomType<P> = RichCustomType<P> | CustomControl<P>;

export type PrimitiveType<P = any> = Extract<
  StringType<P> | BooleanType<P> | NumberType<P> | JSONLikeType<P>,
  string
>;

export type PropType<P> =
  | StringType<P>
  | BooleanType<P>
  | GraphQLType<P>
  | NumberType<P>
  | JSONLikeType<P>
  | DataSourceType<P>
  | DataPickerType<P>
  | ExprEditorType<P>
  | FormValidationRulesType<P>
  | EventHandlerType<P>
  | ChoiceType<P>
  | CustomType<P>
  | ImageUrlType<P>
  | SlotType<P>
  | DateStringType<P>
  | DateRangeStringsType<P>;

export type ArgType<P> = Exclude<
  PropType<P>,
  SlotType<P> | EventHandlerType<P>
>;

export type StringCompatType<P> =
  | DateStringType<P>
  | StringType<P>
  | ChoiceType<P>
  | JSONLikeType<P>
  | ImageUrlType<P>
  | CustomType<P>
  | DataPickerType<P>;
export type BoolCompatType<P> =
  | BooleanType<P>
  | CustomType<P>
  | DataPickerType<P>;
export type NumberCompatType<P> =
  | NumberType<P>
  | CustomType<P>
  | DataPickerType<P>;

export type RestrictPropType<T, P> = T extends string
  ? StringCompatType<P>
  : T extends boolean
  ? BoolCompatType<P>
  : T extends number
  ? NumberCompatType<P>
  : PropType<P>;
