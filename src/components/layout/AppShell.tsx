"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { MOBILE_BREAKPOINT, useLayoutStore } from "@/store/useLayoutStore";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useLayoutStore((state) => state.collapsed);
  const setMobileOpen = useLayoutStore((state) => state.setMobileOpen);

  // Đóng drawer khi phóng to lên desktop để không kẹt overlay
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [setMobileOpen]);

  return (
    <div className="bg-page min-h-screen">
      <Sidebar />
      {/* Chừa chỗ cho sidebar cố định: 250px khi mở, 64px khi thu gọn */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "md:ps-16" : "md:ps-[250px]",
        )}
      >
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
