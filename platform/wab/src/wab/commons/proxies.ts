/**
 * Given an object with a bunch of methods, return a proxy that has all the
 * same methods, but bound to this object. That way you can directly call those
 * methods without using dot notation / without keeping around a reference to
 * the object.
 *
 * const {method} = object;
 * method(); // Doesn't work, `this` is not `object`.
 *
 * const proxy = bindMethods(object);
 * const {method} = proxy;
 * method(); // Works, `this` is `object`.
 */
export function bindMethods<T extends object>(object: T): T {
  return new Proxy(object, {
    get(target, propKey, receiver) {
      const origMethod = target[propKey];
      return (...args) => origMethod.apply(target, args);
    },
  });
}
