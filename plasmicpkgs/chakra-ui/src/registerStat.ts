import {
  Stat,
  StatArrow,
  StatArrowProps,
  StatHelpText,
  StatHelpTextProps,
  StatLabel,
  StatLabelProps,
  StatNumber,
  StatNumberProps,
  StatProps,
} from "@chakra-ui/react";
import registerComponent, {
  ComponentMeta,
} from "@plasmicapp/host/registerComponent";
import { Registerable } from "./registerable";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const statMeta: ComponentMeta<StatProps> = {
  ...getComponentNameAndImportMeta("Stat"),
  props: {
    children: {
      type: "slot",
      defaultValue: [
        {
          type: "component",
          name: getPlasmicComponentName("StatLabel"),
          props: { children: { type: "text", value: "Collected Fees" } },
        },
        {
          type: "component",
          name: getPlasmicComponentName("StatNumber"),
          props: { children: { type: "text", value: "£345,670" } },
        },
        {
          type: "component",
          name: getPlasmicComponentName("StatHelpText"),
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
                  name: getPlasmicComponentName("StatArrow"),
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
  ...getComponentNameAndImportMeta("StatHelpText", "Stat"),
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
  ...getComponentNameAndImportMeta("StatArrow", "Stat"),
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
  ...getComponentNameAndImportMeta("StatNumber", "Stat"),
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
  ...getComponentNameAndImportMeta("StatLabel", "Stat"),
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
