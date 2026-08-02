"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";

import { chromeFor } from "@/lib/chart-colors";
import { deepMerge } from "@/lib/utils";
import { useThemeStore } from "@/store/useThemeStore";

import { ReactApexChart, type BaseChartProps } from "./ApexBase";
import { baseChartOptions } from "./baseOptions";
import { ChartWrapper, type ChartWrapperProps } from "./ChartWrapper";

interface PieDonutChartProps
  extends BaseChartProps,
    Pick<
      ChartWrapperProps,
      "title" | "description" | "loading" | "extra" | "className"
    > {
  series: number[];
  labels: string[];
  /** Gán màu cố định theo thực thể (vd trạng thái đơn hàng), không theo thứ hạng */
  colors?: string[];
  donut?: boolean;
  valueFormatter?: (value: number) => string;
}

export function PieDonutChart({
  title,
  description,
  loading,
  extra,
  series,
  labels,
  colors,
  donut = true,
  height = 320,
  valueFormatter,
  options,
  className,
}: PieDonutChartProps) {
  const mode = useThemeStore((state) => state.mode);
  const chrome = chromeFor(mode);

  const isEmpty = series.length === 0 || series.every((value) => !value);

  const mergedOptions = useMemo<ApexOptions>(
    () =>
      deepMerge<ApexOptions>(
        baseChartOptions(mode),
        {
          chart: { type: donut ? "donut" : "pie" },
          labels,
          ...(colors && { colors }),
          // Khe 2px màu nền tách các lát, không dùng viền
          stroke: { show: true, width: 2, colors: [chrome.surface] },
          plotOptions: {
            pie: {
              donut: {
                size: donut ? "68%" : "0%",
                labels: {
                  show: donut,
                  value: {
                    fontSize: "20px",
                    fontWeight: 700,
                    color: chrome.textPrimary,
                    formatter: valueFormatter,
                  },
                  total: {
                    show: donut,
                    label: "Tổng",
                    color: chrome.textMuted,
                    fontSize: "12px",
                    formatter: (w: {
                      globals: { seriesTotals: number[] };
                    }) => {
                      const total = w.globals.seriesTotals.reduce(
                        (sum, value) => sum + value,
                        0,
                      );
                      return valueFormatter
                        ? valueFormatter(total)
                        : String(total);
                    },
                  },
                },
              },
            },
          },
          legend: { position: "right", horizontalAlign: "center" },
          tooltip: {
            shared: false,
            intersect: false,
            ...(valueFormatter && { y: { formatter: valueFormatter } }),
          },
          responsive: [
            {
              breakpoint: 640,
              options: { legend: { position: "bottom" } },
            },
          ],
        },
        options,
      ),
    [
      mode,
      donut,
      labels,
      colors,
      valueFormatter,
      options,
      chrome.surface,
      chrome.textPrimary,
      chrome.textMuted,
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
        type={donut ? "donut" : "pie"}
        series={series}
        options={mergedOptions}
        height={height}
      />
    </ChartWrapper>
  );
}

export default PieDonutChart;
