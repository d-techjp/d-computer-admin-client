import { theme as antdTheme, type ThemeConfig } from "antd";

import type { ThemeMode } from "@/store/useThemeStore";

export const FONT_FAMILY =
  "'Exo 2', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** Giá trị lấy từ app/config/style/color.js của bản gốc */
export const brandColors = {
  primary: "#397dbb",
  primaryHover: "#00a8b8",
  danger: "#ff4d4f",
  warning: "#d3b865",
  success: "#90bb3b",
  info: "#40a9ff",
} as const;

const sharedToken: ThemeConfig["token"] = {
  colorPrimary: brandColors.primary,
  colorLink: brandColors.primary,
  colorError: brandColors.danger,
  colorWarning: brandColors.warning,
  colorSuccess: brandColors.success,
  colorInfo: brandColors.info,
  fontFamily: FONT_FAMILY,
  borderRadius: 4,
  controlHeight: 32,
};

const lightTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...sharedToken,
    colorText: "#333333",
    colorTextSecondary: "#666666",
    colorTextTertiary: "#b5b5b5",
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f3f4f6",
    colorBorderSecondary: "#f0f0f0",
    colorBorder: "#d9d9d9",
  },
  components: {
    Table: {
      // Bản gốc: header bảng nền #1c90ff chữ trắng
      headerBg: "#1c90ff",
      headerColor: "#ffffff",
      headerSortActiveBg: "#1780e6",
      headerSortHoverBg: "#1780e6",
      borderColor: "#f0f0f0",
      rowHoverBg: "#f5f5f5",
    },
    Menu: {
      itemSelectedBg: "#dae7ff",
      itemSelectedColor: brandColors.primary,
      itemHoverBg: "#f0f5ff",
    },
    Layout: {
      siderBg: "#ffffff",
      headerBg: "#ffffff",
      bodyBg: "#f3f4f6",
    },
  },
};

const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...sharedToken,
    // Dark mode bản gốc dùng cyan sáng cho nút primary
    colorPrimary: "#11ece5",
    colorLink: "#11ece5",
    colorText: "#bac5cc",
    colorTextSecondary: "#92abcf",
    colorTextTertiary: "#92abcf",
    colorBgContainer: "#24364e",
    colorBgElevated: "#24364e",
    colorBgLayout: "#0f1724",
    colorBorderSecondary: "#506988",
    colorBorder: "#32425d",
  },
  components: {
    Table: {
      headerBg: "#24364e",
      headerColor: "#c6d3e7",
      borderColor: "#506988",
      rowHoverBg: "#212d3d",
      colorBgContainer: "#24364e",
    },
    Menu: {
      darkItemBg: "#212c3d",
      darkSubMenuItemBg: "#212c3d",
      darkItemSelectedBg: "rgba(255, 255, 255, 0.1)",
      darkItemSelectedColor: "#ffffff",
    },
    Layout: {
      siderBg: "#212c3d",
      headerBg: "#212c3d",
      bodyBg: "#0f1724",
    },
  },
};

export function getAntdTheme(mode: ThemeMode): ThemeConfig {
  return mode === "dark" ? darkTheme : lightTheme;
}
