"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Avatar, Dropdown, type MenuProps } from "antd";
import { LogOut, UserRound } from "lucide-react";

import routes from "@/config/routes";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { AUTH_ROLE_LABEL } from "@/types/auth";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

interface UserPanelProps {
  collapsed?: boolean;
}

/** Khối user ghim đáy sidebar — giữ đúng bố cục avatar + dropdown của bản gốc. */
export function UserPanel({ collapsed = false }: UserPanelProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [signingOut, setSigningOut] = useState(false);

  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const signOut = useAuthStore((state) => state.signOut);

  const displayName = user?.fullName || user?.username || "Chưa đăng nhập";
  const roleLabel = role ? AUTH_ROLE_LABEL[role] : "—";

  /** POST /api/v1/auth/logout rồi xoá session và về trang đăng nhập */
  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      message.success("Đã đăng xuất");
      router.replace(routes.auth.login);
    } finally {
      setSigningOut(false);
    }
  }

  const menuItems: MenuProps["items"] = [
    {
      key: "account",
      icon: <UserRound size={16} />,
      label: (
        <span className="block">
          <span className="block text-sm font-medium">{displayName}</span>
          <span className="text-muted block text-xs">
            {user?.email || user?.username}
          </span>
        </span>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogOut size={16} />,
      label: signingOut ? "Đang đăng xuất..." : "Đăng xuất",
      danger: true,
      disabled: signingOut,
    },
  ];

  return (
    <Dropdown
      menu={{
        items: menuItems,
        onClick: ({ key }) => {
          if (key === "logout") void handleSignOut();
        },
      }}
      trigger={["click"]}
      placement="topRight"
    >
      <button
        type="button"
        className={cn(
          "hover:bg-row-hover flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
          collapsed && "justify-center px-0",
        )}
      >
        <Avatar size={collapsed ? 32 : 36} className="shrink-0 font-semibold">
          {initialsOf(displayName) || "?"}
        </Avatar>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="text-fg block truncate text-sm font-semibold">
              {displayName}
            </span>
            <span className="text-muted block truncate text-xs">{roleLabel}</span>
          </span>
        )}
      </button>
    </Dropdown>
  );
}

export default UserPanel;
