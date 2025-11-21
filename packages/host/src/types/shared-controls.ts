// Generic tuple specialized by code-components and custom-functions
export type GenericContext<Props, Data, Extra = unknown> = [Props, Data, Extra];

/**
 * Config option that takes the context (e.g., props) of the component instance
 * or function to dynamically set its value.
 */
export type ContextDependentConfig<Ctx extends any[], R> = (...args: Ctx) => R;

export type MaybeContextDependentConfig<Ctx extends any[], V> =
  | V
  | ContextDependentConfig<Ctx, V>;

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

export interface CommonTypeBase {
  description?: string;
  helpText?: string;
  /**
   * If true, will hide the prop in a collapsed section; good for props that
   * should not usually be used.
   */
  advanced?: boolean;
  /**
   * If the user has chosen to use a dynamic expression for this prop, provide
   * a hint as to the expected values that the expression should evaluate to.
   * This hint will be displayed alongside the code editor.  You may use
   * markdown in the text here.
   */
  exprHint?: string;
  /**
   * If true, does not allow the user to use a dynamic expression for this prop
   */
  disableDynamicValue?: boolean;
}

export interface Defaultable<Ctx extends any[], T> {
  /**
   * Default value to set for this prop when the component is instantiated
   */
  defaultValue?: T;

  /**
   * Specify that default when no prop/param is provided,
   * so the Plasmic user can see it in the studio UI
   */
  defaultValueHint?: T | ContextDependentConfig<Ctx, T | undefined>;
}
