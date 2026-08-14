import type { ThemeMode } from "@/store/useThemeStore";

/**
 * Bảng màu biểu đồ đã chạy qua validator của skill dataviz với đúng surface
 * của dự án (card sáng #ffffff, card tối #1d2636):
 *
 *   light: PASS lightness band / chroma / CVD ΔE 9.1 / normal-vision ΔE 19.6
 *          WARN contrast — 3 slot (aqua, vàng, hồng) dưới 3:1 nên bắt buộc có
 *          legend + direct label/tooltip, không để màu gánh nghĩa một mình.
 *   dark:  PASS toàn bộ, kể cả contrast >= 3:1.
 *
 * Slot 1 lấy đúng màu brand #397dbb (bản dark dùng bậc sáng hơn #5599d6).
 * Thứ tự slot là cố định — không bao giờ xoay vòng hay sinh thêm màu thứ 9.
 */
export const CATEGORICAL_LIGHT = [
  "#397dbb", // 1 - brand blue
  "#eb6834", // 2 - orange
  "#1baf7a", // 3 - aqua
  "#eda100", // 4 - yellow
  "#e87ba4", // 5 - magenta
  "#008300", // 6 - green
  "#4a3aa7", // 7 - violet
  "#e34948", // 8 - red
] as const;

export const CATEGORICAL_DARK = [
  "#5599d6",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
] as const;

export function categoricalPalette(mode: ThemeMode): string[] {
  return [...(mode === "dark" ? CATEGORICAL_DARK : CATEGORICAL_LIGHT)];
}

/** Ink & chrome cho trục, lưới, tooltip — luôn lùi lại phía sau dữ liệu */
export const chartChrome = {
  light: {
    surface: "#ffffff",
    textPrimary: "#333333",
    textMuted: "#898781",
    grid: "#e8e8e4",
    axis: "#c3c2b7",
  },
  dark: {
    surface: "#1d2636",
    textPrimary: "#bac5cc",
    textMuted: "#92abcf",
    grid: "#2f3d52",
    axis: "#506988",
  },
} as const;

export function chromeFor(mode: ThemeMode) {
  return chartChrome[mode];
}

/**
 * Màu gắn cố định cho từng trạng thái đơn hàng — màu đi theo thực thể, không
 * theo thứ hạng, nên lọc bớt trạng thái cũng không làm đổi màu các phần còn lại.
 * Đây là màu categorical (định danh), không dùng lẫn với status palette.
 */
export const ORDER_STATUS_COLOR_INDEX = {
  pending: 3, // vàng
  confirmed: 0, // brand blue
  processing: 6, // violet
  shipping: 1, // cam
  completed: 2, // aqua
  cancelled: 7, // đỏ
  refunded: 4, // magenta
} as const;

export function orderStatusColors(mode: ThemeMode) {
  const palette = categoricalPalette(mode);
  return Object.fromEntries(
    Object.entries(ORDER_STATUS_COLOR_INDEX).map(([status, index]) => [
      status,
      palette[index],
    ]),
  ) as Record<keyof typeof ORDER_STATUS_COLOR_INDEX, string>;
}
