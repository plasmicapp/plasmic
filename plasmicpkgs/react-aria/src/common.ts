import { PlasmicElement, PropType } from "@plasmicapp/host";
import { CSSProperties } from "react";
import {
  BaseControlContextData,
  HasControlContextData,
  isDefined,
} from "./utils";

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

export function createIdProp<T>(componentName: string): PropType<T> {
  return {
    type: "string",
    description: `Sets the HTML id attribute on the root element of the ${componentName}.`,
    advanced: true,
  };
}

export function createNameProp<T>(): PropType<T> {
  return {
    type: "string",
    description: "Name for this field if it is part of a form",
    displayName: "Form field key",
    hidden: hasParent,
    advanced: true,
  };
}

export function createDisabledProp<T>(componentName: string): PropType<T> {
  return {
    displayName: "Disabled",
    type: "boolean",
    description: `Whether the ${componentName} is read-only and unfocusable`,
    defaultValueHint: false,
    hidden: isParentDisabled,
  };
}

export function createReadOnlyProp<T>(componentName: string): PropType<T> {
  return {
    displayName: "Read only",
    type: "boolean",
    description: `Whether the value of this ${componentName} can be changed by the user. Unlike disabled, read-only does not prevent the user from interacting with the component (such as focus).`,
    defaultValueHint: false,
    advanced: true,
    hidden: isParentReadOnly,
  };
}

export function createRequiredProp<T>(componentName: string): PropType<T> {
  return {
    displayName: "Required",
    type: "boolean",
    description: `Whether user input is required on the ${componentName} before form submission.`,
    defaultValueHint: false,
    advanced: true,
    // hidden: hasParent,
    hidden: () => true, // hiding required prop until the release of Aria Forms
  };
}

export function createAutoFocusProp<T>(componentName: string): PropType<T> {
  return {
    type: "boolean",
    description: `Whether the ${componentName} should be focused when rendered`,
    defaultValueHint: false,
    advanced: true,
    hidden: hasParent,
  };
}

export function createAriaLabelProp<T>(componentName: string): PropType<T> {
  return {
    type: "string",
    displayName: "ARIA label",
    description: `Assistive technology uses this if there is no visible label for this ${componentName}`,
    advanced: true,
    hidden: hasParent,
  };
}

export function createChildrenProp<T>(): PropType<T> {
  return {
    type: "slot",
    mergeWithParent: true,
  };
}
export function createInitialValueProp<T>(componentName: string): PropType<T> {
  return {
    type: "string",
    editOnly: true,
    displayName: "Initial value",
    uncontrolledProp: "defaultValue",
    description: `The default value of the ${componentName}`,
    hidden: hasParent,
  };
}

export function createMaxLengthProp<T>(): PropType<T> {
  return {
    type: "number",
    description: "The maximum number of characters supported by the input",
    advanced: true,
    hidden: hasParent,
  };
}

export function createMinLengthProp<T>(): PropType<T> {
  return {
    type: "number",
    description: "The minimum number of characters supported by the input",
    advanced: true,
    hidden: hasParent,
  };
}

export function createPatternProp<T>(): PropType<T> {
  return {
    type: "string",
    description:
      "Regex pattern that the value of the input must match to be valid",
    helpText:
      "For more information about writing Regular Expressions (regex), visit [Regexr](https://regexr.com/)",
    validator: (value: string) => {
      try {
        new RegExp(value);
        return true;
      } catch (_err) {
        return "Invalid Regex";
      }
    },
    advanced: true,
    hidden: hasParent,
  };
}

export function createInputTypeProp<T>(): PropType<T> {
  return {
    type: "choice",
    defaultValueHint: "text",
    options: ["text", "search", "url", "tel", "email", "password"],
    description:
      "The type of data that an input field is expected to handle. It influences the input's behavior, validation, and the kind of interface provided to the user.",
    advanced: true,
    hidden: hasParent,
  };
}

export function createInputModeProp<T>(): PropType<T> {
  return {
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
  };
}

export function createAutoCompleteProp<T>(): PropType<T> {
  return {
    type: "choice",
    advanced: true,
    multiSelect: true,
    hidden: hasParent,
    description: "Guidance as to the type of data expected in the field",
    helpText:
      "Learn more about the available options on the [MDN guide](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values)",
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
  };
}

export function createValidationBehaviorProp<T>(): PropType<T> {
  return {
    type: "choice",
    options: ["native", "aria"],
    description:
      "Whether to use native HTML form validation to prevent form submission when the value is missing or invalid, or mark the field as required or invalid via ARIA.",
    defaultValueHint: "native",
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnChangeProp<T>(argType: "string" | "number" | "object" = "string"): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "value", type: argType }],
    hidden: hasParent,
  };
}

export function createOnFocusProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "focusEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnBlurProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "focusEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnFocusChangeProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "isFocused", type: "boolean" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnKeyDownProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "keyboardEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnKeyUpProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "keyboardEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnCopyProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "clipbordEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnCutProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "clipbordEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnPasteProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "clipbordEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnCompositionStartProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "compositionEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnCompositionEndProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "compositionEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnCompositionUpdateProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "compositionEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnSelectProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "selectionEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnBeforeInputProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "inputEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createOnInputProp<T>(): PropType<T> {
  return {
    type: "eventHandler",
    argTypes: [{ name: "inputEvent", type: "object" }],
    advanced: true,
    hidden: hasParent,
  };
}

export function createPlaceholderProp<T>(): PropType<T> {
  return {
    type: "string",
  };
}

type Overrides = {
  defaultValueHint?: any;
};

export function createPlacementProp<T>(
  componentName: string,
  overrides: Overrides
): PropType<T> {
  return {
    type: "choice",
    description: `Default placement of the ${componentName} relative to the trigger, if there is enough space`,
    options: [
      "bottom",
      "bottom left",
      "bottom right",
      "bottom start",
      "bottom end",
      "top",
      "top left",
      "top right",
      "top start",
      "top end",
      "left",
      "left top",
      "left bottom",
      "start",
      "start top",
      "start bottom",
      "right",
      "right top",
      "right bottom",
      "end",
      "end top",
      "end bottom",
    ],
    ...(overrides ?? {}),
  };
}

export function createOffsetProp<T>(
  componentName: string,
  overrides: Overrides
): PropType<T> {
  return {
    type: "number",
    displayName: "Offset",
    description: `Additional offset applied along the main axis between the ${componentName} and its trigger`,
    advanced: true,
    ...(overrides ?? {}),
  };
}

export function createContainerPaddingProp<T>(
  componentName: string,
  overrides: Overrides
): PropType<T> {
  return {
    type: "number",
    description: `The padding that should be applied between the ${componentName} and its surrounding container. This affects the positioning breakpoints that determine when it will attempt to flip.`,
    advanced: true,
    ...(overrides ?? {}),
  };
}

export function createCrossOffsetProp<T>(
  componentName: string,
  overrides: Overrides
): PropType<T> {
  return {
    type: "number",
    description: `The additional offset applied along the cross axis between the ${componentName} and its anchor element.`,
    advanced: true,
    ...(overrides ?? {}),
  };
}

export function getCommonOverlayProps<T>(
  componentName: string,
  overrides: Record<string, Overrides>
) {
  const commonProps: Record<string, PropType<T>> = {
    placement: createPlacementProp<T>(componentName, overrides["placement"]),
    offset: createOffsetProp<T>(componentName, overrides["offset"]),
    containerPadding: createContainerPaddingProp<T>(
      componentName,
      overrides["containerPadding"]
    ),
    crossOffset: createCrossOffsetProp<T>(
      componentName,
      overrides["crossOffset"]
    ),
  };
  return commonProps;
}

export const arrowDown: PlasmicElement = {
  type: "hbox",
  children: [],
  styles: {
    width: 0,
    height: 0,
    padding: 0,
    borderLeftWidth: "5px",
    borderRightWidth: "5px",
    borderTopWidth: "5px",
    borderLeftStyle: "solid",
    borderRightStyle: "solid",
    borderTopStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "black",
  },
};
// Set border-box to the root element of the aria code component to align with Plasmic's default of using border-box for all root elements.
export const COMMON_STYLES: CSSProperties = { boxSizing: "border-box" };

/**
* Minimal shared input event-handler registrations for text-entry controls.
*
* This returns only the event handler props that have the exact same names and
* semantics across all three components: Input, Text Field, and Text Area.
* Non-event props (e.g., id, name, value, maxLength/minLength, inputMode,
* placeholder, pattern, type, autoComplete, validationBehavior, disabled/
* isDisabled, readOnly/isReadOnly, required/isRequired, "aria-label") must be
* registered explicitly at the component level to preserve the desired
* editor-facing ordering.
*/
export function commonInputEventHandlerProps<T>(): Record<string, PropType<T>> {
  return {
    // Events supported uniformly by all three
    onChange: createOnChangeProp<T>("string"),
    onFocus: createOnFocusProp<T>(),
    onBlur: createOnBlurProp<T>(),
    onKeyDown: createOnKeyDownProp<T>(),
    onKeyUp: createOnKeyUpProp<T>(),
    onCopy: createOnCopyProp<T>(),
    onCut: createOnCutProp<T>(),
    onPaste: createOnPasteProp<T>(),
    onCompositionStart: createOnCompositionStartProp<T>(),
    onCompositionEnd: createOnCompositionEndProp<T>(),
    onCompositionUpdate: createOnCompositionUpdateProp<T>(),
    onSelect: createOnSelectProp<T>(),
    onBeforeInput: createOnBeforeInputProp<T>(),
    onInput: createOnInputProp<T>(),
  };
}
