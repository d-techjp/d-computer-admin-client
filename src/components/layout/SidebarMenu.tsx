"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "antd";
import type { MenuProps } from "antd";

import {
  findActiveMenu,
  menuConfig,
  type MenuItemConfig,
} from "@/config/menuConfig";

type AntdMenuItem = Required<MenuProps>["items"][number];

function renderIcon(item: MenuItemConfig, size: number) {
  const Icon = item.icon;
  return Icon ? <Icon size={size} strokeWidth={1.75} /> : undefined;
}

/**
 * Chuyển dữ liệu menuConfig sang định dạng items của antd Menu — tương ứng
 * hàm buildMenuItems() trong SideNavigation của bản gốc. Chỗ này về sau là
 * nơi lọc theo `roles` khi có RBAC.
 */
function buildMenuItems(items: MenuItemConfig[]): AntdMenuItem[] {
  return items.map((item) => {
    if (item.children?.length) {
      return {
        key: item.key,
        icon: renderIcon(item, 18),
        label: item.label,
        children: buildMenuItems(item.children),
      };
    }

    return {
      key: item.key,
      icon: renderIcon(item, 18),
      label: <Link href={item.path ?? "#"}>{item.label}</Link>,
    };
  });
}

interface SidebarMenuProps {
  /** Menu thu gọn thì antd tự ẩn label và chuyển submenu sang popup */
  collapsed?: boolean;
  onNavigate?: () => void;
  theme?: "light" | "dark";
}

export function SidebarMenu({
  collapsed = false,
  onNavigate,
  theme = "light",
}: SidebarMenuProps) {
  const pathname = usePathname();
  const items = useMemo(() => buildMenuItems(menuConfig), []);

  const active = findActiveMenu(pathname);
  const selectedKeys = active ? [active.key] : [];
  const activeParent = active?.parentKey;

  /**
   * Mặc định mở đúng submenu chứa route hiện tại. Nếu người dùng tự đóng/mở
   * nhánh nào thì ghi nhớ lựa chọn đó kèm nhánh đang active — khi điều hướng
   * sang mục khác, lựa chọn cũ hết hiệu lực và menu lại tự mở theo route.
   */
  const [override, setOverride] = useState<{
    parent?: string;
    keys: string[];
  } | null>(null);

  const openKeys =
    override && override.parent === activeParent
      ? override.keys
      : activeParent
        ? [activeParent]
        : [];

  return (
    <Menu
      mode="inline"
      theme={theme}
      inlineCollapsed={collapsed}
      items={items}
      selectedKeys={selectedKeys}
      // Khi thu gọn, antd chuyển submenu sang popup nên bỏ qua openKeys
      openKeys={collapsed ? [] : openKeys}
      onOpenChange={(keys) =>
        setOverride({ parent: activeParent, keys: keys as string[] })
      }
      onClick={onNavigate}
      className="border-e-0! bg-transparent!"
    />
  );
}

export default SidebarMenu;
