const root = globalThis as any;

import { HandleParams, HandleReturnType } from "./types/function-types";
export type * from "./types/function-types";

export interface CustomFunctionMeta<F extends (...args: any[]) => any> {
  /**
   * The javascript name of the function. Notice it must be unique across all
   * other functions and function namespaces. If two functions have the same
   * name, they should be registered with different `meta.namespace`.
   */
  name: string;
  /**
   * A namespace for organizing groups of functions. It's also used to handle
   * function name collisions. If a function has a namespace, it will be used
   * whenever accessing the function.
   */
  namespace?: string;
  /**
   * A display name for the function. It will be shown only in studio.
   */
  displayName?: string;
  /**
   * Documentation for the registered function.
   */
  description?: string;
  /**
   * An array containing the list of parameters names the function takes.
   * Optionally they can also be registered with the expected param types.
   */
  params?: HandleParams<Parameters<F>>;
  /**
   * Return value information.
   */
  returnValue?: {
    /**
     * The function return type.
     */
    type?: HandleReturnType<Parameters<F>, ReturnType<F>>;
    /**
     * The function return value description.
     */
    description?: string;
  };
  /**
   * Typescript function declaration. If specified, it ignores the types
   * provided by `params` and `returnValue`.
   */
  typescriptDeclaration?: string;

  /**
   * Whether this function can be used as a query in the editor.
   */
  isQuery?: boolean;
  /**
   * The path to be used when importing the function in the generated code.
   * It can be the name of the package that contains the function, or the path
   * to the file in the project (relative to the root directory).
   */
  importPath: string;
  /**
   * Whether the function is the default export from that path. Optional: if
   * not specified, it's considered `false`.
   */
  isDefaultExport?: boolean;

  /**
   * A function that takes the function arguments and returns a data key
   * and a fetcher function.
   * The data key is used to cache the result of the fetcher, and should only
   * include the arguments that are used to fetch the data.
   * The result of the fetcher will be used as the context of the function
   * in studio and should return a promise.
   */
  fnContext?: (...args: Partial<Parameters<F>>) => {
    dataKey: string;
    fetcher: () => Promise<any>;
  };
}

export interface CustomFunctionRegistration {
  function: (...args: any[]) => any;
  meta: CustomFunctionMeta<any>;
}

declare global {
  interface Window {
    __PlasmicFunctionsRegistry: CustomFunctionRegistration[];
  }
}

if (root.__PlasmicFunctionsRegistry == null) {
  root.__PlasmicFunctionsRegistry = [];
}

export default function registerFunction<F extends (...args: any[]) => any>(
  fn: F,
  meta: CustomFunctionMeta<F>
) {
  // Check for duplicates
  if (
    root.__PlasmicFunctionsRegistry.some(
      (r: CustomFunctionRegistration) =>
        r.function === fn &&
        r.meta.name === meta.name &&
        r.meta.namespace == meta.namespace
    )
  ) {
    return;
  }
  root.__PlasmicFunctionsRegistry.push({ function: fn, meta });
}
