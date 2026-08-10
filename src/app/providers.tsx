"use client";

import { useEffect } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import "@ant-design/v5-patch-for-react-19";

import { getAntdTheme } from "@/lib/antd-theme";
import { useThemeStore } from "@/store/useThemeStore";

// Warning cleanup-after-unmount của @ant-design/cssinjs — antd v5 chưa native
// React 19, chỉ là console noise (issue antd đã đóng "invalid", xem
// https://github.com/ant-design/ant-design/issues/55037). Lọc đúng câu này,
// không đụng các console.error khác. Guard `window` vì providers.tsx chạy cả
// ở server lúc SSR — override console.error ở Node sẽ rò rỉ sang mọi request
// khác trong cùng process, không chỉ ảnh hưởng trình duyệt.
if (
  typeof window !== "undefined" &&
  !(window as { __antdCleanupWarningPatched?: boolean }).__antdCleanupWarningPatched
) {
  (window as { __antdCleanupWarningPatched?: boolean }).__antdCleanupWarningPatched = true;
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("You are registering a cleanup function after unmount")
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

dayjs.locale("vi");

/**
 * Chạy trước khi paint để set data-theme từ localStorage, tránh nháy sai theme
 * khi zustand/persist chưa hydrate xong.
 */
export const themeNoFlashScript = `
(function () {
  try {
    var raw = localStorage.getItem('d-computer-theme');
    var mode = raw ? JSON.parse(raw).state.mode : 'light';
    document.documentElement.dataset.theme = mode === 'dark' ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export function Providers({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  return (
    <AntdRegistry>
      <ConfigProvider theme={getAntdTheme(mode)} locale={viVN}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
