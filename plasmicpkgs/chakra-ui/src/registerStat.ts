import {
  StatArrowProps,
  StatHelpTextProps,
  StatLabelProps,
  StatNumberProps,
  StatProps,
} from "@chakra-ui/react";
import { type CodeComponentMeta } from "@plasmicapp/host/registerComponent";
import {
  getComponentNameAndImportMeta,
  getPlasmicComponentName,
} from "./utils";

export const statMeta: CodeComponentMeta<StatProps> = {
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

export const statHelpTextMeta: CodeComponentMeta<StatHelpTextProps> = {
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

export const statArrowMeta: CodeComponentMeta<StatArrowProps> = {
  ...getComponentNameAndImportMeta("StatArrow", "Stat"),
  props: {
    type: {
      type: "choice",
      options: ["increase", "decrease"],
    },
  },
};

export const statNumberMeta: CodeComponentMeta<StatNumberProps> = {
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

export const statLabelMeta: CodeComponentMeta<StatLabelProps> = {
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
