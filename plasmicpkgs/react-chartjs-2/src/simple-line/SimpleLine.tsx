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
import React, { useEffect, useState } from "react";
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

// Force a re-mount when the secondAxisField is unset / re-set
// https://app.shortcut.com/plasmic/story/38358/chart-component-issues-with-second-axis-field
const useKey = (secondAxisField?: string) => {
  const [key, setKey] = useState(0);

  // change key once when the secondAxisField is unset.
  if (!secondAxisField && key) {
    setKey(0);
  }

  // change key once when the secondAxisField value changes from undefined -> something
  if (secondAxisField && !key) {
    setKey(Math.random());
  }

  return key;
};

export function SimpleLine(props: SimpleLineProps) {
  const { secondAxisField, fill, className } = props;
  const isClient = useIsClient();
  const key = useKey(props.secondAxisField);

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
        key={key}
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
