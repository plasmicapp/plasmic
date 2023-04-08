import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import deepmerge from "deepmerge";
import React, { useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  BaseChartProps,
  ChartAreaPlugin,
  prepData,
  prepOptions,
  useIsClient,
} from "../common";

export interface SimpleLineProps extends BaseChartProps {
  fill?: boolean;
  secondAxisField?: string;
}

export function SimpleLine(props: SimpleLineProps) {
  const { secondAxisField, fill, className } = props;
  const isClient = useIsClient();
  useEffect(() => {
    ChartJS.register(
      ChartAreaPlugin,
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Filler,
      Legend
    );
  }, []);
  if (!isClient) {
    return null;
  }
  const normalized = prepData(props, {
    extras: (field) => ({
      fill,
      pointRadius: 0,
      yAxisID: field === secondAxisField ? "y1" : "y",
    }),
  });
  const options = prepOptions(props);
  return (
    <div className={className}>
      <Line
        options={deepmerge.all([
          ...options,
          secondAxisField
            ? {
                scales: {
                  y: {
                    type: "linear" as const,
                    display: true,
                    position: "left" as const,
                  },
                  y1: {
                    type: "linear" as const,
                    display: true,
                    position: "right" as const,
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                },
              }
            : {},
        ])}
        data={normalized}
      />
    </div>
  );
}
