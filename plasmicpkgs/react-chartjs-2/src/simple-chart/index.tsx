import { ComponentMeta } from "@plasmicapp/host/registerComponent";
import { Registerable, registerComponentHelper } from "../utils";
import { SimpleChart, SimpleChartProps } from "./SimpleChart";

export * from "./SimpleChart";
export default SimpleChart;

const simpleChartMeta: ComponentMeta<SimpleChartProps> = {
  name: "hostless-react-chartjs-2-simple-chart",
  displayName: "Chart",
  props: {
    type: {
      type: "choice",
      options: [
        {
          value: "bar",
          label: "Bar",
        },
        {
          value: "line",
          label: "Line",
        },
        {
          value: "scatter",
          label: "Scatter",
        },
      ],
      defaultValueHint: "bar",
    },
    data: {
      type: "exprEditor" as any,
      description: "The data as an array of objects",
      defaultExpr: JSON.stringify([
        {
          region: "APAC",
          revenue: 3294,
          spend: 2675,
        },
        {
          region: "EMEA",
          revenue: 3245,
          spend: 3895,
        },
        {
          region: "LATAM",
          revenue: 2165,
          spend: 3498,
        },
        {
          region: "AMER",
          revenue: 3215,
          spend: 1656,
        },
      ]),
    },
    labelField: {
      type: "choice",
      hidden: (props) => props.type === "scatter",
      options: (props) => (props.data?.[0] ? Object.keys(props.data[0]) : []),
    },
    title: "string",
    fill: {
      type: "boolean",
      hidden: (props) => props.type !== "line",
    },
    // TODO
    // datasets: {
    //   type: "array",
    //   unstable__keyFunc: (x) => x.key,
    //   unstable__minimalValue: (_props, ctx) => null,
    //   itemType: {
    //     type: "object",
    //     fields: {
    //       label: "string",
    //       fieldId: "string",
    //       hidden: {
    //         type: "boolean",
    //       },
    //     },
    //   },
    // },
  },

  defaultStyles: {
    width: "stretch",
  },

  importName: "SimpleChart",
  importPath: "@plasmicpkgs/react-chartjs-2/dist/simple-chart/SimpleChart",
};

export function registerSimpleChart(loader?: Registerable) {
  registerComponentHelper(loader, SimpleChart, simpleChartMeta);
}
