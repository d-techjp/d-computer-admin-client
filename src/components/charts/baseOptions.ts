import type { ApexOptions } from "apexcharts";

import { categoricalPalette, chromeFor } from "@/lib/chart-colors";
import { FONT_FAMILY } from "@/lib/antd-theme";
import type { ThemeMode } from "@/store/useThemeStore";

/**
 * Cấu hình nền chung cho mọi biểu đồ. Mỗi loại chart sẽ merge thêm phần riêng,
 * rồi caller còn có thể ghi đè lần nữa qua prop `options` — giữ đúng tinh thần
 * DEFAULT_OPTIONS + onEditOption của bản gốc.
 *
 * Nguyên tắc trình bày (theo skill dataviz):
 *  - nét mảnh: đường 2px, marker >= 8px khi hover
 *  - lưới/trục là hairline liền nét, lùi một tông so với nền
 *  - không nhãn trên mọi điểm; legend luôn có khi >= 2 series
 */
export function baseChartOptions(mode: ThemeMode): ApexOptions {
  const chrome = chromeFor(mode);

  return {
    chart: {
      fontFamily: FONT_FAMILY,
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 300 },
    },
    theme: { mode },
    colors: categoricalPalette(mode),
    dataLabels: { enabled: false },
    grid: {
      borderColor: chrome.grid,
      strokeDashArray: 0,
      padding: { left: 8, right: 8, top: 0, bottom: 0 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    stroke: { width: 2, curve: "smooth", lineCap: "round" },
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "left",
      fontSize: "12px",
      markers: { size: 6, strokeWidth: 0 },
      itemMargin: { horizontal: 10, vertical: 4 },
      labels: { colors: chrome.textPrimary },
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: mode,
      style: { fontSize: "12px", fontFamily: FONT_FAMILY },
    },
    xaxis: {
      axisBorder: { color: chrome.axis },
      axisTicks: { color: chrome.axis },
      labels: { style: { colors: chrome.textMuted, fontSize: "12px" } },
      crosshairs: { stroke: { color: chrome.axis, width: 1, dashArray: 0 } },
    },
    yaxis: {
      labels: { style: { colors: chrome.textMuted, fontSize: "12px" } },
    },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
    noData: { text: "Không có dữ liệu" },
  };
}
