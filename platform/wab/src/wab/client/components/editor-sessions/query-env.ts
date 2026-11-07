import { toVarName } from "@/wab/shared/codegen/util";
import type { ComponentDataQuery } from "@/wab/shared/model/classes";

// Shallow, unlike lodash `omit`, which reads into the query data and throws
// `PlasmicUndefinedDataError`.
export function omitDataQueryFromEnv(
  env: Record<string, any> | undefined,
  query: ComponentDataQuery,
): Record<string, any> {
  if (!env?.$queries) {
    return env ?? {};
  }
  const { [toVarName(query.name)]: _omit, ...$queries } = env.$queries;
  return { ...env, $queries };
}
