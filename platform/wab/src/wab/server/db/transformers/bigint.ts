import { Transformer } from "@/wab/server/db/transformers/base";

/** node-postgres returns `bigint` as a string, since it may not fit a number. */
export const bigintTransformer: Transformer<bigint> = {
  serialize: (x: bigint) => {
    return x.toString();
  },
  deserialize: (x: string) => {
    return BigInt(x);
  },
};
