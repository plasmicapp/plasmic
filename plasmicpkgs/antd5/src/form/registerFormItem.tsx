import {
  buttonComponentName,
  checkboxComponentName,
  formComponentName,
  formItemComponentName,
  inputComponentName,
  inputNumberComponentName,
  passwordComponentName,
  radioGroupComponentName,
  selectComponentName,
  switchComponentName,
  textAreaComponentName,
} from "../names";
import { Registerable, registerComponentHelper } from "../utils";
import { FormItemWrapper } from "./FormItem";
import { commonFormItemProps } from "./sharedRegistration";

export function registerFormItem(loader?: Registerable) {
  registerComponentHelper(loader, FormItemWrapper, {
    name: formItemComponentName,
    displayName: "Form Field",
    parentComponentName: formComponentName,
    defaultStyles: {
      marginBottom: "24px",
      width: "stretch",
    },
    props: {
      label: {
        type: "slot",
        defaultValue: {
          type: "text",
          value: "Label",
        },
        hidden: (ps) => !!ps.noLabel,
        ...({ mergeWithParent: true } as any),
      },
      children: {
        type: "slot",
        defaultValue: {
          type: "component",
          name: inputComponentName,
        },
        ...({ mergeWithParent: true } as any),
      },
      ...commonFormItemProps("advanced-form-item"),
    },
    importPath: "@plasmicpkgs/antd5/skinny/FormItem",
    importName: "FormItemWrapper",
    treeLabel: (ps: any) => ps.name,
    templates: {
      Text: {
        props: {
          children: {
            type: "component",
            name: inputComponentName,
          },
        },
      },
      "Long Text": {
        props: {
          children: {
            type: "component",
            name: textAreaComponentName,
          },
        },
      },
      "Select dropdown": {
        props: {
          children: {
            type: "component",
            name: selectComponentName,
          },
        },
      },
      Number: {
        props: {
          children: {
            type: "component",
            name: inputNumberComponentName,
          },
        },
      },
      Checkbox: {
        props: {
          children: {
            type: "component",
            name: checkboxComponentName,
          },
          noLabel: true,
        },
      },
      Switch: {
        props: {
          children: {
            type: "component",
            name: switchComponentName,
          },
          noLabel: true,
        },
      },
      Radios: {
        props: {
          children: {
            type: "component",
            name: radioGroupComponentName,
          },
        },
      },
      Password: {
        props: {
          children: {
            type: "component",
            name: passwordComponentName,
          },
        },
      },
      "Submit button": {
        props: {
          children: {
            type: "component",
            name: buttonComponentName,
            props: {
              type: "primary",
            },
          },
          noLabel: true,
        },
      },
    },
    ...({ trapsSelection: true } as any),
  });
}
