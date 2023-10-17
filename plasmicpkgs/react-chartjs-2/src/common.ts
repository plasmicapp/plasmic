import { Plugin } from "chart.js/dist/types";
import { useEffect, useState } from "react";

export const baseOptions = {
  responsive: true,
  chartArea: {
    // backgroundColor: "#f8fafc",
  },
};

/**
 * These are hand-picked from the Tailwind palette.
 */
export const defaultColors = [
  "hsla(25,95%,53%,1.0)",
  "hsla(38,92%,50%,1.0)",
  "hsla(45,93%,47%,1.0)",
  "hsla(84,81%,44%,1.0)",
  "hsla(142,71%,45%,1.0)",
  "hsla(160,84%,39%,1.0)",
  "hsla(173,80%,40%,1.0)",
  "hsla(199,89%,48%,1.0)",
  "hsla(217,91%,60%,1.0)",
  "hsla(239,84%,67%,1.0)",
  "hsla(258,90%,66%,1.0)",
  "hsla(271,91%,65%,1.0)",
  "hsla(292,84%,61%,1.0)",
  "hsla(293,69%,49%,1.0)",
  "hsla(295,72%,40%,1.0)",
  "hsla(295,70%,33%,1.0)",
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

function range(total: number) {
  return Array.from(Array(total).keys());
}

/**
 * Returns a color from the default color palette.
 *
 * Tries to pick "different" colors that are somewhat spread out on the palette. With a higher 'total' colors requested, the colors will be packed more closely together.
 *
 * We prefer starting from blue when possible. This only starts getting pushed down toward yellow if too many colors requested.
 *
 * If too many colors are requested, it will recycle.
 */
export function getDefaultColor(
  index: number,
  total: number,
  opacity?: number
) {
  const preferredStart = 9;
  const end = defaultColors.length - 1;
  const start = Math.max(0, Math.min(preferredStart, end - total));
  const stops =
    total > defaultColors.length
      ? range(defaultColors.length)
      : range(total).map((_, i) =>
          Math.round(
            start + (total > 1 ? ((1.0 * i) / (total - 1)) * (end - start) : 0)
          )
        );
  const selected = defaultColors[stops[index % stops.length]];
  if (opacity === undefined) {
    return selected;
  }
  return selected.replace("1.0", "" + opacity);
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
        backgroundColor: getDefaultColor(
          index,
          (scatterSeries ?? []).length,
          opacity
        ),
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
          backgroundColor: getDefaultColor(
            index,
            (chosenFields ?? autoChosenFields).length,
            1
          ),
          borderWidth: 2,
          borderColor: getDefaultColor(
            index,
            (chosenFields ?? autoChosenFields).length,
            1
          ),
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
          events: undefined,
        }
      : {
          events: [],
        },
    title
      ? {
          plugins: {
            title: { display: true, text: title },
          },
        }
      : {},
  ];
}

export const ChartAreaPlugin: Plugin = {
  id: "chartAreaPlugin",
  // eslint-disable-next-line object-shorthand
  beforeDraw: (chart) => {
    const chartAreaOptions = (chart.config.options as any).chartArea;
    if (chartAreaOptions && chartAreaOptions.backgroundColor) {
      const ctx = chart.canvas.getContext("2d");
      const { chartArea } = chart;
      if (ctx) {
        ctx.save();
        ctx.fillStyle = chartAreaOptions.backgroundColor;
        // eslint-disable-next-line max-len
        ctx.fillRect(
          chartArea.left,
          chartArea.top,
          chartArea.right - chartArea.left,
          chartArea.bottom - chartArea.top
        );
        ctx.restore();
      }
    }
  },
};
