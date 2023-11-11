import type { ArrayType, ChoiceType } from "@plasmicapp/host/registerComponent";
import React from "react";

export interface ObjectSectionType<T extends object> {
  label?: string;
  items?: ObjectItemType<T>[];
}
interface FlexSectionType<T extends object> {
  label?: string;
  items?: FlexItemType<T>[];
}

export type ObjectItemType<T extends object> = StrictOptionType | T;
type FlexItemType<T extends object> = ObjectItemType<T> | string;

export type FlexOptionType<T extends object> =
  | FlexItemType<T>
  | FlexSectionType<T>;

export type ObjectOptionType<T extends object> =
  | ObjectSectionType<T>
  | ObjectItemType<T>;

export interface HasOptions<T extends object> {
  options?: FlexOptionType<T>[];
  optionInfo?: (option: FlexOptionType<T>) =>
    | {
        type?: "item";
        value: string;
        label?: string;
        isDisabled?: boolean;
      }
    | {
        type: "section";
        label?: string;
        items?: FlexOptionType<T>[];
      };
}

export interface StrictItemType {
  type?: "item";
  value: string;
  label?: string;
  isDisabled?: boolean;
}

export interface StrictSectionType {
  type: "section";
  label?: string;
  items?: StrictItemType[];
  key: string;
}

export type StrictOptionType = StrictItemType | StrictSectionType;

export function useStrictOptions<T extends object>(props: HasOptions<T>) {
  const { options, optionInfo } = props;
  return React.useMemo(() => {
    return deriveStrictOptions({ options, optionInfo });
  }, [options, optionInfo]);
}

export function deriveStrictOptions<T extends object>(props: HasOptions<T>) {
  const { options, optionInfo } = props;

  let sectionCount = 0;

  const makeStrict = (op: FlexOptionType<T>): StrictOptionType | undefined => {
    if (!op) {
      return undefined;
    } else if (typeof op === "string" || typeof op === "number") {
      const item = {
        value: op,
      };
      return item;
    } else if (optionInfo) {
      const info = optionInfo(op);
      if (info.type === "section") {
        const section: StrictSectionType = {
          type: "section",
          items: info.items
            ?.map?.((item) => makeStrict(item) as StrictItemType)
            ?.filter((x) => !!x),
          label: info.label,
          key: `section-${sectionCount}`,
        };
        sectionCount += 1;
        return section;
      } else {
        let item = info;
        if (!("value" in item)) {
          item = {
            type: "item",
            value: JSON.stringify(item),
          };
        }
        return item;
      }
    } else if (typeof op === "object") {
      if ("items" in op) {
        const section: StrictSectionType = {
          type: "section",
          items: op.items
            ?.map?.((item) => makeStrict(item) as StrictItemType)
            ?.filter((x) => !!x),
          label: op.label,
          key: `section-${sectionCount}`,
        };
        sectionCount += 1;
        return section;
      } else {
        let item = op;
        if (!("value" in item)) {
          item = {
            type: "item",
            value: JSON.stringify(item),
          };
        }
        return item;
      }
    } else {
      return undefined;
    }
  };

  const strictOptions = options
    ?.map(makeStrict)
    ?.filter((x): x is StrictOptionType => !!x);

  const optionText = (op: StrictItemType) => {
    return op.label ?? op.value;
  };

  return { options: strictOptions, optionText };
}

export function flattenOptions(
  options: (StrictItemType | StrictSectionType)[] | undefined
): StrictItemType[] {
  if (!options) {
    return [];
  } else {
    return options.flatMap((op) =>
      op.type === "section" ? op.items ?? [] : op
    );
  }
}

export function makeOptionsPropType() {
  const type: ArrayType<HasOptions<any>> = {
    type: "array",
    itemType: {
      type: "object",
      nameFunc: (item: any) => item.label || item.value,
      fields: {
        type: {
          type: "choice",
          options: [
            { value: "option", label: "Option" },
            { value: "option-group", label: "Option Group" },
          ],
          defaultValue: "option",
        },
        value: {
          type: "string",
          hidden: (_ps: any, _ctx: any, { item }: any) =>
            item.type !== "option",
        },
        label: "string",
        items: {
          type: "array",
          displayName: "Options",
          hidden: (_ps: any, _ctx: any, { item }: any) => {
            return item.type !== "option-group";
          },
          itemType: {
            type: "object",
            nameFunc: (item: any) => item.label || item.value,
            fields: {
              value: "string",
              label: "string",
            },
          },
        },
      },
    },
    defaultValue: [
      {
        value: "option1",
        label: "Option 1",
        type: "option",
      },
      {
        value: "option2",
        label: "Option 2",
        type: "option",
      },
    ],
  };
  return type;
}

export function makeValuePropType() {
  const type: ChoiceType<HasOptions<any>> = {
    type: "choice",
    options: (ps) => {
      const { options, optionText } = deriveStrictOptions(ps);
      return flattenOptions(options).map((op) => ({
        value: op.value,
        label: optionText(op),
      }));
    },
  };
  return type;
}
