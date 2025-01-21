const FILTERS = ["eq", "match"];

export interface Filter {
  name: string;
  args: {
    column: string;
    value: string;
  }[];
}

export const isValidFilter = (filter: any) => {
  if (!("name" in filter) || !("args" in filter) || filter.args.length === 0) {
    return false;
  }
  if (filter.args.some((arg: any) => !("column" in arg) || !("value" in arg))) {
    return false;
  }
  return FILTERS.includes(filter.name);
};

export const isContextValueRef = (val: string) =>
  val.startsWith("{{") && val.endsWith("}}");
export const getContextAndField = (val: string) => {
  const [contextName, field] =
    val.match(RE_CONTEXTREF)?.toString().split(".") ?? [];
  return { contextName, field };
};

const RE_CONTEXTREF = /[^{}]+/;
const contextValue = (val: string, contexts: any) => {
  const contextRef = val.match(RE_CONTEXTREF)?.toString();

  const [contextName, field] = contextRef?.split(".") ?? [];

  if (contextName === "local") {
    return localStorage.getItem(field);
  }

  if (!contextName || !(contextName in contexts)) {
    return null;
  }

  const context = contexts[contextName];
  if (!context || !field || !(field in context)) return null;

  return context[field];
};

export const getPropValue = (val: string, contexts: any) =>
  val && isContextValueRef(val) ? contextValue(val, contexts) : val;

export const applyFilter = (query: any, filters?: Filter[], contexts?: any) => {
  for (const filter of filters ?? []) {
    if (filter.name === "eq") {
      for (const arg of filter.args) {
        const value = arg.value;
        let val: any;
        if (!contexts) {
          val = getPropValue(value, contexts);
        } else {
          if (!isContextValueRef(value)) {
            val = value;
          } else {
            const { contextName, field } = getContextAndField(value);
            if (contextName === "local") {
              val = localStorage.getItem(field);
            } else {
              val = contexts[contextName][field];
            }
          }
        }

        if (val) {
          query = query.eq(arg.column, val);
        }
      }
    } else if (filter.name === "match") {
    }
  }
  return query;
};
