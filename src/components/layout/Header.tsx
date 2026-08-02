"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Breadcrumb, Button, Tooltip } from "antd";
import { Bell, Menu as MenuIcon, Moon, PanelLeft, Sun } from "lucide-react";

import { findActiveMenu } from "@/config/menuConfig";
import routes from "@/config/routes";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useThemeStore } from "@/store/useThemeStore";

function useBreadcrumbItems() {
  const pathname = usePathname();
  const active = findActiveMenu(pathname);

  const items: { title: React.ReactNode }[] = [
    { title: <Link href={routes.dashboard}>Trang chủ</Link> },
  ];

  if (active?.parentLabel) items.push({ title: active.parentLabel });
  if (active) {
    items.push({
      title:
        pathname === active.path ? (
          active.label
        ) : (
          <Link href={active.path}>{active.label}</Link>
        ),
    });
  }

  // Route con (tạo mới / chi tiết) không nằm trong menu nên gắn thêm thủ công
  if (active && pathname !== active.path) {
    const last = pathname.slice(active.path.length + 1);
    items.push({ title: last === "new" ? "Tạo mới" : "Chi tiết" });
  }

  return items;
}

export function Header() {
  const toggleCollapsed = useLayoutStore((state) => state.toggleCollapsed);
  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const breadcrumbItems = useBreadcrumbItems();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-header border-b border-line px-4 shadow-card">
      <Button
        type="text"
        aria-label="Thu gọn menu"
        className="hidden md:inline-flex"
        icon={<PanelLeft size={18} />}
        onClick={toggleCollapsed}
      />
      <Button
        type="text"
        aria-label="Mở menu"
        className="md:hidden"
        icon={<MenuIcon size={18} />}
      />

      <Breadcrumb items={breadcrumbItems} className="hidden sm:block" />

      {/* <div className="ml-auto flex items-center gap-1">
        <Tooltip title={mode === "light" ? "Chuyển nền tối" : "Chuyển nền sáng"}>
          <Button
            type="text"
            aria-label="Đổi giao diện sáng/tối"
            icon={mode === "light" ? <Moon size={18} /> : <Sun size={18} />}
            onClick={toggleMode}
          />
        </Tooltip>
        <Badge count={3} size="small">
          <Button type="text" aria-label="Thông báo" icon={<Bell size={18} />} />
        </Badge>
      </div> */}
    </header>
  );
}

export default Header;
