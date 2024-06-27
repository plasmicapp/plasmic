import { Var } from "@/wab/shared/model/classes";

interface ComponentRerenderMeta {
  initialProps: Set<Var>;
  controlledProps: Set<Var>;
}

interface ValComponentSummary {
  initialProps: Map<string, any>;
  controlledProps: Map<string, any>;
  version: number;
}

const controlledPropToggled = (
  propName: string,
  val1: any,
  vals2: Map<string, any>
) => {
  const val2 = vals2.get(propName);
  return (val1 != null && val2 == null) || (val1 == null && val2 != null);
};
