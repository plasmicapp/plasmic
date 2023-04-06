import { useEffect, useState } from "react";
import { baseOptions } from "./simple-bar/SimpleBar";

export const defaultColors = [
  "rgba(255, 99, 132, 0.2)",
  "rgba(54, 162, 235, 0.2)",
  "rgba(255, 206, 86, 0.2)",
  "rgba(75, 192, 192, 0.2)",
  "rgba(153, 102, 255, 0.2)",
  "rgba(255, 159, 64, 0.2)",
];

export function useIsClient() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(true);
  });
  return loaded;
}

export interface BaseChartProps {
  className?: string;
  data?: Record<string, any>[];
  labelField?: string;
  interactive?: boolean;
  title?: string;
  chosenFields?: string[];
  scatterSeries?: { name: string; fields: [string, string] }[];
}

export interface PrepDataOpts {
  isScatter?: boolean;
  preferNonNumericAsLabel?: boolean;
  extras?: (field: string) => {};
  opacity?: number;
}

export function getDefaultColor(index: number, opacity = 0.2) {
  return defaultColors[index % defaultColors.length].replace(
    "0.2",
    "" + opacity
  );
}

export function prepData(
  { data = [], labelField, chosenFields, scatterSeries }: BaseChartProps,
  { isScatter, preferNonNumericAsLabel, extras, opacity }: PrepDataOpts = {}
) {
  const fields = Object.keys(data[0] ?? {});
  const isFieldAllNumericOrNil = new Map(
    fields.map((key) => [key, data.every((item) => !isNaN(item[key] ?? 0))])
  );
  const realLabelField =
    labelField ??
    (preferNonNumericAsLabel
      ? fields.find((field) => !isFieldAllNumericOrNil.get(field))
      : fields[0]);
  const numericFields = fields.filter((field) =>
    isFieldAllNumericOrNil.get(field)
  );
  if (isScatter) {
    scatterSeries = isScatter
      ? scatterSeries ?? [
          {
            name: `${numericFields[0]}-${numericFields[1]}`,
            fields: [numericFields[0], numericFields[1]] as [string, string],
          },
        ]
      : undefined;
    return {
      datasets: (scatterSeries ?? []).map((series, index) => ({
        ...extras?.(series.name),
        label: series.name,
        data: data.map((item) => ({
          x: item[series.fields[0]] ?? 0,
          y: item[series.fields[1]] ?? 0,
        })),
        backgroundColor: getDefaultColor(index, opacity),
      })),
    };
  } else {
    const autoChosenFields = numericFields.filter(
      (field) => field !== realLabelField
    );
    return {
      labels: realLabelField
        ? data.map((item) => item[realLabelField])
        : undefined,
      datasets: (chosenFields ?? autoChosenFields).map((key, index) => {
        return {
          ...extras?.(key),
          label: key,
          data: data.map((item) => item[key] ?? 0),
          backgroundColor: getDefaultColor(index, opacity),
        };
      }),
    };
  }
}

// additional styling

/*
  elements: {
    bar: {
      borderWidth: 2,
    },
  },

 */

export function prepOptions({ interactive = true, title }: BaseChartProps) {
  return [
    baseOptions,
    interactive
      ? {
          interaction: {
            mode: "index" as const,
            intersect: false,
          },
        }
      : {},
    title ? { title: { display: true, text: title } } : {},
  ];
}
