import { PropType } from "@plasmicapp/host";

export function getCommonInputProps<T>(
  fieldName: string,
  fields: (keyof T)[]
): Record<string, PropType<T>> {
  const commonInputProps: Record<string, PropType<T>> = {
    name: {
      type: "string",
      description: "Name for this field if it is part of a form",
    },
    isDisabled: {
      displayName: "Disabled",
      type: "boolean",
      description: `Whether the ${fieldName} is read-only and unfocusable`,
      defaultValueHint: false,
    },
    isReadOnly: {
      displayName: "Read only",
      type: "boolean",
      description: `Whether the value of this ${fieldName} can be changed by the user`,
      defaultValueHint: false,
    },
    autoFocus: {
      type: "boolean",
      description: `Whether the ${fieldName} should be focused when rendered`,
      defaultValueHint: false,
      advanced: true,
    },
    "aria-label": {
      type: "string",
      displayName: "Aria Label",
      description: `Label for this ${fieldName}, if no visible label is used, to identify the element to assistive technology`,
      advanced: true,
    },
    isRequired: {
      displayName: "Required",
      type: "boolean",
      description: `Whether user input is required on the ${fieldName} before form submission.`,
      defaultValueHint: false,
    },
    children: {
      type: "slot",
      mergeWithParent: true as any,
    },
  };

  // Filter the properties based on the provided fields array
  const filteredProps: Record<string, PropType<T>> = {};
  fields.forEach((field) => {
    if (commonInputProps.hasOwnProperty(field)) {
      filteredProps[field as string] = commonInputProps[field as string];
    }
  });

  return filteredProps;
}
