import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface ObjectPropTypeProps {
  objectProp: any[];
}

export function ObjectPropType(props: ObjectPropTypeProps) {
  return <DisplayProps {...props} />;
}

export function registerObjectPropType() {
  registerComponent(ObjectPropType, {
    name: "test-object-prop-type",
    displayName: "Object Prop Type",
    props: {
      objectProp: {
        type: "object",
        fields: {
          name: "string",
          age: "number",
          gender: {
            type: "choice",
            options: ["M", "F", "X"],
          },
          retired: "boolean",
          booleanLikeFunc: {
            type: "function",
            argNames: ["arg1", "arg2"],
            argValues: [42, "hello"],
            control: {
              type: "boolean",
            },
          } as any,
          address: {
            type: "object",
            fields: {
              street: "string",
              city: "string",
              state: {
                type: "choice",
                options: ["SP", "RJ"],
              },
              objectLikeFunc: {
                type: "function",
                argNames: ["arg1", "arg2"],
                argValues: [42, "hello"],
                control: {
                  type: "object",
                  fields: {
                    name: "string",
                    age: "number",
                    retired: "boolean",
                    booleanLikeFunc: {
                      type: "function",
                      argNames: ["arg3", "arg4"],
                      argValues: [-42, "hello2"],
                      control: "boolean",
                    },
                  },
                },
              } as any,
            },
            nameFunc: (item) => item?.street,
          },
        },
        nameFunc: (item) => item?.name,
        defaultValue: {
          name: "hello",
          age: 123,
        },
      },
    },
    importName: "ObjectPropType",
    importPath: "../code-components/ObjectPropType",
  });
}
