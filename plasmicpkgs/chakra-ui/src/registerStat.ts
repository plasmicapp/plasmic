import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import {
  Stat,
  StatProps,
  StatHelpText,
  StatHelpTextProps,
  StatArrow,
  StatArrowProps,
  StatNumber,
  StatNumberProps,
  StatLabel,
  StatLabelProps,
} from "@chakra-ui/react";
import { Registerable } from "./registerable";

export const statMeta: ComponentMeta<StatProps> = {
  name: "Stat",
  importPath: "@chakra-ui/react",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: "StatLabel",
          props: { children: { type: "text", value: "Collected Fees" } },
        },
        {
          type: "component",
          name: "StatNumber",
          props: { children: { type: "text", value: "£345,670" } },
        },
        {
          type: "component",
          name: "StatHelpText",
          props: {
            children: {
              type: "hbox",
              styles: {
                alignItems: "center",
                padding: "0px",
              },
              children: [
                {
                  type: "component",
                  name: "StatArrow",
                  props: { type: "increase" },
                },
                { type: "text", value: "Last 7 days" },
              ],
            },
          },
        },
      ],
    },
  },
};

export function registerStat(
  loader?: Registerable,
  customStatMeta?: ComponentMeta<StatProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(Stat, customStatMeta ?? statMeta);
}

export const statHelpTextMeta: ComponentMeta<StatHelpTextProps> = {
  name: "StatHelpText",
  importPath: "@chakra-ui/react",
  parentComponentName: "Stat",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "StatHelpText",
        },
      ],
    },
  },
};

export function registerStatHelpText(
  loader?: Registerable,
  customStatHelpTextMeta?: ComponentMeta<StatHelpTextProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(StatHelpText, customStatHelpTextMeta ?? statHelpTextMeta);
}

export const statArrowMeta: ComponentMeta<StatArrowProps> = {
  name: "StatArrow",
  importPath: "@chakra-ui/react",
  parentComponentName: "Stat",
  props: {
    type: {
      type: "choice",
      options: ["increase", "decrease"],
    },
  },
};

export function registerStatArrow(
  loader?: Registerable,
  customStatArrowMeta?: ComponentMeta<StatArrowProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(StatArrow, customStatArrowMeta ?? statArrowMeta);
}

export const statNumberMeta: ComponentMeta<StatNumberProps> = {
  name: "StatNumber",
  importPath: "@chakra-ui/react",
  parentComponentName: "Stat",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "£345,670",
        },
      ],
    },
  },
};

export function registerStatNumber(
  loader?: Registerable,
  customStatNumberMeta?: ComponentMeta<StatNumberProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(StatNumber, customStatNumberMeta ?? statNumberMeta);
}

export const statLabelMeta: ComponentMeta<StatLabelProps> = {
  name: "StatLabel",
  importPath: "@chakra-ui/react",
  parentComponentName: "Stat",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "text",
          value: "StatLabel",
        },
      ],
    },
  },
};

export function registerStatLabel(
  loader?: Registerable,
  customStatLabelMeta?: ComponentMeta<StatLabelProps>
) {
  const doRegisterComponent: typeof registerComponent = (...args) =>
    loader ? loader.registerComponent(...args) : registerComponent(...args);
  doRegisterComponent(StatLabel, customStatLabelMeta ?? statLabelMeta);
}
