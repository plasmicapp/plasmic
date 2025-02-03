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

export const applyFilter = (query: any, filters?: Filter[]) => {
  for (const filter of filters ?? []) {
    if (filter.name === "eq") {
      for (const arg of filter.args) {
        query = query.eq(arg.column, arg.value);
      }
    } else if (filter.name === "match") {
    }
  }
  return query;
};
