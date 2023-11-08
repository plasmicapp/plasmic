import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface ArrayPropTypeProps {
  array: any[];
}

export function ArrayPropType(props: ArrayPropTypeProps) {
  return (
    <div>
      <DisplayProps {...props} />
      {JSON.stringify(
        (props.array ?? []).map((item) => item.func?.(item.name, item.age))
      )}
    </div>
  );
}

export function registerArrayPropType() {
  registerComponent(ArrayPropType, {
    name: "test-array-prop-type",
    displayName: "Array Prop Type",
    props: {
      array: {
        type: "array",
        unstable__keyFunc: (x) => x.key,
        // unstable__minimalValue: () => [
        //   { name: "hello", age: "123" }
        // ],
        itemType: {
          type: "object",
          fields: {
            name: "string",
            age: {
              type: "number",
              defaultValue: 123,
            },
            gender: {
              type: "choice",
              options: ["M", "F", "X"],
              defaultValue: "M",
            },
            img: "imageUrl",
            retired: "boolean",
            nestedArray: {
              type: "array",
              itemType: {
                type: "object",
                fields: {
                  label: "string",
                  value: "string",
                },
              },
            },
            func: {
              type: "function" as any,
              argNames: ["name", "amount"],
              argValues: () => ["Foo", 10],
            } as any,
          },
          nameFunc: (item) => item.name,
        },
      },
    },
    importName: "ArrayPropType",
    importPath: "../code-components/ArrayPropType",
  });
}
