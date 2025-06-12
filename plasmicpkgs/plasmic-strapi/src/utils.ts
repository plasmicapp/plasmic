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

export const getAttributes = (item?: Record<string, any>) => {
  if (!item) {
    return undefined;
  }
  // Strapi v4
  if (item.attributes) {
    return item.attributes;
  }
  // Strapi v5
  const { documentId: _documentId, locale: _locale, ...rest } = item;
  return rest;
};

export function filterFields(collectionData: any[]) {
  return collectionData.flatMap((item: any) => {
    const attributes = getAttributes(item);
    const displayableFields = Object.keys(attributes).filter((field) => {
      const value = attributes[field];
      const maybeMime = getAttributes(value?.data)?.mime;
      return (
        typeof value !== "object" ||
        (typeof maybeMime === "string" && maybeMime.startsWith("image"))
      );
    });
    return displayableFields;
  });
}
