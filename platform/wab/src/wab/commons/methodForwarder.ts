type RequiresVoidMethodsObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => infer ReturnType
    ? ReturnType extends void
      ? T[K]
      : "all methods must return void"
    : "all properties must be methods";
};

/**
 * Creates an object that forwards methods to target objects.
 * Only objects with methods that return void are accepted.
 */
export function methodForwarder<T extends RequiresVoidMethodsObject<T>>(
  ...targets: (T | null | undefined)[]
): T {
  return new Proxy(
    {},
    {
      get(_, propName: string | symbol) {
        return (...args: any[]) => {
          for (const target of targets) {
            if (target) {
              const method = target[propName];
              if (typeof method === "function") {
                method.apply(target, args);
              }
            }
          }
        };
      },
    }
  ) as T;
}
