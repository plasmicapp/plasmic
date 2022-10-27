import {
  StatArrowProps,
  StatHelpTextProps,
  StatLabelProps,
  StatNumberProps,
  StatProps,
} from "@chakra-ui/react";
import { ComponentMeta } from "@plasmicapp/host/registerComponent";
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

export const statArrowMeta: ComponentMeta<StatArrowProps> = {
  ...getComponentNameAndImportMeta("StatArrow", "Stat"),
  props: {
    type: {
      type: "choice",
      options: ["increase", "decrease"],
    },
  },
};

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
