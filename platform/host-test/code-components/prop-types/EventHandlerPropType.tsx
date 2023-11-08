import React from "react";
import { registerComponent } from "@plasmicapp/host";
import DisplayProps from "./DisplayProps";

interface EventHandlerPropTypeProps {
  name: string;
  age: number;
  onEvent1: () => any;
  onEvent2: (name: string, age: number) => any;
}

export function EventHandlerPropType(props: EventHandlerPropTypeProps) {
  return (
    <DisplayProps
      {...props}
      event1={props.onEvent1()}
      event2={props.onEvent2(props.name, props.age)}
    />
  );
}

export function registerEventHandlerPropType() {
  registerComponent(EventHandlerPropType, {
    name: "test-event-handler-prop-type",
    displayName: "Event Handler Prop Type",
    props: {
      name: "string",
      age: "number",
      onEvent1: {
        type: "eventHandler",
        argTypes: [],
      },
      onEvent2: {
        type: "eventHandler",
        argTypes: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "age",
            type: "number",
          },
          {
            name: "gender",
            type: {
              type: "choice",
              options: () => ["M", "F", "X"],
            },
          },
        ],
      },
    },
    importName: "EventHandlerPropType",
    importPath: "../code-components/EventHandlerPropType",
  });
}
