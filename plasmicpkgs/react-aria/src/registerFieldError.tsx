import React from "react";
import type { FieldErrorProps } from "react-aria-components";
import { FieldError } from "react-aria-components";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { createIdProp } from "./common";

interface BaseFieldErrorProps extends FieldErrorProps {
  useBuiltInValidation: boolean;
  badInput?: string;
  customError?: string;
  patternMismatch?: string;
  rangeOverflow?: string;
  rangeUnderflow?: string;
  stepMismatch?: string;
  tooLong?: string;
  tooShort?: string;
  typeMismatch?: string;
  valueMissing?: string;
}

export function BaseFieldError({
  badInput,
  customError,
  patternMismatch,
  rangeOverflow,
  rangeUnderflow,
  stepMismatch,
  tooLong,
  tooShort,
  typeMismatch,
  valueMissing,
  ...rest
}: BaseFieldErrorProps) {
  return (
    <FieldError {...rest}>
      {({ validationDetails, validationErrors }) => {
        if (validationDetails.badInput && badInput) {
          return badInput;
        }
        if (validationDetails.customError && customError) {
          return customError;
        }
        if (validationDetails.patternMismatch && patternMismatch) {
          return patternMismatch;
        }
        if (validationDetails.rangeOverflow && rangeOverflow) {
          return rangeOverflow;
        }
        if (validationDetails.rangeUnderflow && rangeUnderflow) {
          return rangeUnderflow;
        }
        if (validationDetails.stepMismatch && stepMismatch) {
          return stepMismatch;
        }
        if (validationDetails.tooLong && tooLong) {
          return tooLong;
        }
        if (validationDetails.tooShort && tooShort) {
          return tooShort;
        }
        if (validationDetails.typeMismatch && typeMismatch) {
          return typeMismatch;
        }
        if (validationDetails.valueMissing && valueMissing) {
          return valueMissing;
        }
        return validationErrors;
      }}
    </FieldError>
  );
}

function PropsDescription() {
  return (
    <div style={{ marginBottom: 20 }}>
      <p>
        You can customize the error messages for built-in validations by
        utilizing the props below.
      </p>
      <p>
        For further information on the specific conditions triggering each
        error, please refer to the{" "}
        <a
          target="_blank"
          href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState#instance_properties"
        >
          MDN Docs
        </a>
        .
      </p>
    </div>
  );
}

export function registerFieldError(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseFieldError>
) {
  registerComponentHelper(
    loader,
    BaseFieldError,
    {
      name: makeComponentName("fielderror"),
      displayName: "Aria Field Error",
      importPath: "@plasmicpkgs/react-aria/skinny/registerFieldError",
      importName: "BaseFieldError",
      actions: [
        {
          type: "custom-action",
          control: PropsDescription,
        },
      ],
      props: {
        id: createIdProp("Field Error"),
        badInput: {
          type: "string",
          description:
            "Error message if the user has provided input that the browser is unable to convert",
        },
        customError: {
          type: "string",
          description: "Error message for custom validations",
        },
        patternMismatch: {
          type: "string",
          description:
            "Error message if the value does not match the specified pattern",
        },
        rangeOverflow: {
          type: "string",
          description:
            "Error message if the value is greater than the maximum specified",
        },
        rangeUnderflow: {
          type: "string",
          description:
            "Error message if the value is less than the minimum specified",
        },
        stepMismatch: {
          type: "string",
          description:
            "Error message if the value is not evenly divisible by the step value",
        },
        tooLong: {
          type: "string",
          description:
            "Error message if the value exceeds the specified maximum number of characters",
        },
        tooShort: {
          type: "string",
          description:
            "Error message  if the value fails to meet the specified minimum number of characters",
        },
        typeMismatch: {
          type: "string",
          description:
            "Error message if the value is not in the required syntax (when type is email or url)",
        },
        valueMissing: {
          type: "string",
          description: "Error message if a required field has no value",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
