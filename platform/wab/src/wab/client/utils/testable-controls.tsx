import { dbg } from "@/wab/shared/dbg";
import { DEVFLAGS } from "@/wab/shared/devflags";
import { reactNodeToString } from "@/wab/shared/react-utils";
import * as React from "react";
import { ReactNode } from "react";
import { unstable_batchedUpdates } from "react-dom";

/**
 * This is needed to be able to interact with Selects even when the Cypress test runner is out of focus (so developers
 * don't have to wait and keep the window in focus).
 *
 * Otherwise, strange things happen, such as:
 *
 * - Selecting values doesn't work
 * - Selecting values causes surrounding modal to be closed
 */
export function useTestableSelect(props: {
  name?: string;
  onChange?: (value: any) => void;
  children?: ReactNode;
  options?: any[];
  "data-plasmic-prop"?: string;
}) {
  const selectName = props.name ?? props["data-plasmic-prop"];
  if (DEVFLAGS.runningInCypress && selectName) {
    (dbg.testControls = dbg.testControls ?? {})[selectName] = {
      setByValue(value: any) {
        props.onChange?.(value);
        return value;
      },
      setByLabel(label: any) {
        // Note: very quick and dirty. Doesn't handle many cases.
        function* flattenChildrenOptions(children: ReactNode) {
          for (const child of React.Children.toArray(children)) {
            if (React.isValidElement(child)) {
              yield* flattenChildrenOptions(
                Array.isArray(child.props.children) ? child.props.children : []
              );
              yield child;
            }
          }
        }
        const value =
          props.options?.find((option) => option.label === label) ??
          (
            [...flattenChildrenOptions(props.children ?? [])].find((option) =>
              reactNodeToString(option).includes(label)
            ) as any
          )?.props?.value;
        if (value !== undefined) {
          unstable_batchedUpdates(() => {
            props.onChange?.(value);
          });
          return value;
        }
        return undefined;
      },
    };
  }
}
