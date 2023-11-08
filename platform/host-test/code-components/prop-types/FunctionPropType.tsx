import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface FunctionPropTypeProps {
  myTextLikeFunc: (arg1: string, arg2: number, arg3: number[]) => any;
  myBooleanLikeFunc: (arg1: string, arg2: number, arg3: number[]) => any;
  myFuncWithNothing: (arg1: string, arg2: number, arg3: number[]) => any;
}

export function FunctionPropType(props: FunctionPropTypeProps) {
  return (
    <DisplayProps
      {...props}
      myTextLikeFunc={props.myTextLikeFunc?.("a", 42, [1, 2, 3])}
      myBooleanLikeFunc={props.myBooleanLikeFunc?.("a", 42, [1, 2, 3])}
      myFuncWithNothing={props.myFuncWithNothing?.("a", 42, [1, 2, 3])}
    />
  );
}

export function registerFunctionPropType() {
  registerComponent(FunctionPropType, {
    name: "test-function-prop-type",
    displayName: "Function Prop Type",
    props: {
      myTextLikeFunc: {
        type: "function",
        argNames: ["arg1", "arg2", "arg3"],
        argValues: (props: any, ctx: any, path: any) => ["hey", 42, path],
        control: {
          type: "string",
          defaultValueHint: "hello",
          defaultValue: "blah",
          hidden: () => true, // should be ignored
        },
      } as any,
      myBooleanLikeFunc: {
        type: "function",
        argNames: ["arg1", "arg2", "arg3"],
        argValues: (props: any, ctx: any, path: any) => ["hey", 42, path],
        control: {
          type: "boolean",
          defaultValue: false,
        },
      } as any,
      myFuncWithNothing: {
        type: "function",
      } as any,
    },
    importName: "FunctionBodyPropType",
    importPath: "../code-components/FunctionBodyPropType",
  });
}
