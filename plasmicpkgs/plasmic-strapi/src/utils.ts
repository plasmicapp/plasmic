export const modulePath = "@plasmicpkgs/plasmic-strapi";

export const queryParameters = [
  {
    value: "$eq",
    label: "Equal",
  },
  {
    value: "$ne",
    label: "Not equal",
  },
  {
    value: "$lt",
    label: "Less than",
  },
  {
    value: "$lte",
    label: "Less than or equal to",
  },
  {
    value: "$gt",
    label: "Greater than",
  },
  {
    value: "$gte",
    label: "Greater than or equal to",
  },
  {
    value: "$in",
    label: "Included in an array",
  },
  {
    value: "$notIn",
    label: "Not included in an array",
  },
  {
    value: "$contains",
    label: "Contains",
  },
  {
    value: "$notContains",
    label: "Does not contain",
  },
];

export const uniq = <T>(xs: Array<T>): T[] => Array.from(new Set(xs));
