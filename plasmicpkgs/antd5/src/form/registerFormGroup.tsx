import { formComponentName, formGroupComponentName } from "../names";
import { Registerable, registerComponentHelper } from "../utils";
import { FormGroup } from "./FormGroup";
import { COMMON_ACTIONS } from "./sharedRegistration";

export function registerFormGroup(loader?: Registerable) {
  registerComponentHelper(loader, FormGroup, {
    name: formGroupComponentName,
    displayName: "Form Field Group",
    parentComponentName: formComponentName,
    actions: COMMON_ACTIONS,
    props: {
      name: {
        type: "string",
        displayName: "Form group key",
        description:
          "Name of the field key for this group of form fields in the submitted form data.",
      },
      children: {
        type: "slot",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/FormGroup",
    importName: "FormGroup",
  });
}
