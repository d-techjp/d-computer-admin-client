"use client";

import { Avatar, Dropdown, type MenuProps } from "antd";
import { LogOut, Settings, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const CURRENT_USER = {
  name: "Trần Hữu Phước",
  email: "admin@d-computer.vn",
  role: "Quản trị viên",
};

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

const menuItems: MenuProps["items"] = [
  { key: "profile", icon: <UserRound size={16} />, label: "Thông tin cá nhân" },
  { key: "settings", icon: <Settings size={16} />, label: "Cài đặt" },
  { type: "divider" },
  { key: "logout", icon: <LogOut size={16} />, label: "Đăng xuất", danger: true },
];

interface UserPanelProps {
  collapsed?: boolean;
}

/** Khối user ghim đáy sidebar — giữ đúng bố cục avatar + dropdown của bản gốc. */
export function UserPanel({ collapsed = false }: UserPanelProps) {
  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="topRight">
      <button
        type="button"
        className={cn(
          "hover:bg-row-hover flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
          collapsed && "justify-center px-0",
        )}
      >
        <Avatar size={collapsed ? 32 : 36} className="shrink-0 font-semibold">
          {initialsOf(CURRENT_USER.name)}
        </Avatar>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="text-fg block truncate text-sm font-semibold">
              {CURRENT_USER.name}
            </span>
            <span className="text-muted block truncate text-xs">
              {CURRENT_USER.role}
            </span>
          </span>
        )}
      </button>
    </Dropdown>
  );
}

export default UserPanel;
