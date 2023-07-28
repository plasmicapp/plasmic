import React from "react";
import { Steps } from "antd";
import { Registerable, registerComponentHelper } from "./utils";

export function AntdSteps(props: React.ComponentProps<typeof Steps>) {
  return <Steps {...props} />;
}

export function registerSteps(loader?: Registerable) {
  const statusOptions = ["wait", "process", "finish", "error"];
  registerComponentHelper(loader, AntdSteps, {
    name: "plasmic-antd5-steps",
    displayName: "Steps",
    props: {
      items: {
        type: "array",
        itemType: {
          type: "object",
          nameFunc: (item) => item.title,
          fields: {
            title: "string",
            description: "string",
            subTitle: "string",
            disabled: "boolean",
            status: {
              displayName: "Status",
              type: "choice",
              options: statusOptions,
              defaultValueHint: "wait",
            },
            // TODO icon: 'slot',
          },
        },
        defaultValue: [
          {
            title: "Applied",
            description: "Application has been submitted.",
          },
          {
            title: "In Review",
            description: "Application is being reviewed.",
          },
          {
            title: "Closed",
            description: "Final decision on the application.",
          },
        ],
      },
      current: {
        type: "number",
        displayName: "Current step",
        defaultValue: 1,
      },
      size: {
        type: "choice",
        options: ["small", "default"],
        description: "Set the size of steps",
        defaultValueHint: "default",
      },
      direction: {
        type: "choice",
        options: ["horizontal", "vertical"],
        description: "Direction of steps",
        defaultValueHint: "horizontal",
      },
      progressDot: {
        type: "boolean",
        displayName: "Dot style",
      },
      status: {
        displayName: "Status of current step",
        type: "choice",
        options: statusOptions,
        defaultValueHint: "process",
      },
      type: {
        type: "choice",
        options: ["default", "navigation", "inline"],
        defaultValueHint: "default",
      },
      percent: {
        advanced: true,
        type: "number",
        description: "Number between 0 to 100",
      },
      responsive: {
        advanced: true,
        type: "boolean",
        description: "Change to vertical when screen narrower than 532px",
      },
      onChange: {
        type: "eventHandler",
        argTypes: [
          {
            name: "step",
            type: "number",
          },
        ],
      },
    },
    states: {
      current: {
        type: "writable",
        valueProp: "current",
        onChangeProp: "onChange",
        variableType: "number",
      },
    },
    importPath: "@plasmicpkgs/antd5/skinny/registerSteps",
    importName: "AntdSteps",
  });
}
