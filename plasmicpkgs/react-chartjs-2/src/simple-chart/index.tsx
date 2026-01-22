import {
  CodeComponentMeta,
  PropType,
} from "@plasmicapp/host/registerComponent";
import { Registerable, registerComponentHelper } from "../utils";
import { SimpleChart, SimpleChartProps } from "./SimpleChart";

export * from "./SimpleChart";
export default SimpleChart;

const fieldChoice: PropType<SimpleChartProps> = {
  type: "choice",
  options: (props: SimpleChartProps) =>
    props.data?.[0] ? Object.keys(props.data[0]) : [],
} as const;
const simpleChartMeta: CodeComponentMeta<SimpleChartProps> = {
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
      type: "exprEditor",
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
      ...fieldChoice,
      hidden: (props) => props.type === "scatter",
    },
    title: "string",
    interactive: {
      type: "boolean",
      defaultValueHint: true,
    },
    // Bar chart
    direction: {
      type: "choice",
      options: ["horizontal", "vertical"].map((dir) => ({
        value: dir,
        label: dir[0].toUpperCase() + dir.slice(1),
      })),
      defaultValueHint: "Vertical",
      hidden: ({ type = "bar" }) => type !== "bar",
    },
    stacked: {
      type: "boolean",
      hidden: ({ type = "bar" }) => type !== "bar",
    },
    // Line chart
    fill: {
      type: "boolean",
      hidden: (props) => props.type !== "line",
    },
    secondAxisField: {
      ...fieldChoice,
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
  importPath: "@plasmicpkgs/react-chartjs-2",
};

export function registerSimpleChart(loader?: Registerable) {
  registerComponentHelper(loader, SimpleChart, simpleChartMeta);
}
