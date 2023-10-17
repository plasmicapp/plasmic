import {
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import deepmerge from "deepmerge";
import React, { useEffect } from "react";
import { Scatter } from "react-chartjs-2";
import {
  BaseChartProps,
  ChartAreaPlugin,
  prepData,
  prepOptions,
  useIsClient,
} from "../common";

export type SimpleScatterProps = BaseChartProps;

export function SimpleScatter(props: SimpleScatterProps) {
  const { className } = props;
  const isClient = useIsClient();
  useEffect(() => {
    ChartJS.register(
      ChartAreaPlugin,
      LinearScale,
      PointElement,
      LineElement,
      Tooltip,
      Legend,
      Title
    );
  }, []);
  if (!isClient) {
    return null;
  }
  const normalized = prepData(props, { isScatter: true, opacity: 1 });
  const options = prepOptions(props);

  return (
    <div className={className}>
      <Scatter
        options={deepmerge.all([
          ...options,
          {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        ])}
        data={normalized}
      />
    </div>
  );
}
