import type { CheckboxGroupProps } from "react-aria-components";
import { CheckboxGroup } from "react-aria-components";
import { getCommonInputProps } from "./common";
import { registerCheckbox } from "./registerCheckbox";
import { registerDescription } from "./registerDescription";
import { registerFieldError } from "./registerFieldError";
import { registerLabel } from "./registerLabel";
import {
  CodeComponentMetaOverrides,
  makeChildComponentName,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";

export const BaseCheckboxGroup = CheckboxGroup;

const componentName = makeComponentName("checkboxGroup");

export function registerCheckboxGroup(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseCheckboxGroup>
) {
  registerComponentHelper(
    loader,
    BaseCheckboxGroup,
    {
      name: componentName,
      displayName: "Aria Checkbox Group",
      importPath: "@plasmicpkgs/react-aria/skinny/registerCheckboxGroup",
      importName: "BaseCheckboxGroup",
      props: {
        ...getCommonInputProps<CheckboxGroupProps>("checkbox group", [
          "name",
          "isDisabled",
          "isReadOnly",
          "aria-label",
          "children",
          "isRequired",
        ]),
        value: {
          type: "array",
          editOnly: true,
          uncontrolledProp: "defaultValue",
          description: "The current value",
        },
        isInvalid: {
          displayName: "Invalid",
          type: "boolean",
          description: "Whether the input value is invalid",
          defaultValueHint: false,
        },
        validationBehavior: {
          type: "choice",
          options: ["native", "aria"],
          description:
            "Whether to use native HTML form validation to prevent form submission when the value is missing or invalid, or mark the field as required or invalid via ARIA.",
          defaultValueHint: "native",
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "value", type: "object" }],
        },
      },
      states: {
        value: {
          type: "writable",
          valueProp: "value",
          onChangeProp: "onChange",
          variableType: "array",
        },
      },
      trapsFocus: true,
    },
    overrides
  );

  const thisName = makeChildComponentName(
    overrides?.parentComponentName,
    componentName
  );

  registerFieldError(loader, { parentComponentName: thisName });
  registerCheckbox(loader, { parentComponentName: thisName });
  registerLabel(loader, { parentComponentName: thisName });
  registerDescription(loader, {
    parentComponentName: thisName,
  });
}
