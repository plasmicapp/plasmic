export interface Entry {
  sys: {
    id: string;
  };
  fields: {
    [fieldName: string]: unknown | unknown[];
  };
}
