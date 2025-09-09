import { Rate } from "antd";
import React, { ReactElement, useMemo } from "react";
import { Registerable, registerComponentHelper } from "./utils";

type AntdRateProps = Omit<React.ComponentProps<typeof Rate>, "tooltips"> & {
  tooltips?: { label: string }[];
  multiCharacter?: boolean;
  symbols?: React.ReactElement;
};

export function AntdRate(props: AntdRateProps) {
  const { character, count, tooltips, multiCharacter, symbols, ...rest } =
    props;

  const symbolsProp: ReactElement[] = useMemo(
    () =>
      (Array.isArray(symbols?.props?.children)
        ? symbols?.props?.children
        : [symbols]
      )
        ?.filter((c: any) => React.isValidElement(c))
        .map((c: ReactElement) => <>{c}</>) || [],
    [symbols]
  );
  const countProp = useMemo(() => {
    if (!multiCharacter) {
      return count;
    }
    return symbolsProp?.length;
  }, [count, multiCharacter, symbolsProp?.length]);

  const characterProp = useMemo(() => {
    if (!multiCharacter) {
      return character || undefined;
    }
    return symbolsProp?.length
      ? ({ index }: any) => symbolsProp[index]
      : character || undefined;
  }, [character, multiCharacter, symbolsProp]);

  return (
    <Rate
      tooltips={tooltips?.map((t) => t?.label)}
      count={countProp}
      character={characterProp}
      {...rest}
    />
  );
}

export const rateComponentName = "plasmic-antd5-rate";

export function registerRate(loader?: Registerable) {
  registerComponentHelper(loader, AntdRate, {
    name: rateComponentName,
    displayName: "Rate",
    props: {
      allowClear: {
        type: "boolean",
        advanced: true,
        defaultValueHint: true,
        description: "Clear the rating when the user clicks again",
      },
      allowHalf: {
        type: "boolean",
        advanced: true,
        defaultValueHint: false,
        description: "Allow fractional rating.",
      },
      autoFocus: {
        type: "boolean",
        description: "Focus when component is rendered",
        defaultValueHint: false,
        advanced: true,
      },
      character: {
        type: "slot",
        displayName: "Symbol",
        hidePlaceholder: true,
        hidden: (ps: AntdRateProps) => Boolean(ps.multiCharacter),
      },
      multiCharacter: {
        type: "boolean",
        displayName: "Multi Symbol",
        description:
          "Allow different symbols for rating. (You can add these symbols in the component slots if this is enabled)",
        advanced: true,
      },
      symbols: {
        type: "slot",
        displayName: "Symbols",
        hidePlaceholder: true,
        defaultValue: ["1", "2", "3", "4", "5"],
        hidden: (ps: AntdRateProps) => !ps.multiCharacter,
      },
      count: {
        type: "number",
        description: "Rating count",
        defaultValueHint: 5,
        advanced: true,
        hidden: (ps: AntdRateProps) => Boolean(ps.multiCharacter),
      },
      value: {
        type: "number",
        editOnly: true,
        uncontrolledProp: "defaultValue",
        description: "Default rating",
        defaultValueHint: 0,
      },
      disabled: {
        type: "boolean",
        description: "Read-only rating",
        defaultValueHint: false,
      },
      tooltips: {
        type: "array",
        description: "Rating labels",
        displayName: "Labels",
        advanced: true,
        hidden: (ps: AntdRateProps) => !ps.count,
        itemType: {
          type: "object",
          fields: {
            label: "string",
          },
          nameFunc: (value: any) => value.label,
        },
        validator: (value: any, ps: any) => {
          if (!ps.count) {
            return true;
          }
          if (!Array.isArray(value) || value.length === 0) {
            return true;
          }
          if (value.length < ps.count) {
            return `You need ${ps.count - value.length} more labels`;
          }
          if (value.length > ps.count) {
            return "You have too many labels. Some labels will not be used";
          }
          return true;
        },
      },
      onChange: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "value", type: "number" }],
      },
      onBlur: {
        type: "eventHandler",
        advanced: true,
        argTypes: [],
      },
      onFocus: {
        type: "eventHandler",
        advanced: true,
        argTypes: [],
      },
      onHoverChange: {
        type: "eventHandler",
        advanced: true,
        description: "Callback when an item is hovered",
        argTypes: [],
      },
      onKeyDown: {
        type: "eventHandler",
        advanced: true,
        argTypes: [{ name: "event", type: "object" }],
      },
    },
    states: {
      value: {
        type: "writable",
        valueProp: "value",
        onChangeProp: "onChange",
        variableType: "number",
      },
    },

    importPath: "@plasmicpkgs/antd5/skinny/registerRate",
    importName: "AntdRate",
  });
}
