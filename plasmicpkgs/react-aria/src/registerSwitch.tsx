import React from "react";
import type { SwitchProps } from "react-aria-components";
import { Switch } from "react-aria-components";
import { COMMON_STYLES, getCommonProps } from "./common";
import { DESCRIPTION_COMPONENT_NAME } from "./registerDescription";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
} from "./utils";
import { pickAriaComponentVariants, WithVariants } from "./variant-utils";

const SWITCH_VARIANTS = [
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
  "selected" as const,
  "disabled" as const,
  "readonly" as const,
];

const { variants, withObservedValues } =
  pickAriaComponentVariants(SWITCH_VARIANTS);

interface BaseSwitchProps
  extends SwitchProps,
    WithVariants<typeof SWITCH_VARIANTS> {
  children: React.ReactNode;
}

export function BaseSwitch(props: BaseSwitchProps) {
  const { children, plasmicUpdateVariant, ...rest } = props;
  return (
    <Switch {...rest} style={COMMON_STYLES}>
      {({
        isHovered,
        isPressed,
        isFocused,
        isFocusVisible,
        isSelected,
        isDisabled,
        isReadOnly,
      }) =>
        withObservedValues(
          children,
          {
            hovered: isHovered,
            pressed: isPressed,
            focused: isFocused,
            focusVisible: isFocusVisible,
            selected: isSelected,
            disabled: isDisabled,
            readonly: isReadOnly,
          },
          plasmicUpdateVariant
        )
      }
    </Switch>
  );
}

export function registerSwitch(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseSwitch>
) {
  registerComponentHelper(
    loader,
    BaseSwitch,
    {
      name: makeComponentName("switch"),
      displayName: "Aria Switch",
      importPath: "@plasmicpkgs/react-aria/skinny/registerSwitch",
      importName: "BaseSwitch",
      variants,
      defaultStyles: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: 0,
      },
      props: {
        ...getCommonProps<BaseSwitchProps>("switch", [
          "name",
          "isDisabled",
          "isReadOnly",
          "autoFocus",
          "aria-label",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: [
            {
              type: "hbox",
              styles: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: 0,
              },
              children: [
                {
                  // the track
                  type: "hbox",
                  styles: {
                    width: "30px",
                    height: "16px",
                    padding: 0,
                    backgroundColor: "#D5D5D5",
                    cursor: "pointer",
                    borderRadius: "999px",
                  },
                  children: {
                    // the thumb
                    type: "hbox",
                    styles: {
                      width: "12px",
                      height: "12px",
                      position: "absolute",
                      top: "2px",
                      left: "2px",
                      borderRadius: "100%",
                      backgroundColor: "#fff",
                      padding: 0,
                      transitionProperty: "all",
                      transitionDuration: "0.5s",
                      transitionTimingFunction: "ease-in-out",
                    },
                  },
                },
                {
                  // the label
                  type: "component",
                  name: LABEL_COMPONENT_NAME,
                  props: {
                    children: {
                      type: "text",
                      value: "Label",
                    },
                  },
                },
              ],
            },
            {
              type: "component",
              name: DESCRIPTION_COMPONENT_NAME,
              styles: {
                fontSize: "12px",
              },
              props: {
                children: {
                  type: "text",
                  value: "Use the registered variants to see it in action...",
                },
              },
            },
          ],
        },
        value: {
          type: "string",
          description:
            'The value of the switch in "selected" state, used when submitting an HTML form.',
          defaultValueHint: "on",
        },
        isSelected: {
          type: "boolean",
          editOnly: true,
          displayName: "Default Selected",
          uncontrolledProp: "defaultSelected",
          description: "Whether the switch should be selected by default",
          defaultValueHint: false,
        },
        onChange: {
          type: "eventHandler",
          argTypes: [{ name: "isSelected", type: "boolean" }],
        },
      },
      states: {
        isSelected: {
          type: "writable",
          valueProp: "isSelected",
          onChangeProp: "onChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
