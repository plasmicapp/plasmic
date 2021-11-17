import {
  CodeComponentElement,
  CSSProperties,
  PlasmicElement,
} from "./element-types";

const root = globalThis as any;

type PropTypeBase = {
  displayName?: string;
  description?: string;
};

type StringType =
  | "string"
  | ({
      type: "string";
      defaultValue?: string;
    } & PropTypeBase);

type BooleanType =
  | "boolean"
  | ({
      type: "boolean";
      defaultValue?: boolean;
    } & PropTypeBase);

type NumberType =
  | "number"
  | ({
      type: "number";
      defaultValue?: number;
    } & PropTypeBase);

type JSONLikeType =
  | "object"
  | ({
      type: "object";
      /**
       * Expects a JSON-compatible value
       */
      defaultValue?: any;
    } & PropTypeBase);

type ChoiceType = {
  type: "choice";
  options: string[];
  defaultValue?: string;
} & PropTypeBase;

type SlotType =
  | "slot"
  | {
      type: "slot";
      /**
       * The unique names of all code components that can be placed in the slot
       */
      allowedComponents?: string[];
      defaultValue?: PlasmicElement | PlasmicElement[];
    };

type ImageUrlType =
  | "imageUrl"
  | ({
      type: "imageUrl";
      defaultValue?: string;
    } & PropTypeBase);

export type PrimitiveType = Extract<
  StringType | BooleanType | NumberType | JSONLikeType,
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

type SupportControlled<T> =
  | Extract<T, String>
  | (Exclude<T, String> & ControlTypeBase);

export type PropType =
  | SupportControlled<
      | StringType
      | BooleanType
      | NumberType
      | JSONLikeType
      | ChoiceType
      | ImageUrlType
    >
  | SlotType;

type RestrictPropType<T> = T extends string
  ? SupportControlled<StringType | ChoiceType | JSONLikeType | ImageUrlType>
  : T extends boolean
  ? SupportControlled<BooleanType | JSONLikeType>
  : T extends number
  ? SupportControlled<NumberType | JSONLikeType>
  : PropType;

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
   * The javascript name to be used when generating code. Optional: if not
   * provided, `meta.name` is used.
   */
  importName?: string;
  /**
   * An object describing the component properties to be used in Studio.
   * For each `prop`, there should be an entry `meta.props[prop]` describing
   * its type.
   */
  props: { [prop in keyof Partial<P>]: RestrictPropType<P[prop]> } & {
    [prop: string]: PropType;
  };
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
