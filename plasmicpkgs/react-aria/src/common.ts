import { PropType } from "@plasmicapp/host";
import {
  BaseControlContextData,
  HasControlContextData,
  isDefined,
} from "./utils";

export const defaultStyles: React.CSSProperties = {
  boxSizing: "border-box",
};

export function hasParent<T>(_props: T, ctx: ConditionalContext<T>): boolean {
  return isDefined(ctx?.parent) === true;
}

export function isParentReadOnly<T>(_props: T, ctx: ConditionalContext<T>) {
  return ctx?.parent?.isReadOnly === true;
}

export function isParentDisabled<T>(_props: T, ctx: ConditionalContext<T>) {
  return ctx?.parent?.isDisabled === true;
}

export function resolveAutoComplete(autoCompleteProp?: string | string[]) {
  if (typeof autoCompleteProp === "string") {
    return autoCompleteProp;
  }
  if (
    !autoCompleteProp ||
    !Array.isArray(autoCompleteProp) ||
    autoCompleteProp.includes("off")
  ) {
    return undefined;
  }
  if (autoCompleteProp.includes("off")) {
    return "off";
  }
  if (autoCompleteProp.includes("on") && autoCompleteProp.length === 1) {
    return "on";
  }
  return autoCompleteProp.filter((x) => x !== "on").join(" ");
}

type ConditionalContext<T> = T extends HasControlContextData
  ? BaseControlContextData | null
  : null;

function createNameProp<T>(): PropType<T> {
  return {
    type: "string",
    description: "Name for this field if it is part of a form",
    hidden: hasParent,
    advanced: true,
  };
}

function createDisabledProp<T>(componentName: string): PropType<T> {
  return {
    displayName: "Disabled",
    type: "boolean",
    description: `Whether the ${componentName} is read-only and unfocusable`,
    defaultValueHint: false,
    hidden: isParentDisabled,
  };
}

function createReadOnlyProp<T>(componentName: string): PropType<T> {
  return {
    displayName: "Read only",
    type: "boolean",
    description: `Whether the value of this ${componentName} can be changed by the user. Unlike disabled, read-only does not prevent the user from interacting with the component (such as focus).`,
    defaultValueHint: false,
    advanced: true,
    hidden: isParentReadOnly,
  };
}

function createRequiredProp<T>(componentName: string): PropType<T> {
  return {
    displayName: "Required",
    type: "boolean",
    description: `Whether user input is required on the ${componentName} before form submission.`,
    defaultValueHint: false,
    advanced: true,
    hidden: hasParent,
  };
}

function createAutoFocusProp<T>(componentName: string): PropType<T> {
  return {
    type: "boolean",
    description: `Whether the ${componentName} should be focused when rendered`,
    defaultValueHint: false,
    advanced: true,
    hidden: hasParent,
  };
}

function createAriaLabelProp<T>(componentName: string): PropType<T> {
  return {
    type: "string",
    displayName: "ARIA label",
    description: `Label for this ${componentName}, if no visible label is used, to identify the element to assistive technology`,
    advanced: true,
    hidden: hasParent,
  };
}

function createChildrenProp<T>(): PropType<T> {
  return {
    type: "slot",
    mergeWithParent: true as any,
  };
}

export function getCommonProps<T>(
  componentName: string,
  propNames: (keyof T)[]
) {
  const commonProps: Record<string, PropType<T>> = {
    name: createNameProp<T>(),
    disabled: createDisabledProp(componentName),
    isDisabled: createDisabledProp(componentName),
    readOnly: createReadOnlyProp(componentName),
    isReadOnly: createReadOnlyProp(componentName),
    autoFocus: createAutoFocusProp(componentName),
    "aria-label": createAriaLabelProp(componentName),
    required: createRequiredProp(componentName),
    isRequired: createRequiredProp(componentName),
    children: createChildrenProp(),
    // NOTE: The following props are only applicable to inputs, textareas, and text fields
    value: {
      type: "string",
      editOnly: true,
      displayName: "Initial value",
      uncontrolledProp: "defaultValue",
      description: `The default value of the ${componentName}`,
      hidden: hasParent,
    },
    maxLength: {
      type: "number",
      description: "The maximum number of characters supported by the input",
      advanced: true,
      hidden: hasParent,
    },
    minLength: {
      type: "number",
      description: "The minimum number of characters supported by the input",
      advanced: true,
      hidden: hasParent,
    },
    pattern: {
      type: "string",
      description:
        "Regex pattern that the value of the input must match to be valid",
      helpText:
        "For more information about writing Regular Expressions (regex), check out https://regexr.com/",
      validator: (value: string) => {
        try {
          new RegExp(value);
          return true;
        } catch (error) {
          return "Invalid Regex";
        }
      },
      advanced: true,
      hidden: hasParent,
    },
    type: {
      type: "choice",
      defaultValueHint: "text",
      options: ["text", "search", "url", "tel", "email", "password"],
      description:
        "The type of data that an input field is expected to handle. It influences the input's behavior, validation, and the kind of interface provided to the user.",
      advanced: true,
      hidden: hasParent,
    },
    inputMode: {
      type: "choice",
      description:
        "hint to browsers as to the type of virtual keyboard configuration to use when editing this element or its contents.",
      options: [
        "none",
        "text",
        "tel",
        "url",
        "email",
        "numeric",
        "decimal",
        "search",
      ],
      hidden: hasParent,
    },
    autoComplete: {
      type: "choice",
      advanced: true,
      multiSelect: true,
      hidden: hasParent,
      description: "Guidance as to the type of data expected in the field",
      helpText:
        "For explanations on what each of the values mean, check https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values",
      options: [
        "on",
        "off",
        "name",
        "honorific-prefix",
        "given-name",
        "additional-name",
        "family-name",
        "honorific-suffix",
        "nickname",
        "email",
        "username",
        "new-password",
        "current-password",
        "one-time-code",
        "organization-title",
        "organization",
        "street-address",
        "shipping",
        "billing",
        "address-line1",
        "address-line2",
        "address-line3",
        "address-level4",
        "address-level3",
        "address-level2",
        "address-level1",
        "country",
        "country-name",
        "postal-code",
        "cc-name",
        "cc-given-name",
        "cc-additional-name",
        "cc-family-name",
        "cc-number",
        "cc-exp",
        "cc-exp-month",
        "cc-exp-year",
        "cc-csc",
        "cc-type",
        "transaction-currency",
        "transaction-amount",
        "language",
        "bday",
        "bday-day",
        "bday-month",
        "bday-year",
        "sex",
        "tel",
        "tel-country-code",
        "tel-national",
        "tel-area-code",
        "tel-local",
        "tel-local-suffix",
        "tel-local-prefix",
        "tel-extension",
        "impp",
        "url",
        "photo",
        "webauthn",
      ],
    },
    validationBehavior: {
      type: "choice",
      options: ["native", "aria"],
      description:
        "Whether to use native HTML form validation to prevent form submission when the value is missing or invalid, or mark the field as required or invalid via ARIA.",
      defaultValueHint: "native",
      advanced: true,
      hidden: hasParent,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [{ name: "value", type: "string" }],
      hidden: hasParent,
    },
    onFocus: {
      type: "eventHandler",
      argTypes: [{ name: "focusEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onBlur: {
      type: "eventHandler",
      argTypes: [{ name: "focusEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onFocusChange: {
      type: "eventHandler",
      argTypes: [{ name: "isFocused", type: "boolean" }],
      advanced: true,
      hidden: hasParent,
    },
    onKeyDown: {
      type: "eventHandler",
      argTypes: [{ name: "keyboardEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onKeyUp: {
      type: "eventHandler",
      argTypes: [{ name: "keyboardEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onCopy: {
      type: "eventHandler",
      argTypes: [{ name: "clipbordEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onCut: {
      type: "eventHandler",
      argTypes: [{ name: "clipbordEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onPaste: {
      type: "eventHandler",
      argTypes: [{ name: "clipbordEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onCompositionStart: {
      type: "eventHandler",
      argTypes: [{ name: "compositionEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onCompositionEnd: {
      type: "eventHandler",
      argTypes: [{ name: "compositionEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onCompositionUpdate: {
      type: "eventHandler",
      argTypes: [{ name: "compositionEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onSelect: {
      type: "eventHandler",
      argTypes: [{ name: "selectionEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onBeforeInput: {
      type: "eventHandler",
      argTypes: [{ name: "inputEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    onInput: {
      type: "eventHandler",
      argTypes: [{ name: "inputEvent", type: "object" }],
      advanced: true,
      hidden: hasParent,
    },
    placeholder: {
      type: "string",
    },
  };

  // Filter the properties based on the provided fields array
  const filteredProps: Partial<Record<keyof T, PropType<T>>> = {};
  propNames.forEach((propName) => {
    if (Object.prototype.hasOwnProperty.call(commonProps, propName)) {
      filteredProps[propName] = commonProps[propName as string];
    }
  });

  return filteredProps;
}
