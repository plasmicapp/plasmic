import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";
import {
  getRawCode,
  removeFallbackFromDataSourceOp,
} from "@/wab/shared/core/exprs";
import { ComponentDataQuery } from "@/wab/shared/model/classes";

export function serializeComponentLevelQuery(
  query: ComponentDataQuery,
  ctx: SerializerBaseContext
) {
  if (!query.op) {
    return "";
  }
  // We use the "no fallback" version of query.op, and catch the
  // null reference errors here ourselves. This is so that if
  // there's a null error, we want to make sure we don't perform
  // the data operation until there is no null error; relying on
  // fallback would mean performing the data operation with null
  // userArgs, which are likely invalid.
  return `usePlasmicDataOp(
    (() => { return ${getRawCode(
      removeFallbackFromDataSourceOp(query.op),
      ctx.exprCtx
    )};
    })
  )`;
}

export function getDataSourcesPackageName() {
  return "@plasmicapp/react-web/lib/data-sources";
}
