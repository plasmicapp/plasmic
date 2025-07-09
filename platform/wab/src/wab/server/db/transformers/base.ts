import { FindOperator, ValueTransformer } from "typeorm";

/** 2-way transformer for PostgreSQL types. */
export type Transformer<T> = {
  serialize: (x: T) => string;
  deserialize: (x: string) => T;
};

/** `ValueTransformer` that handles `null` and `FindOperator`. */
export function toTypeORM<T>(transformer: Transformer<T>): ValueTransformer {
  return {
    to: (x: T | FindOperator<T>) => {
      if (x === null) {
        return null;
      } else if (x instanceof FindOperator) {
        return new FindOperator(
          x.type,
          transformer.serialize(x.value),
          x.useParameter,
          x.multipleParameters,
          x.getSql,
          x.objectLiteralParameters
        );
      } else {
        return transformer.serialize(x);
      }
    },
    from: (x: string | unknown) => {
      // Sometimes TypeORM might pass an already deserialized `x` value.
      // If `x` is not a string, assume it's already deserialized.
      if (typeof x === "string") {
        return transformer.deserialize(x);
      } else {
        return x;
      }
    },
  };
}
