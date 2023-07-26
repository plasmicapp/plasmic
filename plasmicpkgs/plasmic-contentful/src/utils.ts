export const searchParameters = [
  {
    value: "[lt]",
    label: "Less than",
  },
  {
    value: "[lte]",
    label: "Less than or equal",
  },
  {
    value: "[gt]",
    label: "Greater than",
  },
  {
    value: "[gte]",
    label: "Greater than or equal ",
  },
];

export const uniq = <T>(xs: Array<T>): T[] => Array.from(new Set(xs));
