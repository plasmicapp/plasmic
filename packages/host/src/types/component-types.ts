import { CSSProperties, PlasmicElement } from "../element-types";
import { ChoiceCore, ChoiceValue } from "./choice-type";
import { ArrayTypeBaseCore, ObjectTypeBaseCore } from "./container-types";
import {
  DataPickerValueType,
  DataSourceCore,
  DynamicCore,
  GraphQLCore,
  GraphQLValue,
  RichDataPickerCore,
  RichExprEditorCore,
} from "./misc-types";
import {
  CardPickerCore,
  ClassCore,
  CodeStringCore,
  ColorCore,
  DateRangeStringsCore,
  DateStringCore,
  HrefCore,
  NumberTypeBaseCore,
  PlainNumberCore,
  PlainStringCore,
  RichBooleanCore,
  RichTextCore,
  SliderNumberCore,
  ThemeResetClassCore,
} from "./primitive-types";
import {
  CommonTypeBase,
  ContextDependentConfig,
  ControlExtras,
  Defaultable,
  GenericContext,
  InferDataType,
} from "./shared-controls";

export type ComponentControlContext<P> = GenericContext<
  P, // Full component props
  InferDataType<P> | null, // Canvas data
  ControlExtras
>;

export type ComponentContextConfig<Props, R> = ContextDependentConfig<
  ComponentControlContext<Props>,
  R
>;

export interface PropTypeBase<Ctx extends any[]> extends CommonTypeBase {
  displayName?: string;
  required?: boolean;
  readOnly?: boolean | ContextDependentConfig<Ctx, boolean>;
  /**
   * If set to true, the component will be remounted when the prop value is updated.
   * (This behavior only applies to canvas)
   */
  forceRemount?: boolean;
  /**
   * If true, the prop can't be overriden in different variants.
   */
  invariantable?: boolean;
  /**
   * Function for whether this prop should be hidden in the right panel,
   * given the current props for this component
   */
  hidden?: ContextDependentConfig<Ctx, boolean>;
}

interface ExtendedDefaultable<Ctx extends any[], T>
  extends Defaultable<Ctx, T> {
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
    ...args: Ctx
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

export type PropTypeBaseDefault<P, T> = PropTypeBase<
  ComponentControlContext<P>
> &
  ExtendedDefaultable<ComponentControlContext<P>, T> &
  Controllable;

// String types
export type PlainStringType<P> = PropTypeBaseDefault<P, string> &
  PlainStringCore;
export type CodeStringType<P> = PropTypeBaseDefault<P, string> & CodeStringCore;
export type RichTextType<P> = PropTypeBaseDefault<P, string> & RichTextCore;
export type HrefType<P> = PropTypeBaseDefault<P, string> & HrefCore;
export type ColorType<P> = PropTypeBaseDefault<P, string> & ColorCore;
export type DateStringType<P> = PropTypeBaseDefault<P, string> & DateStringCore;
export type DateRangeStringsType<P> = PropTypeBaseDefault<P, [string, string]> &
  DateRangeStringsCore;
export type ClassType<P> = PropTypeBase<ComponentControlContext<P>> & ClassCore;
export type ThemeResetClassType<P> = PropTypeBase<ComponentControlContext<P>> &
  ThemeResetClassCore;
export type CardPickerType<P> = PropTypeBaseDefault<P, string> &
  CardPickerCore<ComponentControlContext<P>>;

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

// Boolean types
export type RichBooleanType<P> = PropTypeBaseDefault<P, boolean> &
  RichBooleanCore;
export type BooleanType<P> = "boolean" | RichBooleanType<P>;

// GraphQL types
export type GraphQLType<P> = PropTypeBaseDefault<P, GraphQLValue> &
  GraphQLCore<ComponentControlContext<P>>;

// Number types
export type NumberTypeBase<P> = PropTypeBaseDefault<P, number> &
  NumberTypeBaseCore<ComponentControlContext<P>>;
export type PlainNumberType<P> = NumberTypeBase<P> &
  PlainNumberCore<ComponentControlContext<P>>;
export type SliderNumberType<P> = NumberTypeBase<P> &
  SliderNumberCore<ComponentControlContext<P>>;
export type RichNumberType<P> = PlainNumberType<P> | SliderNumberType<P>;
export type NumberType<P> = "number" | RichNumberType<P>;

// Container types
export type ObjectType<P> = PropTypeBaseDefault<P, Record<string, any>> &
  ObjectTypeBaseCore<ComponentControlContext<P>, PropType<P>>;

export type ArrayType<P> = PropTypeBaseDefault<P, any[]> &
  ArrayTypeBaseCore<ComponentControlContext<P>, PropType<P>>;

export type JSONLikeType<P> = "object" | ObjectType<P> | ArrayType<P>;

// Data source types
export type DataSourceType<P> = PropTypeBase<ComponentControlContext<P>> &
  DataSourceCore;

// Data picker types
export type RichDataPickerType<P> = PropTypeBaseDefault<
  P,
  DataPickerValueType
> &
  RichDataPickerCore<ComponentControlContext<P>>;
export type DataPickerType<P> = "dataPicker" | RichDataPickerType<P>;

// Expr editor types
export type RichExprEditorType<P> = PropTypeBaseDefault<
  P,
  DataPickerValueType
> &
  RichExprEditorCore<ComponentControlContext<P>>;
export type ExprEditorType<P> = "exprEditor" | RichExprEditorType<P>;

// Choice types
export type ComponentChoiceType<
  P,
  Opt extends ChoiceValue = ChoiceValue,
  Val = Opt | Opt[]
> = PropTypeBaseDefault<P, Val> & ChoiceCore<ComponentControlContext<P>, Opt>;

export interface SingleChoiceType<P, Opt extends ChoiceValue = ChoiceValue>
  extends ComponentChoiceType<P, Opt, Opt> {
  multiSelect?: false;
}

export interface MultiChoiceType<P, Opt extends ChoiceValue = ChoiceValue>
  extends ComponentChoiceType<P, Opt, Opt[]> {
  multiSelect: true;
}

export interface CustomChoiceType<P>
  extends ComponentChoiceType<P, ChoiceValue, ChoiceValue | ChoiceValue[]> {
  multiSelect: ComponentContextConfig<P, boolean>;
}

export type ChoiceType<P> =
  | SingleChoiceType<P>
  | MultiChoiceType<P>
  | CustomChoiceType<P>;

// Other component-only types from prop-types.ts
export interface FormValidationRulesType<P>
  extends PropTypeBaseDefault<P, any> {
  type: "formValidationRules";
}

export interface EventHandlerType<P>
  extends PropTypeBase<ComponentControlContext<P>> {
  type: "eventHandler";
  argTypes: { name: string; type: ArgType<any> }[];
}

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
  hidden?: ComponentContextConfig<P, boolean>;

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
  mergeWithParent?: boolean | ComponentContextConfig<P, boolean>;

  /**
   * A function that returns true to hide the merged props conditionally.
   */
  hiddenMergedProps?: ComponentContextConfig<P, boolean>;
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

export interface StudioOps {
  showModal: (
    modalProps: Omit<ModalProps, "onClose"> & { onClose?: () => void }
  ) => void;
  refreshQueryData: () => void;
  appendToSlot: (element: PlasmicElement, slotName: string) => void;
  removeFromSlotAt: (pos: number, slotName: string) => void;
  updateProps: (newValues: any) => void;
  updateStates: (newValues: any) => void;
}

export interface ProjectData {
  components: { name: string }[];
  pages: { name: string; pageMeta: { path: string } }[];
}

export interface CustomControlProps<P> {
  componentProps: P;
  /**
   * `contextData` can be `null` if the prop controls are rendering before
   * the component instance itself (it will re-render once the component
   * calls `setControlContextData`)
   */
  contextData: InferDataType<P> | null;
  /**
   * Operations available to the editor that allow modifying the entire component.
   * Can be null if the custom prop is used in a global context.
   */
  studioOps: StudioOps | null;
  /**
   * Metadata from the studio project.
   */
  projectData: ProjectData;
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

export interface DynamicType<P>
  extends PropTypeBase<ComponentControlContext<P>>,
    DynamicCore<ComponentControlContext<P>, PropType<P>> {}

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
  | DynamicType<P>
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
