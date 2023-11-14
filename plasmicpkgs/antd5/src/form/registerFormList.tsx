import {
  formComponentName,
  formItemComponentName,
  formListComponentName,
} from "../names";
import { Registerable, registerComponentHelper } from "../utils";
import { FormListWrapper } from "./FormList";
import { COMMON_ACTIONS } from "./sharedRegistration";

export function registerFormList(loader?: Registerable) {
  registerComponentHelper(loader, FormListWrapper, {
    name: formListComponentName,
    parentComponentName: formComponentName,
    displayName: "Form List",
    actions: COMMON_ACTIONS,
    providesData: true,
    props: {
      children: {
        type: "slot",
        defaultValue: [
          {
            type: "hbox",
            children: [
              {
                type: "component",
                name: formItemComponentName,
                props: {
                  name: "firstName",
                  label: {
                    type: "text",
                    value: "First name",
                  },
                  children: {
                    type: "component",
                    name: "plasmic-antd5-input",
                  },
                },
              },
              {
                type: "component",
                name: formItemComponentName,
                props: {
                  name: "lastName",
                  label: {
                    type: "text",
                    value: "Last name",
                  },
                  children: {
                    type: "component",
                    name: "plasmic-antd5-input",
                  },
                },
              },
            ],
          },
        ],
      },
      name: {
        type: "string",
        defaultValue: "guests",
      },
      initialValue: {
        type: "array",
        defaultValue: [
          {
            firstName: "Jane",
            lastName: "Doe",
          },
          {
            firstName: "John",
            lastName: "Smith",
          },
        ],
      } as any,
    },
    refActions: {
      add: {
        displayName: "Add an item",
        argTypes: [
          {
            name: "defaultValue",
            displayName: "Default value",
            type: "object",
          },
          {
            name: "insertIndex",
            displayName: "Insert index",
            type: "number",
          },
        ],
      },
      remove: {
        displayName: "Remove an item",
        argTypes: [
          {
            name: "index",
            displayName: "Index",
            type: "number",
          },
        ],
      },
      move: {
        displayName: "Move field",
        argTypes: [
          {
            name: "from",
            displayName: "From",
            type: "number",
          },
          {
            name: "to",
            displayName: "To",
            type: "number",
          },
        ],
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/FormList",
    importName: "FormListWrapper",
  });
}
