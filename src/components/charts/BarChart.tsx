"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";

import { chromeFor } from "@/lib/chart-colors";
import { deepMerge } from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";

import { ReactApexChart, type BaseChartProps } from "./ApexBase";
import { baseChartOptions } from "./baseOptions";
import { ChartWrapper, type ChartWrapperProps } from "./ChartWrapper";

export interface BarSeries {
  name: string;
  data: number[];
}

interface BarChartProps
  extends BaseChartProps,
    Pick<
      ChartWrapperProps,
      "title" | "description" | "loading" | "extra" | "className"
    > {
  series: BarSeries[];
  categories: string[];
  horizontal?: boolean;
  stacked?: boolean;
  valueFormatter?: (value: number) => string;
}

export function BarChart({
  title,
  description,
  loading,
  extra,
  series,
  categories,
  horizontal = false,
  stacked = false,
  height = 320,
  valueFormatter,
  options,
  className,
}: BarChartProps) {
  const mode = useThemeStore((state) => state.mode);
  const chrome = chromeFor(mode);

  const isEmpty =
    series.length === 0 ||
    series.every((s) => s.data.every((value) => !value));

  const mergedOptions = useMemo<ApexOptions>(
    () =>
      deepMerge<ApexOptions>(
        baseChartOptions(mode),
        {
          chart: { type: "bar", stacked },
          plotOptions: {
            bar: {
              horizontal,
              // Cột mảnh + bo 4px ở đầu dữ liệu, chân cột vẫn dính baseline
              columnWidth: "45%",
              barHeight: "55%",
              borderRadius: 4,
              borderRadiusApplication: "end",
              borderRadiusWhenStacked: "last",
            },
          },
          // Khe 2px màu nền giữa các mảng chồng thay cho việc kẻ viền
          stroke: stacked
            ? { show: true, width: 2, colors: [chrome.surface] }
            : { show: false, width: 0 },
          grid: {
            xaxis: { lines: { show: horizontal } },
            yaxis: { lines: { show: !horizontal } },
          },
          xaxis: { categories },
          ...(valueFormatter && {
            yaxis: { labels: { formatter: valueFormatter } },
          }),
          tooltip: {
            shared: stacked,
            intersect: !stacked,
            ...(valueFormatter && { y: { formatter: valueFormatter } }),
          },
          legend: { show: series.length > 1 },
        },
        options,
      ),
    [
      mode,
      horizontal,
      stacked,
      categories,
      valueFormatter,
      options,
      series.length,
      chrome.surface,
    ],
  );

  return (
    <ChartWrapper
      title={title}
      description={description}
      loading={loading}
      isEmpty={isEmpty}
      height={height}
      extra={extra}
      className={className}
    >
      <ReactApexChart
        type="bar"
        series={series}
        options={mergedOptions}
        height={height}
      />
    </ChartWrapper>
  );
}

export default BarChart;
