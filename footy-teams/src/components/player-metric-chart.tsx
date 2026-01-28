"use client";

import { useEffect, useRef } from "react";
import * as Plot from "@observablehq/plot";

type DataPoint = {
  date: string;
  value: number;
};

type Props = {
  data: DataPoint[];
  yLabel: string;
};

export function PlayerMetricChart({ data, yLabel }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    if (data.length === 0) return;

    const sortedData = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const maxValue = Math.max(0, ...sortedData.map((point) => point.value));
    const yMax = Math.max(1, Math.ceil(maxValue * 1.1));
    const lineColor = "#0f766e";
    const dotColor = "#14b8a6";

    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });

    const plot = Plot.plot({
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12,
      },
      height: 280,
      marginTop: 22,
      marginRight: 12,
      marginBottom: 52,
      marginLeft: 60,
      x: {
        type: "utc",
        label: "Session",
        tickRotate: -20,
        tickPadding: 6,
        tickSize: 6,
        tickFormat: (d) => dateFormatter.format(d as Date),
      },
      y: {
        label: yLabel,
        labelAnchor: "top",
        labelOffset: 14,
        domain: [0, yMax],
        tickPadding: 6,
        tickSize: 6,
        tickFormat: (d) => Number(d).toFixed(0),
      },
      marks: [
        Plot.gridY({ stroke: "#cbd5e1", strokeOpacity: 0.9 }),
        Plot.ruleY([0], { stroke: "#94a3b8", strokeOpacity: 0.6 }),
        Plot.axisX(),
        Plot.axisY(),
        Plot.areaY(sortedData, {
          x: (d) => new Date(d.date),
          y: "value",
          fill: lineColor,
          fillOpacity: 0.12,
          curve: "monotone-x",
        }),
        Plot.lineY(sortedData, {
          x: (d) => new Date(d.date),
          y: "value",
          stroke: lineColor,
          strokeWidth: 2,
          curve: "monotone-x",
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }),
        Plot.dot(sortedData, {
          x: (d) => new Date(d.date),
          y: "value",
          fill: dotColor,
          stroke: "white",
          strokeWidth: 1,
          r: 3.5,
        }),
        Plot.dot(
          sortedData,
          Plot.pointer({
            x: (d) => new Date(d.date),
            y: "value",
            r: 6.5,
            fill: "white",
            stroke: lineColor,
            strokeWidth: 2,
          }),
        ),
        Plot.tip(
          sortedData,
          Plot.pointer({
            x: (d) => new Date(d.date),
            y: "value",
            title: (d) =>
              `Date: ${dateFormatter.format(new Date(d.date))}\n${yLabel}: ${Number(d.value).toFixed(0)}`,
          }),
        ),
      ],
    });

    containerRef.current.append(plot);

    return () => {
      plot.remove();
    };
  }, [data, yLabel]);

  return <div ref={containerRef} className="w-full font-sans text-sm" />;
}
