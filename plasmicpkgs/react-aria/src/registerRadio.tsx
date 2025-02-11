import { PlasmicElement } from "@plasmicapp/host";
import React, { useEffect, useState } from "react";
import type { RadioProps } from "react-aria-components";
import { Radio, RadioGroup } from "react-aria-components";
import { COMMON_STYLES, getCommonProps } from "./common";
import { PlasmicRadioGroupContext } from "./contexts";
import { LABEL_COMPONENT_NAME } from "./registerLabel";
import {
  BaseControlContextData,
  CodeComponentMetaOverrides,
  HasControlContextData,
  Registerable,
  makeComponentName,
  registerComponentHelper,
} from "./utils";
import { WithVariants, pickAriaComponentVariants } from "./variant-utils";

const RADIO_VARIANTS = [
  "selected" as const,
  "hovered" as const,
  "pressed" as const,
  "focused" as const,
  "focusVisible" as const,
  "disabled" as const,
  "readonly" as const,
  "selected" as const,
];

export interface BaseRadioControlContextData extends BaseControlContextData {
  idError?: string;
}

export interface BaseRadioProps
  extends RadioProps,
    HasControlContextData<BaseRadioControlContextData>,
    WithVariants<typeof RADIO_VARIANTS> {
  children: React.ReactNode;
}

const { variants, withObservedValues } =
  pickAriaComponentVariants(RADIO_VARIANTS);

export function BaseRadio(props: BaseRadioProps) {
  const {
    children,
    setControlContextData,
    plasmicUpdateVariant,
    value,
    ...rest
  } = props;
  const contextProps = React.useContext(PlasmicRadioGroupContext);
  const isStandalone = !contextProps;
  const [registeredId, setRegisteredId] = useState<string>("");

  useEffect(() => {
    if (!contextProps?.idManager) {
      return;
    }

    const localId = contextProps.idManager.register(value);
    setRegisteredId(localId);

    return () => {
      contextProps.idManager.unregister(localId);
      setRegisteredId("");
    };
  }, [value, contextProps?.idManager]);

  setControlContextData?.({
    parent: contextProps,
    idError: (() => {
      if (value === undefined) {
        return "Value must be defined";
      }
      if (typeof value !== "string") {
        return "Value must be a string";
      }
      if (!value.trim()) {
        return "Value must be defined";
      }
      if (!isStandalone && value != registeredId) {
        return "Value must be unique";
      }
      return undefined;
    })(),
  });

  const radio = (
    <Radio
      {...rest}
      value={registeredId}
      key={registeredId}
      style={COMMON_STYLES}
    >
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
    </Radio>
  );

  if (isStandalone) {
    return <RadioGroup>{radio}</RadioGroup>;
  }

  return radio;
}

export const makeDefaultRadioChildren = (label: string): PlasmicElement => ({
  type: "hbox",
  styles: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: 0,
  },
  children: [
    {
      type: "box",
      styles: {
        width: "7px",
        height: "7px",
        borderRadius: "100%",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "black",
      },
    },
    {
      type: "component",
      name: LABEL_COMPONENT_NAME,
      props: {
        children: {
          type: "text",
          value: label,
        },
      },
    },
  ],
});

export function registerRadio(
  loader?: Registerable,
  overrides?: CodeComponentMetaOverrides<typeof BaseRadio>
) {
  return registerComponentHelper(
    loader,
    BaseRadio,
    {
      name: makeComponentName("radio"),
      displayName: "Aria Radio",
      importPath: "@plasmicpkgs/react-aria/skinny/registerRadio",
      importName: "BaseRadio",
      variants,
      props: {
        ...getCommonProps<BaseRadioProps>("radio", [
          "isDisabled",
          "autoFocus",
          "aria-label",
        ]),
        children: {
          type: "slot",
          mergeWithParent: true,
          defaultValue: makeDefaultRadioChildren("Radio"),
        },
        value: {
          type: "string",
          description:
            "The value of the input element, used when submitting an HTML form.",
          validator: (_value, _props, ctx) => {
            if (ctx?.idError) {
              return ctx.idError;
            }
            return true;
          },
        },
      },
      trapsFocus: true,
    },
    overrides
  );
}
