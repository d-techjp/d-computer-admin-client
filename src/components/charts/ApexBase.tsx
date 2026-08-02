"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "antd";
import type { ApexOptions } from "apexcharts";

// ApexCharts đụng tới `window` nên phải tắt SSR
export const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <Skeleton.Node active className="w-full!" />,
});

export type ApexSeries = ApexOptions["series"];

export interface BaseChartProps {
  height?: number;
  /** Ghi đè cấu hình mặc định — tương ứng `onEditOption` của bản gốc */
  options?: ApexOptions;
}
