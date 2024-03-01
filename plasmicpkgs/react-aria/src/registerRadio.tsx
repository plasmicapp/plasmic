import { DataProvider } from "@plasmicapp/host";
import React, { ReactNode } from "react";
import type { RadioProps } from "react-aria-components";
import { Radio } from "react-aria-components";
import { getCommonInputProps } from "./common";
import {
  CodeComponentMetaOverrides,
  makeComponentName,
  Registerable,
  registerComponentHelper,
  ValueObserver,
} from "./utils";

interface BaseRadioProps extends RadioProps {
  onPressChange: (isPressed: boolean) => void;
  onFocusVisibleChange: (isFocusVisible: boolean) => void;
}

export function BaseRadio(props: BaseRadioProps) {
  const {
    children,
    onPressChange,
    onFocusVisibleChange,
    onHoverChange,
    ...rest
  } = props;

  return (
    <>
      <Radio {...rest}>
        {({ isFocusVisible, isPressed, isHovered }) => (
          // TODO: Remove DataProvider once Interaction variants are implemented for Code components
          <DataProvider
            name="states"
            data={{ isFocusVisible, isPressed, isHovered }}
          >
            <ValueObserver
              value={isFocusVisible}
              onChange={onFocusVisibleChange}
            />
            <ValueObserver value={isPressed} onChange={onPressChange} />
            <ValueObserver value={isHovered} onChange={onHoverChange} />
            {children as ReactNode}
          </DataProvider>
        )}
      </Radio>
    </>
  );
}

export function registerRadio(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseRadio>
) {
  registerComponentHelper(
    loader,
    BaseRadio,
    {
      name: makeComponentName("radio"),
      displayName: "BaseRadio",
      importPath: "@plasmicpkgs/react-aria/registerRadio",
      // TODO: Remove DataProvider once Interaction variants are implemented for Code components
      providesData: true,
      importName: "BaseRadio",
      props: {
        ...getCommonInputProps<BaseRadioProps>("radio", [
          "isDisabled",
          "autoFocus",
          "aria-label",
          "children",
        ]),
        value: {
          type: "string",
          description:
            "The value of the input element, used when submitting an HTML form.",
        },
        onHoverChange: {
          type: "eventHandler",
          argTypes: [{ name: "isHovered", type: "boolean" }],
        },
        onFocusChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocused", type: "boolean" }],
        },
        onPressChange: {
          type: "eventHandler",
          argTypes: [{ name: "isPressed", type: "boolean" }],
        },
        onFocusVisibleChange: {
          type: "eventHandler",
          argTypes: [{ name: "isFocusVisible", type: "boolean" }],
        },
      },
      states: {
        isHovered: {
          type: "readonly",
          onChangeProp: "onHoverChange",
          variableType: "boolean",
        },
        isPressed: {
          type: "readonly",
          onChangeProp: "onPressChange",
          variableType: "boolean",
        },
        isFocused: {
          type: "readonly",
          onChangeProp: "onFocusChange",
          variableType: "boolean",
        },
        isFocusVisible: {
          type: "readonly",
          onChangeProp: "onFocusVisibleChange",
          variableType: "boolean",
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
