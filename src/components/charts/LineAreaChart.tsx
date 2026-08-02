"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";

import { deepMerge } from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";

import { ReactApexChart, type BaseChartProps } from "./ApexBase";
import { baseChartOptions } from "./baseOptions";
import { ChartWrapper, type ChartWrapperProps } from "./ChartWrapper";

export interface LineSeries {
  name: string;
  data: number[];
}

interface LineAreaChartProps
  extends BaseChartProps,
    Pick<
      ChartWrapperProps,
      "title" | "description" | "loading" | "extra" | "className"
    > {
  series: LineSeries[];
  categories: string[];
  /** Tô nền dưới đường — dùng cho biểu đồ xu hướng doanh thu */
  area?: boolean;
  valueFormatter?: (value: number) => string;
}

export function LineAreaChart({
  title,
  description,
  loading,
  extra,
  series,
  categories,
  area = false,
  height = 320,
  valueFormatter,
  options,
  className,
}: LineAreaChartProps) {
  const mode = useThemeStore((state) => state.mode);

  const isEmpty =
    series.length === 0 ||
    series.every((s) => s.data.every((value) => !value));

  const mergedOptions = useMemo<ApexOptions>(
    () =>
      deepMerge<ApexOptions>(
        baseChartOptions(mode),
        {
          chart: { type: area ? "area" : "line" },
          // Vùng tô rất nhạt để đường vẫn là mark chính
          fill: area
            ? {
                type: "gradient",
                gradient: {
                  shadeIntensity: 0,
                  opacityFrom: 0.28,
                  opacityTo: 0.02,
                  stops: [0, 95],
                },
              }
            : { type: "solid", opacity: 0 },
          markers: { size: 0, hover: { size: 6 } },
          xaxis: { categories, tooltip: { enabled: false } },
          ...(valueFormatter && {
            yaxis: { labels: { formatter: valueFormatter } },
            tooltip: { y: { formatter: valueFormatter } },
          }),
          // Một series thì tiêu đề đã gọi tên nó rồi, không cần legend
          legend: { show: series.length > 1 },
        },
        options,
      ),
    [mode, area, categories, valueFormatter, options, series.length],
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
        type={area ? "area" : "line"}
        series={series}
        options={mergedOptions}
        height={height}
      />
    </ChartWrapper>
  );
}

export default LineAreaChart;
