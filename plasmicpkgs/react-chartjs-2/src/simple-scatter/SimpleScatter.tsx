import {
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import deepmerge from "deepmerge";
import React, { useEffect } from "react";
import { Scatter } from "react-chartjs-2";
import { BaseChartProps, prepData, prepOptions, useIsClient } from "../common";

export interface SimpleScatterProps extends BaseChartProps {}

export function SimpleScatter(props: SimpleScatterProps) {
  const { className } = props;
  const isClient = useIsClient();
  useEffect(() => {
    ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);
  }, []);
  if (!isClient) {
    return null;
  }
  const normalized = prepData(props, { isScatter: true, opacity: 1 });
  const options = prepOptions(props);
  console.log("!!", normalized, options);
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
